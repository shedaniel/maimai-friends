"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getCurrentVersion } from "@/lib/metadata";
import { addRatingsAndSort, SongWithRating } from "@/lib/rating-calculator";
import { Region, SnapshotWithSongs } from "@/lib/types";
import { cn, createSafeMaimaiImageUrl } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

// Helper function to group songs by individual rating values
function groupSongsByRating(songs: SongWithRating[]) {
  if (songs.length === 0) return [];
  
  const ratings = songs.map(song => song.rating);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  
  const grouped = [];
  for (let rating = minRating; rating <= maxRating; rating++) {
    const count = songs.filter(song => song.rating === rating).length;
    grouped.push({
      rating: rating.toString(),
      count: count,
    });
  }
  
  return grouped;
}

// Chart configuration
const chartConfig = {
  count: {
    label: "Songs",
    color: "hsl(var(--chart-1))",
  },
};

// Component for rating chart
function RatingChart({ songs, title }: { songs: SongWithRating[]; title: string }) {
  const chartData = groupSongsByRating(songs);

  if (songs.length === 0) return null;

  return (
    <div className="space-y-2 flex flex-col border border-gray-200 py-4 rounded-md shadow-sm">
      <span className="text-sm text-center font-semibold">{title}</span>
      <ChartContainer config={chartConfig} className="h-[200px] w-full pr-10">
        <BarChart data={chartData}>
          <XAxis
            dataKey="rating"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <ChartTooltip
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
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
function SongsList({ newSongsB15, oldSongsB35, remainingNewSongs, remainingOldSongs, t }: { 
  newSongsB15: SongWithRating[]; 
  oldSongsB35: SongWithRating[]; 
  remainingNewSongs: SongWithRating[]; 
  remainingOldSongs: SongWithRating[]; 
  t: any 
}) {
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

export function SongsCard({ selectedSnapshotData, region }: { selectedSnapshotData: SnapshotWithSongs; region: Region }) {
  const t = useTranslations();

  const { songs } = selectedSnapshotData;

  // Calculate ratings and sort by highest rating first
  const songsWithRating: SongWithRating[] = addRatingsAndSort(songs);
  
  const currentVersion = getCurrentVersion(region);

  // Separate songs by new/old
  const newSongs = songsWithRating.filter(song => song.addedVersion === currentVersion);
  const oldSongs = songsWithRating.filter(song => song.addedVersion !== currentVersion);

  // Get top songs for B15/B35
  const newSongsB15 = newSongs.slice(0, 15);
  const oldSongsB35 = oldSongs.slice(0, 35);

  // Get remaining songs
  const remainingNewSongs = newSongs.slice(15);
  const remainingOldSongs = oldSongs.slice(35);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dataContent.songs', { count: songs.length })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RatingChart songs={newSongsB15} title={t('dataContent.newSongsB15')} />
            <RatingChart songs={oldSongsB35} title={t('dataContent.oldSongsB35')} />
          </div>
          <SongsList 
            newSongsB15={newSongsB15}
            oldSongsB35={oldSongsB35}
            remainingNewSongs={remainingNewSongs}
            remainingOldSongs={remainingOldSongs}
            t={t} 
          />
        </div>
      </CardContent>
    </Card>
  );
} 