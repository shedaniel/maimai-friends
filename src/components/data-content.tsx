"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentVersion } from "@/lib/metadata";
import { addRatingsAndSort, SongWithRating } from "@/lib/rating-calculator";
import { Region, SnapshotWithSongs } from "@/lib/types";
import { createSafeMaimaiImageUrl } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Disc, Music } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "./ui/button";
import { useState } from "react";

interface DataContentProps {
  region: Region;
  selectedSnapshotData: SnapshotWithSongs | null;
  isLoading: boolean;
}

// Component for rendering individual song rows
function SongRow({ song }: { song: SongWithRating }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-1.5 h-12">
      <Image src={createSafeMaimaiImageUrl(song.cover)}
        alt={song.songName}
        blurDataURL={`/_next/image?url=${createSafeMaimaiImageUrl(song.cover)}&w=16&q=1`}
        className="w-9 h-9 mr-2"
        width={36}
        height={36}
        layout="fixed"
        loading="lazy"
        unoptimized
      />
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{song.songName}&#8203;</div>
        <div className="text-muted-foreground text-xs truncate">{song.artist} • {song.difficulty} {song.level} ({song.levelPrecise / 10})</div>
      </div>
      <div className="text-right ml-2">
        <div className="font-mono">{(song.achievement / 10000).toFixed(4)}%</div>
        <div className="text-xs text-muted-foreground">{song.fc !== 'none' ? song.fc.toUpperCase() : ''} {song.fs !== 'none' ? song.fs.toUpperCase() : ''}&#8203;</div>
      </div>
      <div className="text-right ml-4 mr-2">
        <div className="font-mono text-md font-semibold">{song.rating}</div>
      </div>
    </div>
  );
}

// Component for rendering song sections
function SongSection({ title, songs, count }: { title: string; songs: SongWithRating[]; count?: string }) {
  if (songs.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <h5 className="font-medium text-sm text-muted-foreground">
        {title} {count && `(${count})`}
      </h5>
      <div className="space-y-2">
        {songs.map(song => (
          <SongRow key={`${song.songId}-${song.difficulty}`} song={song} />
        ))}
      </div>
    </div>
  );
}

// Component for rendering the songs list with four sections
function SongsList({ songs, region, t }: { songs: SongWithRating[]; region: Region; t: any }) {
  const currentVersion = getCurrentVersion(region);
  
  // Separate songs by new/old
  const newSongs = songs.filter(song => song.addedVersion === currentVersion);
  const oldSongs = songs.filter(song => song.addedVersion !== currentVersion);
  
  // Get top songs for B15/B35
  const newSongsB15 = newSongs.slice(0, 15);
  const oldSongsB35 = oldSongs.slice(0, 35);
  
  // Get remaining songs
  const remainingNewSongs = newSongs.slice(15);
  const remainingOldSongs = oldSongs.slice(35);

  return (
    <div className="bg-muted/50 rounded-md p-4">
      <h4 className="font-medium mb-4">{t('dataContent.songs', { count: songs.length })}</h4>
      <div className="space-y-6">
        <SongSection 
          title={t('dataContent.newSongsB15')} 
          songs={newSongsB15} 
          count={`${newSongsB15.length}/15`}
        />
        <SongSection 
          title={t('dataContent.oldSongsB35')} 
          songs={oldSongsB35} 
          count={`${oldSongsB35.length}/35`}
        />
        <SongSection 
          title={t('dataContent.newSongs')} 
          songs={remainingNewSongs} 
          count={remainingNewSongs.length > 0 ? `${remainingNewSongs.length}` : undefined}
        />
        <SongSection 
          title={t('dataContent.oldSongs')} 
          songs={remainingOldSongs} 
          count={remainingOldSongs.length > 0 ? `${remainingOldSongs.length}` : undefined}
        />
      </div>
    </div>
  );
}

function SongsCard({ selectedSnapshotData, region }: { selectedSnapshotData: SnapshotWithSongs | null; region: Region }) {
  const t = useTranslations();

  if (selectedSnapshotData) {
    const { snapshot, songs } = selectedSnapshotData;
    
    // Calculate ratings and sort by highest rating first
    const songsWithRating: SongWithRating[] = addRatingsAndSort(songs);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dataContent.snapshotData')}</CardTitle>
          <CardDescription>
            {t('dataContent.snapshotFrom', { 
              date: snapshot.fetchedAt.toLocaleString(), 
              name: snapshot.displayName, 
              count: songs.length 
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Player Info */}
            <div className="bg-muted/50 rounded-md p-4">
              <h4 className="font-medium mb-2">{t('dataContent.playerInfo')}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>{t('dataContent.rating', { rating: snapshot.rating })}</div>
                <div>{t('dataContent.stars', { stars: snapshot.stars })}</div>
                <div>{t('dataContent.versionPlays', { count: snapshot.versionPlayCount })}</div>
                <div>{t('dataContent.totalPlays', { count: snapshot.totalPlayCount })}</div>
              </div>
            </div>
            
            {/* Songs Preview */}
            <SongsList songs={songsWithRating} region={region} t={t} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

export function DataContent({ 
  region, 
  selectedSnapshotData, 
  isLoading
}: DataContentProps) {
  const t = useTranslations();
  const [selectedTab, setSelectedTab] = useState("songs");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
            <span>{t('dataContent.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (true) {
    return (
      <Tabs
        orientation="vertical"
        defaultValue={selectedTab}
        onValueChange={setSelectedTab}
        className="gap-4 flex flex-row items-start"
      >
        <TabsList className="shrink-0 grid grid-cols-1 h-auto w-16 gap-1 bg-gray-200">
          <TabsTrigger value="songs" className="py-1.5">
            Songs
          </TabsTrigger>
          <TabsTrigger value="plates" className="py-1.5">
            Plates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="songs" className="mt-0 flex-1 min-w-0">
          <SongsCard selectedSnapshotData={selectedSnapshotData} region={region} />
        </TabsContent>
        <TabsContent value="plates" className="mt-0 flex-1 min-w-0">
          Plates Content
        </TabsContent>
      </Tabs>
    )
  }

 

  return (
    <div className="p-8 text-center w-full h-[calc(100vh-20rem)] flex flex-col items-center justify-center">
      <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">{t('dataContent.noDataAvailable')}</h3>
      <p className="text-muted-foreground">
        {t('dataContent.getStartedInstructions')}
      </p>
    </div>
  );
}