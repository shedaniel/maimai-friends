import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import { Region, Snapshot } from "@/lib/types";
import { VersionInfo } from "@/lib/metadata";

export function useSnapshots(region: Region, isAuthenticated: boolean) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const previousLengthRef = useRef<number>(0);

  // Use tRPC query to fetch snapshots metadata only
  const {
    data: snapshotsData,
    isLoading: isLoadingSnapshots,
    refetch: refreshSnapshots,
  } = trpc.user.getSnapshots.useQuery(
    { region },
    {
      enabled: isAuthenticated, // Only run query if authenticated
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch complete snapshot data only when a snapshot is selected
  const {
    data: selectedSnapshotData,
    isLoading: isLoadingSnapshotData,
    refetch: refreshSnapshotData,
  } = trpc.user.getSnapshotData.useQuery(
    { 
      snapshotId: selectedSnapshot!, 
      region 
    },
    {
      enabled: isAuthenticated && !!selectedSnapshot,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 minutes - snapshot data changes less frequently
    }
  );

  // Get available versions for copying when a snapshot is selected
  const currentGameVersion = selectedSnapshotData?.snapshot?.gameVersion;
  const {
    data: availableVersionsData,
    isLoading: isLoadingVersions,
  } = trpc.user.getAvailableVersionsForCopy.useQuery(
    {
      region,
      currentVersion: currentGameVersion!,
    },
    {
      enabled: isAuthenticated && !!currentGameVersion,
      refetchOnWindowFocus: false,
      staleTime: 30 * 60 * 1000, // 30 minutes - versions don't change often
    }
  );

  const snapshots: Snapshot[] = snapshotsData?.snapshots || [];
  const availableVersions: VersionInfo[] = availableVersionsData?.availableVersions || [];
  const isLoading = isLoadingSnapshots || (!!selectedSnapshot && isLoadingSnapshotData);

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

  // Delete snapshot mutation
  const deleteSnapshotMutation = trpc.user.deleteSnapshot.useMutation({
    onSuccess: () => {
      // Refresh snapshots list after deletion
      refreshSnapshots();
    },
    onError: (error) => {
      console.error("Failed to delete snapshot:", error);
      throw error; // Let the caller handle the error
    },
  });

  // Copy snapshot mutation
  const copySnapshotMutation = trpc.user.copySnapshotToVersion.useMutation({
    onSuccess: () => {
      // Refresh snapshots list after copying
      refreshSnapshots();
    },
    onError: (error) => {
      console.error("Failed to copy snapshot:", error);
      throw error; // Let the caller handle the error
    },
  });

  const refreshSnapshotsCallback = () => {
    refreshSnapshots();
    if (selectedSnapshot) {
      refreshSnapshotData();
    }
  };

  const handleSnapshotSelect = (snapshotId: string | null) => {
    setSelectedSnapshot(snapshotId);
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    // If we're deleting the currently selected snapshot, clear the selection
    if (selectedSnapshot === snapshotId) {
      setSelectedSnapshot(null);
    }
    
    // Delete the snapshot
    await deleteSnapshotMutation.mutateAsync({
      snapshotId,
      region,
    });
  };

  const handleCopySnapshot = async (snapshotId: string, targetVersion: number) => {
    // Copy the snapshot to another version
    const result = await copySnapshotMutation.mutateAsync({
      snapshotId,
      region,
      targetVersion,
    });
    
    return result;
  };

  return {
    snapshots,
    selectedSnapshot,
    selectedSnapshotData: selectedSnapshotData || undefined,
    availableVersions,
    isLoadingVersions,
    setSelectedSnapshot: handleSnapshotSelect,
    deleteSnapshot: handleDeleteSnapshot,
    copySnapshot: handleCopySnapshot,
    isCopying: copySnapshotMutation.isPending,
    isLoading,
    resetSnapshots,
    refreshSnapshots: refreshSnapshotsCallback,
  };
} 