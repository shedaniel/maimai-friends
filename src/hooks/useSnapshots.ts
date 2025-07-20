import { useState } from "react";
import { Region } from "@/components/region-switcher";
import { trpc } from "@/lib/trpc-client";

export interface Snapshot {
  id: string;
  fetchedAt: Date;
  rating: number;
  displayName: string;
  gameVersion: number;
  courseRank: string;
  classRank: string;
  stars: number;
  versionPlayCount: number;
  totalPlayCount: number;
}

export function useSnapshots(region: Region, isAuthenticated: boolean) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  // Use tRPC query to fetch snapshots
  const {
    data: snapshotsData,
    isLoading,
    refetch: refreshSnapshots,
  } = trpc.user.getSnapshots.useQuery(
    { region },
    {
      enabled: isAuthenticated, // Only run query if authenticated
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const snapshots: Snapshot[] = snapshotsData?.snapshots || [];

  // Auto-select the latest snapshot if none selected and we have snapshots
  if (snapshots.length > 0 && !selectedSnapshot) {
    setSelectedSnapshot(snapshots[0].id);
  }

  const resetSnapshots = () => {
    setSelectedSnapshot(null);
  };

  const refreshSnapshotsCallback = () => {
    refreshSnapshots();
  };

  return {
    snapshots,
    selectedSnapshot,
    setSelectedSnapshot,
    isLoading,
    resetSnapshots,
    refreshSnapshots: refreshSnapshotsCallback,
  };
} 