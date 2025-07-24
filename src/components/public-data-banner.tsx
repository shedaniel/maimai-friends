"use client";

import { RegionSwitcher } from "@/components/region-switcher";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getVersionInfo } from "@/lib/metadata";
import { Region } from "@/lib/types";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";

interface PublicDataBannerProps {
  region: Region;
  snapshotData: {
    fetchedAt: Date;
    displayName: string;
    rating: number;
    gameVersion: number;
  } | null;
  userTimezone?: string | null; // null = Asia/Tokyo (JP default)
  profileUsername: string;
  onRegionChange: (region: Region) => void;
}

export function PublicDataBanner({
  region,
  snapshotData,
  userTimezone,
  profileUsername,
  onRegionChange,
}: PublicDataBannerProps) {
  const t = useTranslations();

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
          {/* Left side - Latest snapshot info */}
          <div className="flex items-center space-x-4">
            {snapshotData ? (
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{t('dataBanner.dataSnapshot')} {snapshotData ? formatDate(snapshotData.fetchedAt) : ''}</span>
                <span className="text-xs text-muted-foreground">
                  {snapshotData.displayName} • {snapshotData.rating} rating • {getVersionInfo(snapshotData.gameVersion)?.shortName || "Unknown"}
                </span>
              </div>
            ) : (
              <Badge variant="secondary">{t('dataBanner.noDataAvailable')}</Badge>
            )}
          </div>

          {/* Right side - Profile info */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{profileUsername}</span>
            </div>
            <RegionSwitcher 
              value={region} 
              onChange={onRegionChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 