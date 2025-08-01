import { db } from "@/lib/db";
import { songs, user, userScores, userSnapshots } from "@/lib/schema";
import { SnapshotWithSongs } from "@/lib/types";
import { eq } from "drizzle-orm";
import RenderImageClient from "./render-client";
import { getRatingImageUrl, ImageCache } from "@/lib/render-image";
import { fetchImageForServer } from "@/lib/render-image-server";
import { splitSongs } from "@/lib/rating-calculator";

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

    // Get user privacy settings
    const publishProfile = await db.select({ username: user.username, publishProfile: user.publishProfile }).from(user).where(eq(user.id, snapshot[0].userId)).limit(1);

    if (publishProfile.length === 0) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          ❌ User not found
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

    const { newSongsB15, oldSongsB35 } = splitSongs(songsWithScores, data.snapshot.gameVersion);

    const toCache = [
      "https://maimaidx.jp/maimai-mobile/img/music_dx.png",
      "https://maimaidx.jp/maimai-mobile/img/music_standard.png",
      `/res/shine/${data.snapshot.gameVersion}.png`,
      `/res/down/${data.snapshot.gameVersion}.png`,
      `/res/character/${data.snapshot.gameVersion}.png`,
      `/res/logo/${data.snapshot.gameVersion}.png`,
      `/res/trophy/normal.png`,
      `/res/label/new.png`,
      `/res/label/old.png`,
      data.snapshot.classRankUrl,
      data.snapshot.courseRankUrl,
      data.snapshot.iconUrl,
      ...newSongsB15.map(song => song.cover),
      ...oldSongsB35.map(song => song.cover),
      getRatingImageUrl(data.snapshot.rating),
    ]
    const cache: ImageCache = {};
    const promises = [];

    for (const url of toCache) {
      if (url.startsWith('data:')) continue;
      promises.push(fetchImageForServer(url).then(img => {
        cache[url] = img;
      }));
    }

    // do in batches of 16
    for (let i = 0; i < promises.length; i += 64) {
      await Promise.allSettled(promises.slice(i, i + 64));
    }

    console.log("✅ Cache:", Object.keys(cache).length);

    return <RenderImageClient data={data} cache={cache} visitableProfileAt={publishProfile[0].publishProfile ? publishProfile[0].username : null} />;
  } catch (error) {
    console.error('Error fetching snapshot data:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        ❌ Error loading snapshot data
      </div>
    );
  }
} 