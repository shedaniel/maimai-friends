"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { DataBanner } from "@/components/data-banner";
import { TokenDialog } from "@/components/token-dialog";
import { DataContent } from "@/components/data-content";
import { UserHeader } from "@/components/user-header";
import { SettingsDialog } from "@/components/settings-dialog";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useFetchSession } from "@/hooks/useFetchSession";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { Region, User } from "@/lib/types";

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Get user region preference
  const { data: regionData, refetch: refetchRegion } = trpc.user.getRegion.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );

  // Use the stored region preference, fallback to "intl" if not set
  const selectedRegion: Region = regionData?.region || "intl";

  const {
    snapshots,
    selectedSnapshot,
    selectedSnapshotData,
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

  // Get user language
  const { data: languageData, refetch: refetchLanguage } = trpc.user.getLanguage.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );

  // Update region mutation
  const updateRegionMutation = trpc.user.updateRegion.useMutation({
    onSuccess: () => {
      toast.success("Region updated successfully!");
      refetchRegion();
    },
    onError: (error) => {
      toast.error(`Failed to update region: ${error.message}`);
    },
  });

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

  // Update language mutation
  const updateLanguageMutation = trpc.user.updateLanguage.useMutation({
    onSuccess: () => {
      toast.success("Language updated successfully!");
      refetchLanguage();
    },
    onError: (error) => {
      toast.error(`Failed to update language: ${error.message}`);
    },
  });

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleRegionChange = async (region: Region) => {
    try {
      await updateRegionMutation.mutateAsync({ region });
      // Reset snapshots and fetch session when region changes
      setSelectedSnapshot(null);
      resetSnapshots();
      resetFetchSession();
    } catch (error) {
      console.error("Failed to update region:", error);
    }
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
            setIsTokenDialogOpen(true);
          }
        } else {
          toast.error("Failed to start data fetch");
          setIsTokenDialogOpen(true);
        }
      }
    } else {
      // Show token input dialog (either no token, or still loading token state)
      setIsTokenDialogOpen(true);
    }
  };

  const closeTokenDialog = () => {
    setIsTokenDialogOpen(false);
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
      // Re-throw the error so TokenDialog doesn't close on failure
      throw error;
    }
  };

  const handleSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleOpenTokenDialog = () => {
    setIsSettingsOpen(false); // Close settings dialog
    setIsTokenDialogOpen(true); // Open token dialog
  };

  const handleTimezoneUpdate = async (timezone: string | null) => {
    await updateTimezoneMutation.mutateAsync({ timezone });
  };

  const handleLanguageUpdate = async (language: string | null) => {
    await updateLanguageMutation.mutateAsync({ language: language as "en" | "en-GB" | "ja" | "zh-TW" | "zh-CN" | null });
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
          selectedSnapshotData={selectedSnapshotData || null}
          isLoading={isLoadingSnapshots}
        />
      </div>

      <TokenDialog
        region={selectedRegion}
        isOpen={isTokenDialogOpen}
        onClose={closeTokenDialog}
        onTokenUpdate={handleTokenUpdate}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTimezone={timezoneData?.timezone ?? null}
        currentLanguage={languageData?.language ?? null}
        username={user.name ?? undefined}
        onTimezoneUpdate={handleTimezoneUpdate}
        onLanguageUpdate={handleLanguageUpdate}
        onOpenTokenDialog={handleOpenTokenDialog}
      />
    </div>
  );
} 