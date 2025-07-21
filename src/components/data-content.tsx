"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentVersion } from "@/lib/metadata";
import { addRatingsAndSort, SongWithRating } from "@/lib/rating-calculator";
import { Region, SnapshotWithSongs } from "@/lib/types";
import { cn, createSafeMaimaiImageUrl } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Disc, Loader2, Music, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "./ui/button";
import { useState } from "react";

interface DataContentProps {
  region: Region;
  selectedSnapshotData: SnapshotWithSongs | null;
  isLoading: boolean;
}

function RatingImage({ rating }: { rating: number }) {
  const variant = rating >= 15000 ? "rainbow"
  : rating >= 14500 ? "platinum" 
  : rating >= 14000 ? "gold"
  : rating >= 13000 ? "silver"
  : rating >= 12000 ? "bronze"
  : rating >= 10000 ? "purple"
  : rating >= 7000 ? "red"
  : rating >= 4000 ? "yellow"
  : rating >= 2000 ? "green"
  : rating >= 1 ? "blue"
  : "white";

  const ratingImageUrl = `https://maimaidx.jp/maimai-mobile/img/rating_base_${variant}.png?ver=1.55`;

  return (
    <Image src={createSafeMaimaiImageUrl(ratingImageUrl)} alt={rating.toString()} width={120} height={35} />
  );
}

// Component for rendering individual song rows
function SongRow({ song }: { song: SongWithRating }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-dashed border-gray-200 pb-1.5 h-12">
      <Image src={createSafeMaimaiImageUrl(song.cover)}
        alt={song.songName}
        className={cn(
          "w-8 h-8 ml-1 mr-3 rounded ring-2 ring-offset-2 ring-offset-card",
          song.difficulty === "basic" && "ring-green-400",
          song.difficulty === "advanced" && "ring-yellow-400",
          song.difficulty === "expert" && "ring-red-400",
          song.difficulty === "master" && "ring-purple-500",
          song.difficulty === "remaster" && "ring-purple-200",
          song.difficulty === "utage" && "ring-pink-400",
        )}
        width={36}
        height={36}
        loading="lazy"
        quality={1}
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
      <h5 className="font-semibold mb-2 text-sm">
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
  );
}

function InfoCard({ selectedSnapshotData, region }: { selectedSnapshotData: SnapshotWithSongs; region: Region }) {
  const t = useTranslations();

  const { snapshot } = selectedSnapshotData;

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Image src={createSafeMaimaiImageUrl(snapshot.iconUrl)} alt={snapshot.title} width={80} height={80} />
          <div className="grid grid-rows-[auto_1fr] min-w-72 self-stretch my-1 space-y-0.5">
            <span className="text-sm text-muted-foreground bg-gray-100 rounded-full px-6 py-1 text-center inset-shadow-sm truncate">{snapshot.title}</span>
            <span className="text-lg font-semibold flex items-center self-center">
              <span className="mx-4 flex-1">{snapshot.displayName}</span>
              <div className="shrink-0 grow-0 min-w-fit w-[120px] h-[35px] relative">
                <RatingImage rating={snapshot.rating} />
                <span className="absolute top-[3px] left-[8px] w-[106px] h-[21px] tracking-[1.65px] text-right text-[18px] text-white box-border font-medium font-mono">{snapshot.rating}</span>
              </div>
            </span>
          </div>
        </div>
        <div className="bg-muted/50 rounded-md p-4">
          <h4 className="font-medium mb-2">{t('dataContent.playerInfo')}</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>{t('dataContent.rating', { rating: snapshot.rating })}</div>
            <div>{t('dataContent.stars', { stars: snapshot.stars })}</div>
            <div>{t('dataContent.versionPlays', { count: snapshot.versionPlayCount })}</div>
            <div>{t('dataContent.totalPlays', { count: snapshot.totalPlayCount })}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SongsCard({ selectedSnapshotData, region }: { selectedSnapshotData: SnapshotWithSongs; region: Region }) {
  const t = useTranslations();

  const { songs } = selectedSnapshotData;

  // Calculate ratings and sort by highest rating first
  const songsWithRating: SongWithRating[] = addRatingsAndSort(songs);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dataContent.songs', { count: songs.length })}</CardTitle>
      </CardHeader>
      <CardContent>
        <SongsList songs={songsWithRating} region={region} t={t} />
      </CardContent>
    </Card>
  );
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
      <div className="p-8 text-center w-full h-[calc(100vh-20rem)] flex flex-col items-center justify-center">
       <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
       <h3 className="text-lg font-medium mb-2">{t('dataContent.loading')}</h3>
      </div>
    );
  }

  if (selectedSnapshotData) {
    const tabs = [
      {
        name: t('dataContent.tabs.playerInfo'),
        value: "info",
        icon: User,
      },
      {
        name: t('dataContent.tabs.songs'),
        value: "songs",
        icon: Music,
      },
      {
        name: t('dataContent.tabs.plates'),
        value: "plates",
        icon: Disc,
      },
    ]

    return (
      <Tabs
        orientation="vertical"
        defaultValue={selectedTab}
        onValueChange={setSelectedTab}
        className="flex flex-row items-start"
      >
        <TabsList className="shrink-0 grid grid-cols-1 min-w-30 p-0 bg-background mt-4 font-semibold">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="border-l-2 border-transparent justify-start rounded-none data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:bg-primary/5 py-1.5 pr-4">
              <tab.icon className="h-5 w-5 me-3" /> {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="info" className="mt-0 flex-1 min-w-0">
          <InfoCard selectedSnapshotData={selectedSnapshotData} region={region} />
        </TabsContent>
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