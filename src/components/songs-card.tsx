"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentVersion } from "@/lib/metadata";
import { addRatingsAndSort, SongWithRating } from "@/lib/rating-calculator";
import { Region, SnapshotWithSongs } from "@/lib/types";
import { cn, createSafeMaimaiImageUrl } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Fragment, useState } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { LayoutList, LayoutGrid, Menu, Plus, TrendingUp } from "lucide-react";

// Helper function to group songs by individual rating values and difficulty
function groupSongsByRating(songs: SongWithRating[]) {
  if (songs.length === 0) return [];

  const ratings = songs.map(song => song.rating);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);

  const grouped = [];
  for (let rating = minRating; rating <= maxRating; rating++) {
    const songsAtRating = songs.filter(song => song.rating === rating);

    // Group by difficulty within each rating
    const difficultyCounts = {
      basic: songsAtRating.filter(s => s.difficulty === 'basic').length,
      advanced: songsAtRating.filter(s => s.difficulty === 'advanced').length,
      expert: songsAtRating.filter(s => s.difficulty === 'expert').length,
      master: songsAtRating.filter(s => s.difficulty === 'master').length,
      remaster: songsAtRating.filter(s => s.difficulty === 'remaster').length,
      utage: songsAtRating.filter(s => s.difficulty === 'utage').length,
    };

    grouped.push({
      rating: rating.toString(),
      ...difficultyCounts,
      total: songsAtRating.length,
    });
  }

  return grouped;
}

