import { db } from "@/lib/db";
import { userSnapshots, userScores, songs } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { SnapshotWithSongs } from "@/lib/types";
import RenderImageClient from "./render-client";

interface PageProps {
  searchParams: Promise<{ snapshotId?: string }>;
}

export default async function RenderImagePage({ searchParams }: PageProps) {
  const { snapshotId } = await searchParams;

  if (!snapshotId) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        ❌ No snapshot ID provided
      </div>
    );
  }

  try {
    // Fetch snapshot data from database
    const snapshot = await db
      .select()
      .from(userSnapshots)
      .where(eq(userSnapshots.id, snapshotId))
      .limit(1);

    if (snapshot.length === 0) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          ❌ Snapshot not found
        </div>
      );
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
      .where(eq(userScores.snapshotId, snapshotId))
      .orderBy(songs.songName, songs.difficulty);

    const data: SnapshotWithSongs = {
      snapshot: snapshot[0],
      songs: songsWithScores,
    };

    return <RenderImageClient data={data} />;
  } catch (error) {
    console.error('Error fetching snapshot data:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        ❌ Error loading snapshot data
      </div>
    );
  }
} 