"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { Region, SnapshotWithSongs } from "@/lib/types";
import { addRatingsAndSort, SongWithRating } from "@/lib/rating-calculator";
import { getLatestAvailableVersion } from "@/lib/metadata";

interface DataContentProps {
  region: Region;
  selectedSnapshotData: SnapshotWithSongs | null;
  isLoading: boolean;
}

// Component for rendering individual song rows
function SongRow({ song }: { song: SongWithRating }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-1.5 h-12">
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{song.songName}&#8203;</div>
        <div className="text-muted-foreground text-xs">{song.artist} • {song.difficulty} {song.level}</div>
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
function SongsList({ songs, region }: { songs: SongWithRating[]; region: Region }) {
  const latestVersion = getLatestAvailableVersion(region);
  
  // Separate songs by new/old
  const newSongs = songs.filter(song => song.addedVersion === latestVersion);
  const oldSongs = songs.filter(song => song.addedVersion !== latestVersion);
  
  // Get top songs for B15/B35
  const newSongsB15 = newSongs.slice(0, 15);
  const oldSongsB35 = oldSongs.slice(0, 35);
  
  // Get remaining songs
  const remainingNewSongs = newSongs.slice(15);
  const remainingOldSongs = oldSongs.slice(35);

  return (
    <div className="bg-muted/50 rounded-md p-4">
      <h4 className="font-medium mb-4">Songs ({songs.length} total)</h4>
      <div className="space-y-6">
        <SongSection 
          title="New Songs B15" 
          songs={newSongsB15} 
          count={`${newSongsB15.length}/15`}
        />
        <SongSection 
          title="Old Songs B35" 
          songs={oldSongsB35} 
          count={`${oldSongsB35.length}/35`}
        />
        <SongSection 
          title="New Songs" 
          songs={remainingNewSongs} 
          count={remainingNewSongs.length > 0 ? `${remainingNewSongs.length}` : undefined}
        />
        <SongSection 
          title="Old Songs" 
          songs={remainingOldSongs} 
          count={remainingOldSongs.length > 0 ? `${remainingOldSongs.length}` : undefined}
        />
      </div>
    </div>
  );
}

export function DataContent({ 
  region, 
  selectedSnapshotData, 
  isLoading
}: DataContentProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
            <span>Loading data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedSnapshotData) {
    const { snapshot, songs } = selectedSnapshotData;
    
    // Calculate ratings and sort by highest rating first
    const songsWithRating: SongWithRating[] = addRatingsAndSort(songs);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Snapshot Data</CardTitle>
          <CardDescription>
            Snapshot from {snapshot.fetchedAt.toLocaleString()} • {snapshot.displayName} • {songs.length} songs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Player Info */}
            <div className="bg-muted/50 rounded-md p-4">
              <h4 className="font-medium mb-2">Player Info</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Rating: {snapshot.rating}</div>
                <div>Stars: {snapshot.stars}</div>
                <div>Version Plays: {snapshot.versionPlayCount}</div>
                <div>Total Plays: {snapshot.totalPlayCount}</div>
              </div>
            </div>
            
            {/* Songs Preview */}
            <SongsList songs={songsWithRating} region={region} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Data Available</h3>
        <p className="text-muted-foreground">
          {region === "jp" 
            ? "Japan region support is coming soon." 
            : "Get started by fetching your maimai data using the fetch button above."
          }
        </p>
      </CardContent>
    </Card>
  );
} 