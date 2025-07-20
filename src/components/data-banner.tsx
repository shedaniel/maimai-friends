"use client";


import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download } from "lucide-react";
import { getVersionInfo } from "@/lib/metadata";
import { Region, Snapshot } from "@/lib/types";
import { useTranslations } from "next-intl";

interface DataBannerProps {
  region: Region;
  snapshots: Snapshot[];
  selectedSnapshot: string | null;
  onSnapshotChange: (snapshotId: string) => void;
  onFetchData: () => void;
  isFetching: boolean;
  userTimezone?: string | null; // null = Asia/Tokyo (JP default)
}

export function DataBanner({
  region,
  snapshots,
  selectedSnapshot,
  onSnapshotChange,
  onFetchData,
  isFetching,
  userTimezone,
}: DataBannerProps) {
  const t = useTranslations();
  const hasSnapshots = snapshots.length > 0;

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
            ) : (
              <Badge variant="secondary">{t('dataBanner.noDataAvailable')}</Badge>
            )}
          </div>

          {/* Right side - Fetch controls */}
          <div className="flex items-center space-x-3">
            <Button
              onClick={onFetchData}
              disabled={isFetching || region === "jp"}
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