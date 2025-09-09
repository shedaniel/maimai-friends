import { SongWithScore } from "./types";

// Calculate rating factor based on accuracy
export function getRatingFactor(accuracy: number): number {
  if (accuracy >= 100.5) return 0.224;
  if (accuracy >= 100) return 0.216;
  if (accuracy >= 99.5) return 0.211;
  if (accuracy >= 99) return 0.208;
  if (accuracy >= 98) return 0.203;
  if (accuracy >= 97) return 0.2;
  if (accuracy >= 94) return 0.168;
  if (accuracy >= 90) return 0.152;
  if (accuracy >= 80) return 0.136;
  return 0; // Below 80% gets no rating
}

// Calculate song rating using the formula: rating = floor(factor * accuracy * levelPrecise / 10)
export function calculateSongRating(song: SongWithScore): number {
  const accuracy = song.achievement / 10000;
  const factor = getRatingFactor(accuracy);
  return factor * Math.min(accuracy, 100.5) * song.levelPrecise / 10;
}

// Extended song type with calculated rating
export interface SongWithRating extends SongWithScore {
  rating: number;
}

// Helper function to add ratings to songs and sort by rating
export function addRatingsAndSort(songs: SongWithScore[]): SongWithRating[] {
  return songs
    .map(song => ({
      ...song,
      rating: calculateSongRating(song)
    }))
    .sort((a, b) => b.achievement - a.achievement)
    .sort((a, b) => b.rating - a.rating)
    .map(song => ({
      ...song,
      rating: Math.floor(song.rating)
    }));
}

export function splitSongs(withScore: SongWithScore[], version: number) {
  const songs = addRatingsAndSort(withScore);
  // Since version 12, we incorporate songs from the previous version into the new version
  const versionAboveIsNew = version >= 12 ? version - 1 : version;
  const newSongs = songs.filter(song => song.addedVersion >= versionAboveIsNew);
  const oldSongs = songs.filter(song => song.addedVersion < versionAboveIsNew);

  const newSongsB15 = newSongs.slice(0, 15);
  const oldSongsB35 = oldSongs.slice(0, 35);
  const newSongsRemaining = newSongs.slice(15);
  const oldSongsRemaining = oldSongs.slice(35);

  return {
    newSongsB15,
    oldSongsB35,
    newSongsRemaining,
    oldSongsRemaining,
  }
}