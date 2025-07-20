import { useState, useEffect, useRef } from "react";
import { Region } from "@/components/region-switcher";
import { trpc } from "@/lib/trpc-client";

export interface Snapshot {
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
}

export function useSnapshots(region: Region, isAuthenticated: boolean) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const previousLengthRef = useRef<number>(0);

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

  // Auto-select the latest snapshot when new data is fetched (length changes)
  useEffect(() => {
    const currentLength = snapshots.length;
    const previousLength = previousLengthRef.current;
    
    // If length changed and we have snapshots, select the latest one
    if (currentLength !== previousLength && currentLength > 0) {
      setSelectedSnapshot(snapshots[0].id);
    }
    
    // Update the ref with current length
    previousLengthRef.current = currentLength;
  }, [snapshots]);

  const resetSnapshots = () => {
    setSelectedSnapshot(null);
    previousLengthRef.current = 0; // Reset the length tracking
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