// Chart configuration
const chartConfig = {
  basic: {
    label: "Basic",
    color: "hsl(142, 76%, 36%)", // green
  },
  advanced: {
    label: "Advanced",
    color: "hsl(45, 93%, 47%)", // yellow
  },
  expert: {
    label: "Expert",
    color: "hsl(0, 84%, 60%)", // red
  },
  master: {
    label: "Master",
    color: "hsl(271, 81%, 56%)", // purple
  },
  remaster: {
    label: "Re:Master",
    color: "hsl(270, 95%, 85%)", // light purple
  },
  utage: {
    label: "Utage",
    color: "hsl(330, 81%, 60%)", // pink
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
            dataKey="basic"
            stackId="difficulty"
            fill="var(--color-basic)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="advanced"
            stackId="difficulty"
            fill="var(--color-advanced)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="expert"
            stackId="difficulty"
            fill="var(--color-expert)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="master"
            stackId="difficulty"
            fill="var(--color-master)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="remaster"
            stackId="difficulty"
            fill="var(--color-remaster)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="utage"
            stackId="difficulty"
            fill="var(--color-utage)"
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
        <div className="text-muted-foreground text-xs truncate">{song.difficulty.slice(0, 3).toUpperCase()} {(song.levelPrecise / 10).toFixed(1)} • {song.artist}</div>
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

// Component for rendering compact song section as a single grid
function CompactSongSection({ title, songs, count, t, sum, average }: {
  title: string;
  songs: SongWithRating[];
  count?: string;
  t: any;
  sum?: number;
  average?: number;
}) {
  if (songs.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2 px-2">
        <h5 className="font-semibold text-sm">{title} {count && `(${count})`}</h5>
        {(sum !== undefined || average !== undefined) && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {sum !== undefined && (
              <div className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                <span>{t('dataContent.statistics.sum')}</span>
                <span className="font-mono font-medium">{sum}</span>
              </div>
            )}
            {average !== undefined && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>{t('dataContent.statistics.average')}</span>
                <span className="font-mono font-medium">{average.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-[4fr_2fr_min-content_min-content_min-content_min-content_min-content] text-xs overflow-x-auto">
        {/* Headers */}
        <div className="font-semibold text-muted-foreground border-b border-gray-300 pb-1 px-2 text-left whitespace-nowrap min-w-48">
          {t('dataContent.tableHeaders.song')}
        </div>
        <div className="font-semibold text-muted-foreground border-b border-gray-300 pb-1 px-2 text-left whitespace-nowrap min-w-24">
          {t('dataContent.tableHeaders.artist')}
        </div>
        <div className="font-semibold text-muted-foreground border-b border-gray-300 pb-1 px-2 text-center whitespace-nowrap">
          {t('dataContent.tableHeaders.level')}
        </div>
        <div className="font-semibold text-muted-foreground border-b border-gray-300 pb-1 px-2 text-center whitespace-nowrap">
          {t('dataContent.tableHeaders.achievement')}
        </div>
        <div className="font-semibold text-muted-foreground border-b border-gray-300 pb-1 px-2 min-w-10 text-center whitespace-nowrap">
          {t('dataContent.tableHeaders.fc')}
        </div>
        <div className="font-semibold text-muted-foreground border-b border-gray-300 pb-1 px-2 min-w-10 text-center whitespace-nowrap">
          {t('dataContent.tableHeaders.fs')}
        </div>
        <div className="font-semibold text-muted-foreground border-b border-gray-300 pb-1 px-2 text-center whitespace-nowrap">
          {t('dataContent.tableHeaders.rating')}
        </div>

        {/* Song Data */}
        {songs.map(song => (
          <Fragment key={`${song.songId}-${song.difficulty}`}>
            <div key={`${song.songId}-${song.difficulty}-name`} className="truncate font-medium py-1 px-2 border-b border-dashed border-gray-200">
              {song.songName}
            </div>
            <div key={`${song.songId}-${song.difficulty}-artist`} className="truncate text-muted-foreground py-1 px-2 border-b border-dashed border-gray-200">
              {song.artist}
            </div>
            <div key={`${song.songId}-${song.difficulty}-level`} className={cn("text-center border-b grid items-center font-medium border-dashed",
              song.difficulty === "basic" && "bg-green-100 text-green-800 border-green-200",
              song.difficulty === "advanced" && "bg-yellow-100 text-yellow-800 border-yellow-200",
              song.difficulty === "expert" && "bg-red-100 text-red-800 border-red-200",
              song.difficulty === "master" && "bg-purple-300 text-purple-900 border-purple-400",
              song.difficulty === "remaster" && "bg-purple-50 text-purple-800 border-purple-200",
              song.difficulty === "utage" && "bg-pink-100 text-pink-800 border-pink-200",
            )}>
              {(song.levelPrecise / 10).toFixed(1)}
            </div>
            <div key={`${song.songId}-${song.difficulty}-achievement`} className="text-right font-mono py-1 px-2 border-b border-dashed border-gray-200">
              {(song.achievement / 10000).toFixed(4)}%
            </div>
            <div key={`${song.songId}-${song.difficulty}-fc`} className="text-center text-muted-foreground py-1 px-2 border-b border-dashed border-gray-200">
              {song.fc !== 'none' ? song.fc.toUpperCase() : ''}
            </div>
            <div key={`${song.songId}-${song.difficulty}-fs`} className="text-center text-muted-foreground py-1 px-2 border-b border-dashed border-gray-200">
              {song.fs !== 'none' ? song.fs.toUpperCase() : ''}
            </div>
            <div key={`${song.songId}-${song.difficulty}-rating`} className="text-right font-mono font-semibold py-1 px-2 border-b border-dashed border-gray-200">
              {song.rating}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// Component for rendering individual song cards in grid view
function SongGridCard({ song }: { song: SongWithRating }) {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const percentX = (x - centerX) / centerX;
    const percentY = -((y - centerY) / centerY);

    card.style.transform = `perspective(1000px) rotateY(${percentX * 8}deg) rotateX(${percentY * 8}deg) scale3d(1.02, 1.02, 1.02)`;

    const glow = card.querySelector('.song-card-glow') as HTMLElement;
    const content = card.querySelector('.song-card-content') as HTMLElement;

    if (glow) {
      glow.style.opacity = '1';
      glow.style.background = `
        radial-gradient(
          circle at 
          ${x}px ${y}px, 
          rgba(255, 255, 255, 0.2),
          rgba(255, 255, 255, 0.15),
          rgba(255, 255, 255, 0.05),
          transparent
        )
      `;
    }

    if (content) {
      content.style.transform = 'translateZ(30px)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)';

    const glow = card.querySelector('.song-card-glow') as HTMLElement;
    const content = card.querySelector('.song-card-content') as HTMLElement;

    if (glow) {
      glow.style.opacity = '0';
    }

    if (content) {
      content.style.transform = 'translateZ(0px)';
    }
  };

  return (
    <div
      className={cn("relative bg-white rounded shadow-md overflow-hidden transition-all duration-300 ease-out cursor-pointer border-2",
        song.difficulty === "basic" && "border-green-400",
        song.difficulty === "advanced" && "border-yellow-400",
        song.difficulty === "expert" && "border-red-400",
        song.difficulty === "master" && "border-purple-500",
        song.difficulty === "remaster" && "border-purple-200",
        song.difficulty === "utage" && "border-pink-400",
      )}
      style={{ aspectRatio: '16/10', transformStyle: 'preserve-3d', transform: 'perspective(1000px)' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Song Cover Background */}
      <Image
        src={createSafeMaimaiImageUrl(song.cover)}
        alt={song.songName}
        fill
        className="object-cover"
        loading="lazy"
      />

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/30" />

      {/* Glow Effect */}
      <div className="song-card-glow absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none" />

      <div className="song-card-content relative w-full h-full transition-transform duration-300"
        style={{ transform: 'translateZ(30px)' }}>
        {/* Song Type Badge */}
        <div className="absolute top-2.5 left-2.5 2xs:max-xs:left-2 2xs:max-xs:top-2 2xs:max-xs:scale-75 origin-top-left z-30">
          <Image
            src={createSafeMaimaiImageUrl(song.type === "dx"
              ? "https://maimaidx.jp/maimai-mobile/img/music_dx.png"
              : "https://maimaidx.jp/maimai-mobile/img/music_standard.png"
            )}
            alt={song.type.toUpperCase()}
            width={37}
            height={11}
            className="drop-shadow-md"
            loading="lazy"
          />
        </div>

        {/* Difficulty Badge */}
        <div className={cn(
          "absolute top-0 right-0 px-1.5 py-0.5 rounded-rt rounded-bl text-[10px] font-semibold text-white shadow-md z-30",
          song.difficulty === "basic" && "bg-green-700",
          song.difficulty === "advanced" && "bg-yellow-700",
          song.difficulty === "expert" && "bg-red-700",
          song.difficulty === "master" && "bg-purple-700",
          song.difficulty === "remaster" && "bg-purple-200 text-purple-900",
          song.difficulty === "utage" && "bg-pink-700",
        )}>
          {(song.levelPrecise / 10).toFixed(1)}
        </div>

        {/* Song Info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 text-white z-30">
          <div className="2xs:max-xs:text-xs text-sm font-bold truncate mb-1 drop-shadow-md">
            {song.songName}
          </div>
          <div className="2xs:max-xs:text-2xs text-xs opacity-90 truncate drop-shadow-md">
            {song.artist}
          </div>

          {/* Achievement and Rating */}
          <div className="flex justify-between items-end">
            <div className="2xs:max-xs:text-2xs text-xs space-x-1 2xs:max-xs:space-x-0.5">
              <span className="2xs:max-xs:text-[9px] font-mono font-medium drop-shadow-md">
                {(song.achievement / 10000).toFixed(4)}%
              </span>
              <span className="2xs:max-xs:text-[7px] text-[10px] opacity-75 drop-shadow-md whitespace-nowrap">
                {song.fc !== 'none' ? song.fc.toUpperCase() : ''}{song.fc !== 'none' && song.fs !== 'none' ? ' ' : ''}{song.fs !== 'none' ? song.fs.toUpperCase() : ''}
              </span>
            </div>
            <span className="2xs:max-xs:text-sm text-right text-lg font-bold font-mono drop-shadow-md leading-none align-bottom">
              {song.rating}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for rendering song sections
function SongSection({ title, songs, count, displayMode, t, sum, average }: {
  title: string;
  songs: SongWithRating[];
  count?: string;
  displayMode: "list" | "grid" | "compact";
  t: any;
  sum?: number;
  average?: number;
}) {
  if (songs.length === 0) return null;

  // Use dedicated compact section for compact mode
  if (displayMode === "compact") {
    return <CompactSongSection title={title} songs={songs} count={count} t={t} sum={sum} average={average} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <h5 className="font-semibold text-sm">{title} {count && `(${count})`}</h5>
        {(sum !== undefined || average !== undefined) && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {sum !== undefined && (
              <div className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                <span>{t('dataContent.statistics.sum')}</span>
                <span className="font-mono font-medium">{sum}</span>
              </div>
            )}
            {average !== undefined && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>{t('dataContent.statistics.average')}</span>
                <span className="font-mono font-medium">{average.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {songs.map(song => (
          <SongRow key={`${song.songId}-${song.difficulty}`} song={song} />
        ))}
      </div>
    </div>
  );
}

function SongGridSection({ title, songs, count, t, sum, average }: {
  title: string;
  songs: SongWithRating[];
  count?: string;
  t: any;
  sum?: number;
  average?: number;
}) {
  if (songs.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h5 className="font-semibold text-sm">{title} {count && `(${count})`}</h5>
        {(sum !== undefined || average !== undefined) && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {sum !== undefined && (
              <div className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                <span>{t('dataContent.statistics.sum')}</span>
                <span className="font-mono font-medium">{sum}</span>
              </div>
            )}
            {average !== undefined && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>{t('dataContent.statistics.average')}</span>
                <span className="font-mono font-medium">{average.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 2xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {songs.map(song => (
          <SongGridCard key={`${song.songId}-${song.difficulty}`} song={song} />
        ))}
      </div>
    </div>
  );
}

// Component for rendering the songs list with four sections
function SongsList({ newSongsB15, oldSongsB35, remainingNewSongs, remainingOldSongs, t, displayMode, b15Sum, b15Average, b35Sum, b35Average }: {
  newSongsB15: SongWithRating[];
  oldSongsB35: SongWithRating[];
  remainingNewSongs: SongWithRating[];
  remainingOldSongs: SongWithRating[];
  t: any;
  displayMode: "list" | "compact";
  b15Sum?: number;
  b15Average?: number;
  b35Sum?: number;
  b35Average?: number;
}) {
  return (
    <div className="space-y-6">
      <SongSection
        title={t('dataContent.newSongsB15')}
        songs={newSongsB15}
        count={`${newSongsB15.length}/15`}
        displayMode={displayMode}
        t={t}
        sum={b15Sum}
        average={b15Average}
      />
      <SongSection
        title={t('dataContent.oldSongsB35')}
        songs={oldSongsB35}
        count={`${oldSongsB35.length}/35`}
        displayMode={displayMode}
        t={t}
        sum={b35Sum}
        average={b35Average}
      />
      <SongSection
        title={t('dataContent.newSongs')}
        songs={remainingNewSongs}
        count={remainingNewSongs.length > 0 ? `${remainingNewSongs.length}` : undefined}
        displayMode={displayMode}
        t={t}
      />
      <SongSection
        title={t('dataContent.oldSongs')}
        songs={remainingOldSongs}
        count={remainingOldSongs.length > 0 ? `${remainingOldSongs.length}` : undefined}
        displayMode={displayMode}
        t={t}
      />
    </div>
  );
}

function SongsGrid({ newSongsB15, oldSongsB35, remainingNewSongs, remainingOldSongs, t, b15Sum, b15Average, b35Sum, b35Average }: { newSongsB15: SongWithRating[]; oldSongsB35: SongWithRating[]; remainingNewSongs: SongWithRating[]; remainingOldSongs: SongWithRating[]; t: any; b15Sum?: number; b15Average?: number; b35Sum?: number; b35Average?: number }) {
  return (
    <div className="space-y-6">
      <SongGridSection
        title={t('dataContent.newSongsB15')}
        songs={newSongsB15}
        count={`${newSongsB15.length}/15`}
        t={t}
        sum={b15Sum}
        average={b15Average}
      />
      <SongGridSection
        title={t('dataContent.oldSongsB35')}
        songs={oldSongsB35}
        count={`${oldSongsB35.length}/35`}
        t={t}
        sum={b35Sum}
        average={b35Average}
      />
      {(remainingNewSongs.length > 0 || remainingOldSongs.length > 0) && (
        <div className="text-center text-sm text-muted-foreground mt-10 mb-4">
          {t('dataContent.switchToListForAllSongs')}
        </div>
      )}
    </div>
  );
}

export function SongsCard({ selectedSnapshotData, region }: { selectedSnapshotData: SnapshotWithSongs; region: Region }) {
  const t = useTranslations();
  const [displayMode, setDisplayMode] = useState<"list" | "grid" | "compact">("grid");

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

  // Calculate sum and average for B15 and B35
  const b15Sum = newSongsB15.reduce((sum, song) => sum + song.rating, 0);
  const b15Average = newSongsB15.length > 0 ? b15Sum / newSongsB15.length : 0;
  const b35Sum = oldSongsB35.reduce((sum, song) => sum + song.rating, 0);
  const b35Average = oldSongsB35.length > 0 ? b35Sum / oldSongsB35.length : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('dataContent.songs', { count: songs.length })}</CardTitle>
          <Select value={displayMode} onValueChange={(value) => setDisplayMode(value as "list" | "grid" | "compact")}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {displayMode === "list" && <LayoutList className="h-4 w-4" />}
                  {displayMode === "grid" && <LayoutGrid className="h-4 w-4" />}
                  {displayMode === "compact" && <Menu className="h-4 w-4" />}
                  <span>
                    {displayMode === "list" && t('dataContent.displayModes.list')}
                    {displayMode === "grid" && t('dataContent.displayModes.grid')}
                    {displayMode === "compact" && t('dataContent.displayModes.compact')}
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span>{t('dataContent.displayModes.grid')}</span>
                </div>
              </SelectItem>
              <SelectItem value="list">
                <div className="flex items-center gap-2">
                  <LayoutList className="h-4 w-4" />
                  <span>{t('dataContent.displayModes.list')}</span>
                </div>
              </SelectItem>
              <SelectItem value="compact">
                <div className="flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  <span>{t('dataContent.displayModes.compact')}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RatingChart songs={newSongsB15} title={t('dataContent.newSongsB15')} />
            <RatingChart songs={oldSongsB35} title={t('dataContent.oldSongsB35')} />
          </div>
          {displayMode === "grid" ? (
            <SongsGrid
              newSongsB15={newSongsB15}
              oldSongsB35={oldSongsB35}
              remainingNewSongs={remainingNewSongs}
              remainingOldSongs={remainingOldSongs}
              t={t}
              b15Sum={b15Sum}
              b15Average={b15Average}
              b35Sum={b35Sum}
              b35Average={b35Average}
            />
          ) : (
            <SongsList
              newSongsB15={newSongsB15}
              oldSongsB35={oldSongsB35}
              remainingNewSongs={remainingNewSongs}
              remainingOldSongs={remainingOldSongs}
              t={t}
              displayMode={displayMode}
              b15Sum={b15Sum}
              b15Average={b15Average}
              b35Sum={b35Sum}
              b35Average={b35Average}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
} 