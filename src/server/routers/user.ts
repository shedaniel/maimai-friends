import { db } from '@/lib/db';
import { fetchMaimaiData } from '@/lib/maimai-fetcher';
import { getCurrentVersion } from '@/lib/metadata';
import { addRatingsAndSort } from '@/lib/rating-calculator';
import { fetchSessions, songs, user, userScores, userSnapshots, userTokens } from '@/lib/schema';
import { protectedProcedure, publicProcedure, router } from '@/lib/trpc';
import { SongWithScore } from '@/lib/types';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

const regionSchema = z.enum(['intl', 'jp']);

export const userRouter = router({
  // Get user snapshots by region
  getSnapshots: protectedProcedure
    .input(z.object({ region: regionSchema }))
    .query(async ({ ctx, input }) => {
      const snapshots = await db
        .select({
          id: userSnapshots.id,
          fetchedAt: userSnapshots.fetchedAt,
          rating: userSnapshots.rating,
          displayName: userSnapshots.displayName,
          gameVersion: userSnapshots.gameVersion,
          courseRankUrl: userSnapshots.courseRankUrl,
          classRankUrl: userSnapshots.classRankUrl,
          stars: userSnapshots.stars,
          versionPlayCount: userSnapshots.versionPlayCount,
          totalPlayCount: userSnapshots.totalPlayCount,
        })
        .from(userSnapshots)
        .where(
          and(
            eq(userSnapshots.userId, ctx.session.user.id),
            eq(userSnapshots.region, input.region)
          )
        )
        .orderBy(desc(userSnapshots.fetchedAt));

      return { snapshots };
    }),

  // Get complete snapshot data including songs for a specific snapshot
  getSnapshotData: protectedProcedure
    .input(z.object({
      snapshotId: z.string(),
      region: regionSchema
    }))
    .query(async ({ ctx, input }) => {
      // First verify the snapshot belongs to the user
      const snapshot = await db
        .select()
        .from(userSnapshots)
        .where(
          and(
            eq(userSnapshots.id, input.snapshotId),
            eq(userSnapshots.userId, ctx.session.user.id),
            eq(userSnapshots.region, input.region)
          )
        )
        .limit(1);

      if (snapshot.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Snapshot not found or access denied',
        });
      }

      // Get songs with scores for this snapshot
      const songsWithScores = await db
        .select({
          songId: songs.id,
          songName: songs.songName,
          artist: songs.artist,
          cover: songs.cover,
          difficulty: songs.difficulty,
          level: songs.level,
          levelPrecise: songs.levelPrecise,
          type: songs.type,
          genre: songs.genre,
          addedVersion: songs.addedVersion,
          achievement: userScores.achievement,
          dxScore: userScores.dxScore,
          fc: userScores.fc,
          fs: userScores.fs,
        })
        .from(userScores)
        .innerJoin(songs, eq(userScores.songId, songs.id))
        .where(eq(userScores.snapshotId, input.snapshotId))
        .orderBy(songs.songName, songs.difficulty);

      return {
        snapshot: snapshot[0],
        songs: songsWithScores,
      };
    }),

  // Check if user has a saved token for a region
  hasToken: protectedProcedure
    .input(z.object({ region: regionSchema }))
    .query(async ({ ctx, input }) => {
      const existingToken = await db
        .select({ id: userTokens.id })
        .from(userTokens)
        .where(
          and(
            eq(userTokens.userId, ctx.session.user.id),
            eq(userTokens.region, input.region)
          )
        )
        .limit(1);

      return { hasToken: existingToken.length > 0 };
    }),

  // Start a new data fetch
  startFetch: protectedProcedure
    .input(z.object({
      region: regionSchema,
      token: z.string().optional(), // Token is now optional - we'll use saved token if not provided
    }))
    .mutation(async ({ ctx, input }) => {
      let tokenToUse = input.token;

      // If no token provided, try to use saved token
      if (!tokenToUse) {
        const savedToken = await db
          .select({ token: userTokens.token })
          .from(userTokens)
          .where(
            and(
              eq(userTokens.userId, ctx.session.user.id),
              eq(userTokens.region, input.region)
            )
          )
          .limit(1);

        if (savedToken.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No token provided and no saved token found',
          });
        }

        tokenToUse = savedToken[0].token;
      }

      // Check for existing pending fetch
      const existingFetch = await db
        .select()
        .from(fetchSessions)
        .where(
          and(
            eq(fetchSessions.userId, ctx.session.user.id),
            eq(fetchSessions.region, input.region),
            eq(fetchSessions.status, "pending")
          )
        )
        .limit(1);

      if (existingFetch.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A fetch is already in progress for this region',
        });
      }

      // Check rate limit (5 requests per 5 minutes)
      const recentFetches = await db
        .select()
        .from(fetchSessions)
        .where(
          and(
            eq(fetchSessions.userId, ctx.session.user.id),
            eq(fetchSessions.region, input.region)
          )
        )
        .orderBy(desc(fetchSessions.startedAt))
        .limit(5);

      if (recentFetches.length >= 5) {
        // Check if the 5th most recent fetch is within the last 5 minutes
        const fifthMostRecentFetch = recentFetches[4]; // 0-indexed, so 4th index is 5th item
        const timeSinceOldestInWindow = Date.now() - fifthMostRecentFetch.startedAt.getTime();
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

        if (timeSinceOldestInWindow < fiveMinutes) {
          const remainingTime = Math.ceil((fiveMinutes - timeSinceOldestInWindow) / 1000);
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `Rate limited. You can make 5 requests per 5 minutes. Try again in ${remainingTime} seconds.`,
          });
        }
      }

      // Store/update token if a new one was provided
      if (input.token) {
        try {
          await db
            .insert(userTokens)
            .values({
              id: randomUUID(),
              userId: ctx.session.user.id,
              region: input.region,
              token: tokenToUse, // TODO: Encrypt this in production
              createdAt: new Date(),
              updatedAt: new Date(),
            });
        } catch {
          // If insert fails due to constraint, update the existing record
          await db
            .update(userTokens)
            .set({
              token: tokenToUse,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(userTokens.userId, ctx.session.user.id),
                eq(userTokens.region, input.region)
              )
            );
        }
      }

      // Create fetch session
      const fetchSessionId = randomUUID();
      await db.insert(fetchSessions).values({
        id: fetchSessionId,
        userId: ctx.session.user.id,
        region: input.region,
        status: "pending",
        startedAt: new Date(),
      });

      // Start the actual data fetch in the background
      (async () => {
        try {
          await fetchMaimaiData(ctx.session.user.id, input.region, fetchSessionId);

          // Mark fetch as completed
          await db
            .update(fetchSessions)
            .set({
              status: "completed",
              completedAt: new Date(),
            })
            .where(eq(fetchSessions.id, fetchSessionId));
        } catch (error) {
          console.error("Error during maimai data fetch:", error);

          // Mark fetch as failed
          await db
            .update(fetchSessions)
            .set({
              status: "failed",
              completedAt: new Date(),
              errorMessage: error instanceof Error ? error.message : "Unknown error occurred",
            })
            .where(eq(fetchSessions.id, fetchSessionId));
        }
      })();

      return {
        sessionId: fetchSessionId,
        status: "pending" as const,
      };
    }),

  // Get latest fetch session status
  getFetchStatus: protectedProcedure
    .input(z.object({
      region: regionSchema,
    }))
    .query(async ({ ctx, input }) => {
      const fetchSession = await db
        .select()
        .from(fetchSessions)
        .where(
          and(
            eq(fetchSessions.userId, ctx.session.user.id),
            eq(fetchSessions.region, input.region)
          )
        )
        .orderBy(desc(fetchSessions.startedAt))
        .limit(1);

      if (fetchSession.length === 0) {
        return null; // No fetch sessions found
      }

      const session = fetchSession[0];
      return {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        errorMessage: session.errorMessage,
      };
    }),

  // Get user timezone
  getTimezone: protectedProcedure
    .query(async ({ ctx }) => {
      const userRecord = await db
        .select({ timezone: user.timezone })
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);

      if (userRecord.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return { timezone: userRecord[0].timezone };
    }),

  // Update user timezone
  updateTimezone: protectedProcedure
    .input(z.object({
      timezone: z.string().nullable(), // null = Asia/Tokyo (JP default)
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(user)
        .set({
          timezone: input.timezone,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id));

      return { success: true };
    }),

  // Get user language preference
  getLanguage: protectedProcedure
    .query(async ({ ctx }) => {
      const result = await db
        .select({ language: user.language })
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);

      return { language: result[0]?.language || null };
    }),

  // Update user language
  updateLanguage: protectedProcedure
    .input(z.object({
      language: z.enum(['en', 'en-GB', 'ja', 'zh-TW', 'zh-CN']).nullable(), // null = auto-detect
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(user)
        .set({
          language: input.language as "en" | "en-GB" | "ja" | "zh-TW" | "zh-CN" | null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id));

      return { success: true };
    }),

  // Get user region
  getRegion: protectedProcedure
    .query(async ({ ctx }) => {
      const userRecord = await db
        .select({ region: user.region })
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);

      if (userRecord.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return { region: userRecord[0].region };
    }),

  // Update user region
  updateRegion: protectedProcedure
    .input(z.object({
      region: z.enum(["intl", "jp"]).nullable(), // null = intl (default)
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(user)
        .set({
          region: input.region,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id));

      return { success: true };
    }),

  // Get profile settings
  getProfileSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const userRecord = await db
        .select({
          publishProfile: user.publishProfile,
          profileMainRegion: user.profileMainRegion,
          profileShowAllScores: user.profileShowAllScores,
          profileShowScoreDetails: user.profileShowScoreDetails,
          profileShowPlates: user.profileShowPlates,
          profileShowPlayCounts: user.profileShowPlayCounts,
          profileShowEvents: user.profileShowEvents,
          profileShowInSearch: user.profileShowInSearch,
        })
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);

      if (userRecord.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return userRecord[0];
    }),

  // Update publish profile setting
  updatePublishProfile: protectedProcedure
    .input(z.object({
      publishProfile: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(user)
        .set({
          publishProfile: input.publishProfile,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id));

      return { success: true };
    }),

  // Update profile main region
  updateProfileMainRegion: protectedProcedure
    .input(z.object({
      profileMainRegion: z.enum(['intl', 'jp']),
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(user)
        .set({
          profileMainRegion: input.profileMainRegion,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id));

      return { success: true };
    }),

  // Update profile privacy settings
  updateProfilePrivacySettings: protectedProcedure
    .input(z.object({
      profileShowAllScores: z.boolean(),
      profileShowScoreDetails: z.boolean(),
      profileShowPlates: z.boolean(),
      profileShowPlayCounts: z.boolean(),
      profileShowEvents: z.boolean(),
      profileShowInSearch: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(user)
        .set({
          profileShowAllScores: input.profileShowAllScores,
          profileShowScoreDetails: input.profileShowScoreDetails,
          profileShowPlates: input.profileShowPlates,
          profileShowPlayCounts: input.profileShowPlayCounts,
          profileShowEvents: input.profileShowEvents,
          profileShowInSearch: input.profileShowInSearch,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id));

      return { success: true };
    }),

  // Get public profile data
  getPublicProfile: publicProcedure
    .input(z.object({
      username: z.string(),
    }))
    .query(async ({ input }) => {
      const userRecord = await db
        .select({
          id: user.id,
          name: user.name,
          timezone: user.timezone,
          publishProfile: user.publishProfile,
          profileMainRegion: user.profileMainRegion,
          profileShowAllScores: user.profileShowAllScores,
          profileShowScoreDetails: user.profileShowScoreDetails,
          profileShowPlates: user.profileShowPlates,
          profileShowPlayCounts: user.profileShowPlayCounts,
          profileShowEvents: user.profileShowEvents,
          profileShowInSearch: user.profileShowInSearch,
        })
        .from(user)
        .where(eq(user.name, input.username))
        .limit(1);

      if (userRecord.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const userData = userRecord[0];

      // Check if profile is published
      if (!userData.publishProfile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not published',
        });
      }

      // Check if user allows being found in search (for direct access check)
      if (!userData.profileShowInSearch) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not accessible',
        });
      }

      return userData;
    }),

  // Get public snapshots for a user
  getPublicSnapshots: publicProcedure
    .input(z.object({
      username: z.string(),
      region: regionSchema,
    }))
    .query(async ({ input }) => {
      // First get the user and verify profile is published
      const userRecord = await db
        .select({
          id: user.id,
          publishProfile: user.publishProfile,
          profileShowInSearch: user.profileShowInSearch,
          profileShowPlayCounts: user.profileShowPlayCounts,
        })
        .from(user)
        .where(eq(user.name, input.username))
        .limit(1);

      if (userRecord.length === 0 || !userRecord[0].publishProfile || !userRecord[0].profileShowInSearch) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found or not accessible',
        });
      }

      const snapshots = await db
        .select({
          id: userSnapshots.id,
          fetchedAt: userSnapshots.fetchedAt,
          rating: userSnapshots.rating,
          displayName: userSnapshots.displayName,
          gameVersion: userSnapshots.gameVersion,
          courseRankUrl: userSnapshots.courseRankUrl,
          classRankUrl: userSnapshots.classRankUrl,
          stars: userSnapshots.stars,
          versionPlayCount: userSnapshots.versionPlayCount,
          totalPlayCount: userSnapshots.totalPlayCount,
        })
        .from(userSnapshots)
        .where(
          and(
            eq(userSnapshots.userId, userRecord[0].id),
            eq(userSnapshots.region, input.region)
          )
        )
        .orderBy(desc(userSnapshots.fetchedAt))
        .limit(1); // Only return the latest snapshot for public profiles

      // Filter play counts based on privacy settings
      const filteredSnapshots = snapshots.map(snapshot => ({
        ...snapshot,
        versionPlayCount: userRecord[0].profileShowPlayCounts ? snapshot.versionPlayCount : 0,
        totalPlayCount: userRecord[0].profileShowPlayCounts ? snapshot.totalPlayCount : 0,
      }));

      return { snapshots: filteredSnapshots };
    }),

  // Get public snapshot data
  getPublicSnapshotData: publicProcedure
    .input(z.object({
      username: z.string(),
      region: regionSchema,
    }))
    .query(async ({ input }) => {
      // First get the user and verify profile is published
      const userRecord = await db
        .select({
          id: user.id,
          publishProfile: user.publishProfile,
          profileShowInSearch: user.profileShowInSearch,
          profileShowAllScores: user.profileShowAllScores,
          profileShowScoreDetails: user.profileShowScoreDetails,
          profileShowPlates: user.profileShowPlates,
          profileShowPlayCounts: user.profileShowPlayCounts,
          profileShowEvents: user.profileShowEvents,
        })
        .from(user)
        .where(eq(user.name, input.username))
        .limit(1);

      if (userRecord.length === 0 || !userRecord[0].publishProfile || !userRecord[0].profileShowInSearch) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found or not accessible',
        });
      }

      const userData = userRecord[0];

      // Get the latest snapshot for this region
      const snapshot = await db
        .select()
        .from(userSnapshots)
        .where(
          and(
            eq(userSnapshots.userId, userData.id),
            eq(userSnapshots.region, input.region)
          )
        )
        .orderBy(desc(userSnapshots.fetchedAt))
        .limit(1);

      if (snapshot.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No data available for this region',
        });
      }

      // Get songs with scores for this snapshot
      const songsWithScores = await db
        .select({
          songId: songs.id,
          songName: songs.songName,
          artist: songs.artist,
          cover: songs.cover,
          difficulty: songs.difficulty,
          level: songs.level,
          levelPrecise: songs.levelPrecise,
          type: songs.type,
          genre: songs.genre,
          addedVersion: songs.addedVersion,
          achievement: userScores.achievement,
          dxScore: userScores.dxScore,
          fc: userScores.fc,
          fs: userScores.fs,
        })
        .from(userScores)
        .innerJoin(songs, eq(userScores.songId, songs.id))
        .where(eq(userScores.snapshotId, snapshot[0].id))
        .orderBy(songs.songName, songs.difficulty);

      // Convert to SongWithScore format
      const songsForCalculation: SongWithScore[] = songsWithScores.map(song => ({
        songId: song.songId,
        songName: song.songName,
        artist: song.artist,
        cover: song.cover,
        difficulty: song.difficulty as any, // Cast to match enum
        level: song.level,
        levelPrecise: song.levelPrecise,
        type: song.type as any, // Cast to match enum
        genre: song.genre,
        addedVersion: song.addedVersion,
        achievement: song.achievement,
        dxScore: song.dxScore,
        fc: song.fc as any, // Cast to match enum
        fs: song.fs as any, // Cast to match enum
      }));

      // Filter songs based on user privacy settings
      let filteredSongs = songsWithScores;

      if (!userData.profileShowAllScores) {
        // Show only top 50 songs (top 15 new + top 35 old) based on rating
        const currentVersion = getCurrentVersion(input.region);

        // Calculate ratings and sort by rating
        const songsWithRating = addRatingsAndSort(songsForCalculation);

        // Separate new and old songs
        const newSongs = songsWithRating.filter(song => song.addedVersion === currentVersion);
        const oldSongs = songsWithRating.filter(song => song.addedVersion !== currentVersion);

        // Take top 15 new and top 35 old
        const top15New = newSongs.slice(0, 15);
        const top35Old = oldSongs.slice(0, 35);

        // Combine and convert back to original format
        const bestSongs = [...top15New, ...top35Old];
        const bestSongIds = new Set(bestSongs.map(song => song.songId));

        filteredSongs = songsWithScores.filter(song => bestSongIds.has(song.songId));
      }

      return {
        snapshot: snapshot[0],
        songs: filteredSongs,
        privacySettings: {
          showPlayCounts: userData.profileShowPlayCounts,
          showPlates: userData.profileShowPlates,
          showEvents: userData.profileShowEvents,
        },
      };
    }),
}); 