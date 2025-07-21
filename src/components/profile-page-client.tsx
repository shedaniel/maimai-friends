"use client";

import { DataContent } from "@/components/data-content";
import { PublicDataBanner } from "@/components/public-data-banner";
import { PublicHeader } from "@/components/public-header";
import { Difficulty, Region, SnapshotWithSongs, SongWithScore } from "@/lib/types";
import { useRouter } from "next/navigation";

interface ProfileData {
  id: string;
  name: string;
  timezone: string | null;
  publishProfile: boolean;
  profileMainRegion: Region;
  profileShowAllScores: boolean;
  profileShowScoreDetails: boolean;
  profileShowPlates: boolean;
  profileShowPlayCounts: boolean;
  profileShowEvents: boolean;
  profileShowInSearch: boolean;
}

interface SnapshotData {
  snapshot: {
    id: string;
    fetchedAt: Date;
    rating: number;
    displayName: string;
    gameVersion: number;
    courseRankUrl: string;
    classRankUrl: string;
    stars: number;
    versionPlayCount: number;
    totalPlayCount: number;
    iconUrl: string;
    title: string;
  };
  songs: Array<{
    songId: string;
    songName: string;
    artist: string;
    cover: string;
    difficulty: string;
    level: string;
    levelPrecise: number;
    type: string;
    genre: string;
    addedVersion: number;
    achievement: number;
    dxScore: number;
    fc: string;
    fs: string;
  }>;
  privacySettings: {
    showPlayCounts: boolean;
    showPlates: boolean;
    showEvents: boolean;
  };
}

interface ProfilePageClientProps {
  profileData: ProfileData;
  snapshotData: SnapshotData;
  region: Region;
  username: string;
  initialTab?: string;
}

export function ProfilePageClient({
  profileData,
  snapshotData,
  region,
  username,
  initialTab,
}: ProfilePageClientProps) {
  const router = useRouter();

  const handleRegionChange = (newRegion: Region) => {
    if (newRegion !== region) {
      // Navigate to the new region
      router.push(`/profile/${username}/${newRegion}`);
    }
  };

  // Convert the snapshot data to the format expected by DataContent
  const snapshotWithSongs: SnapshotWithSongs = {
    snapshot: snapshotData.snapshot,
    songs: snapshotData.songs.map(song => ({
      ...song,
      difficulty: song.difficulty as Difficulty,
      type: song.type as "std" | "dx",
      fc: song.fc as "none" | "fc" | "fc+" | "ap" | "ap+",
      fs: song.fs as "none" | "sync" | "fs" | "fs+" | "fdx" | "fdx+",
    })) as SongWithScore[],
  };

  return (
    <div className="container mx-auto max-w-[1300px] px-4 py-8">
      <PublicHeader
        profileUsername={username}
      />

      <div className="space-y-6">
        <PublicDataBanner
          region={region}
          snapshotData={{
            fetchedAt: snapshotData.snapshot.fetchedAt,
            displayName: snapshotData.snapshot.displayName,
            rating: snapshotData.snapshot.rating,
            gameVersion: snapshotData.snapshot.gameVersion,
          }}
          userTimezone={profileData.timezone}
          profileUsername={username}
          onRegionChange={handleRegionChange}
        />

        <DataContent
          region={region}
          selectedSnapshotData={snapshotWithSongs}
          isLoading={false}
          privacySettings={snapshotData.privacySettings}
          initialTab={initialTab}
        />
      </div>
    </div>
  );
} 