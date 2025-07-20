"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { Region } from "@/components/region-switcher";
import { DataBanner } from "@/components/data-banner";
import { DataFetcher } from "@/components/data-fetcher";
import { DataContent } from "@/components/data-content";
import { UserHeader } from "@/components/user-header";
import { SettingsDialog } from "@/components/settings-dialog";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useFetchSession } from "@/hooks/useFetchSession";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const [selectedRegion, setSelectedRegion] = useState<Region>("intl");
  const [isDataFetcherOpen, setIsDataFetcherOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    snapshots,
    selectedSnapshot,
    setSelectedSnapshot,
    isLoading: isLoadingSnapshots,
    resetSnapshots,
    refreshSnapshots,
  } = useSnapshots(selectedRegion, true);

  const {
    isFetching,
    startDataFetch,
    startAutomaticFetch,
    resetFetchSession,
  } = useFetchSession(refreshSnapshots);

  // Check if user has a saved token for the current region
  const { data: tokenData, isLoading: isLoadingToken } = trpc.user.hasToken.useQuery(
    { region: selectedRegion },
    { refetchOnWindowFocus: false }
  );

  // Get user timezone
  const { data: timezoneData, refetch: refetchTimezone } = trpc.user.getTimezone.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );

  // Update timezone mutation
  const updateTimezoneMutation = trpc.user.updateTimezone.useMutation({
    onSuccess: () => {
      toast.success("Timezone updated successfully!");
      refetchTimezone();
    },
    onError: (error) => {
      toast.error(`Failed to update timezone: ${error.message}`);
    },
  });

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleRegionChange = (region: Region) => {
    setSelectedRegion(region);
    setSelectedSnapshot(null);
    resetSnapshots();
    resetFetchSession();
  };

  const handleFetchData = async () => {
    // Only attempt auto-fetch if we're sure the user has a saved token
    if (!isLoadingToken && tokenData?.hasToken === true) {
      // Start automatic fetch with saved token
      try {
        await startAutomaticFetch(selectedRegion);
      } catch (error) {
        console.error("Auto fetch failed:", error);
        
        // Show toast error and open token dialog for rate limiting or other errors
        if (error instanceof Error) {
          toast.error(error.message);
          
          // If it's not a rate limit error, open the token dialog
          if (!error.message.includes("Rate limited")) {
            setIsDataFetcherOpen(true);
          }
        } else {
          toast.error("Failed to start data fetch");
          setIsDataFetcherOpen(true);
        }
      }
    } else {
      // Show token input dialog (either no token, or still loading token state)
      setIsDataFetcherOpen(true);
    }
  };

  const closeFetcher = () => {
    setIsDataFetcherOpen(false);
  };

  const handleTokenUpdate = async (token: string) => {
    try {
      // Just start the fetch with the new token (this will save and use it)
      await startDataFetch(selectedRegion, token);
      toast.success("Token saved successfully!");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to save token");
      }
      // Re-throw the error so DataFetcher doesn't close on failure
      throw error;
    }
  };

  const handleSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleTimezoneUpdate = async (timezone: string | null) => {
    await updateTimezoneMutation.mutateAsync({ timezone });
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <UserHeader 
        user={user} 
        selectedRegion={selectedRegion}
        onRegionChange={handleRegionChange}
        onLogout={handleLogout}
        onSettings={handleSettings}
      />

      <div className="space-y-6">
        <DataBanner
          region={selectedRegion}
          snapshots={snapshots}
          selectedSnapshot={selectedSnapshot}
          onSnapshotChange={setSelectedSnapshot}
          onFetchData={handleFetchData}
          isFetching={isFetching}
          userTimezone={timezoneData?.timezone ?? null}
        />

        <DataContent
          region={selectedRegion}
          selectedSnapshot={selectedSnapshot}
          isLoading={isLoadingSnapshots}
        />
      </div>

      <DataFetcher
        region={selectedRegion}
        isOpen={isDataFetcherOpen}
        onClose={closeFetcher}
        onTokenUpdate={handleTokenUpdate}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTimezone={timezoneData?.timezone ?? null}
        onTimezoneUpdate={handleTimezoneUpdate}
      />
    </div>
  );
} 