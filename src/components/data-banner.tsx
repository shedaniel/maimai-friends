"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Download, Trash2, MoreHorizontal, Copy } from "lucide-react";
import { getVersionInfo } from "@/lib/metadata";
import { Region, Snapshot } from "@/lib/types";
import { VersionInfo } from "@/lib/metadata";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface DataBannerProps {
  region: Region;
  snapshots: Snapshot[];
  selectedSnapshot: string | null;
  onSnapshotChange: (snapshotId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onFetchData: () => void;
  isFetching: boolean;
  userTimezone?: string | null; // null = Asia/Tokyo (JP default)
  // New props for copy functionality
  availableVersions: VersionInfo[];
  isLoadingVersions: boolean;
  onCopySnapshot: (snapshotId: string, targetVersion: number) => Promise<any>;
  isCopying: boolean;
}

export function DataBanner({
  region,
  snapshots,
  selectedSnapshot,
  onSnapshotChange,
  onDeleteSnapshot,
  onFetchData,
  isFetching,
  userTimezone,
  availableVersions,
  isLoadingVersions,
  onCopySnapshot,
  isCopying,
}: DataBannerProps) {
  const t = useTranslations();
  const hasSnapshots = snapshots.length > 0;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const formatDate = (date: Date) => {
    // Use user's timezone preference, default to Asia/Tokyo if null
    const timezone = userTimezone || "Asia/Tokyo";
    
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);
  };

  const handleCopyToVersion = async (targetVersion: number) => {
    if (!selectedSnapshot) return;
    
    try {
      const result = await onCopySnapshot(selectedSnapshot, targetVersion);
      const versionInfo = getVersionInfo(targetVersion);
      
      // Show rating change if available
      const ratingChangeText = result.originalRating !== undefined && result.newRating !== undefined
        ? ` Rating: ${result.originalRating} → ${result.newRating}`
        : '';
      
      toast.success(
        `Snapshot copied to ${versionInfo?.shortName || 'Unknown version'}! ${result.copiedScores}/${result.totalOriginalScores} scores copied.${ratingChangeText}`
      );
      setIsDropdownOpen(false);
    } catch (error) {
      toast.error("Failed to copy snapshot. Please try again.");
      console.error("Copy snapshot error:", error);
    }
  };

  return (
    <Card className="w-full">
      <CardContent>
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          {/* Left side - Snapshot selector */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('dataBanner.dataSnapshot')}</span>
            </div>
            
            {hasSnapshots ? (
              <div className="flex items-center space-x-2">
                <Select value={selectedSnapshot || undefined} onValueChange={onSnapshotChange}>
                  <SelectTrigger className="w-80">
                    <SelectValue placeholder={t('dataBanner.selectSnapshot')} />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map((snapshot) => (
                      <SelectItem key={snapshot.id} value={snapshot.id}>
                        <div className="flex flex-col items-start">
                          <span>{formatDate(snapshot.fetchedAt)}</span>
                          <span className="text-xs text-muted-foreground">
                            {snapshot.displayName} • {snapshot.rating} rating • {getVersionInfo(snapshot.gameVersion)?.shortName || "Unknown"}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedSnapshot && (
                  <div className="flex items-center space-x-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0"
                          title="Delete selected snapshot"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Snapshot</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this snapshot? This action cannot be undone and will permanently remove all your scores from this snapshot.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => onDeleteSnapshot(selectedSnapshot)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0"
                          title="More options"
                          disabled={isCopying}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger disabled={isLoadingVersions || availableVersions.length === 0} className="gap-3">
                            <Copy className="h-4 w-4" />
                            <span>Copy as another game version</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {isLoadingVersions ? (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                Loading versions...
                              </div>
                            ) : availableVersions.length === 0 ? (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                No other versions available
                              </div>
                            ) : (
                              availableVersions.map((version) => (
                                <DropdownMenuItem
                                  key={version.id}
                                  onClick={() => handleCopyToVersion(version.id)}
                                  disabled={isCopying}
                                >
                                  <span>{version.shortName}</span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {version.name}
                                  </span>
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ) : (
              <Badge variant="secondary">{t('dataBanner.noDataAvailable')}</Badge>
            )}
          </div>

          {/* Right side - Fetch controls */}
          <div className="flex items-center space-x-3">
            <Button
              onClick={onFetchData}
              disabled={isFetching}
              size="sm"
              className="flex items-center space-x-2"
            >
              {isFetching ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  <span>{t('dataBanner.fetchingData')}</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>{t('dataBanner.fetchNewData')}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Fetch instructions */}
        {!hasSnapshots && region === "intl" && (
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <p className="text-sm text-muted-foreground">
              {t('dataBanner.noDataInstructions')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 