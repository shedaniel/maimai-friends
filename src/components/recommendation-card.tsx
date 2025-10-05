"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addRatingsAndSort, getRatingFactor, SongWithRating, splitSongs } from "@/lib/rating-calculator";
import { SnapshotWithSongs } from "@/lib/types";
import { cn, createSafeMaimaiImageUrl } from "@/lib/utils";
import { Heart, Target, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "./ui/select-friendly";

interface RecommendationData {
  song: SongWithRating;
  currentAccuracy: number;
  targetAccuracy: number;
  currentRating: number;
  targetRating: number;
  accuracyDiff: number;
  ratingGain: number;
  isInBest: boolean;
  category: "new" | "old";
}

const ACCURACY_VALUES = [
    94.0,
    97.0,
    98.0,
    99.0,
    99.5,
    100.0,
    100.5,
]

function generateRecommendations(songsWithRating: SongWithRating[], version: number): RecommendationData[] {
  // Get B15/B35 and minimum required ratings
  const { newSongsB15, oldSongsB35, newSongsRemaining, oldSongsRemaining } = splitSongs(songsWithRating, version);
  
  const minNewRating = newSongsB15.length > 0 ? Math.min(...newSongsB15.map(s => s.rating)) : 0;
  const minOldRating = oldSongsB35.length > 0 ? Math.min(...oldSongsB35.map(s => s.rating)) : 0;

  const recommendations: RecommendationData[] = [];

  const newSongsB15Tuple = newSongsB15.map(song => ({song, isNew: true}));
  const oldSongsB35Tuple = oldSongsB35.map(song => ({song, isNew: false}));
  const newSongsRemainingTuple = newSongsRemaining.map(song => ({song, isNew: true}));
  const oldSongsRemainingTuple = oldSongsRemaining.map(song => ({song, isNew: false}));

  // Check each song for recommendation potential
  [...newSongsB15Tuple, ...oldSongsB35Tuple, ...newSongsRemainingTuple, ...oldSongsRemainingTuple].forEach(({song, isNew}) => {
    const isInB15 = isNew && newSongsB15.some(s => s.songId === song.songId && s.difficulty === song.difficulty);
    const isInB35 = !isNew && oldSongsB35.some(s => s.songId === song.songId && s.difficulty === song.difficulty);
    const isInBest = isInB15 || isInB35;

    const currentAccuracy = song.achievement / 10000;
    const minRequiredRating = isNew ? minNewRating : minOldRating;

    // Skip if song can't be improved
    if (currentAccuracy >= 100.5) return;

    // For songs outside best lists, check if 100.5% would be beneficial
    if (!isInBest) {
      const maxPossibleRating = Math.floor(0.224 * 100.5 * song.levelPrecise / 10);
      if (maxPossibleRating <= minRequiredRating) return;
    }

    for (const accuracy of ACCURACY_VALUES) {
      if (accuracy <= currentAccuracy) continue;

      const factor = getRatingFactor(accuracy);
      const newRating = Math.floor(factor * accuracy * song.levelPrecise / 10);

      if (newRating <= minRequiredRating) continue;

      const ratingGain = isInBest
        ? newRating - song.rating  // Improving existing song in B15/B35
        : newRating - minRequiredRating;  // Replacing lowest song in B15/B35

      if (ratingGain <= 0) continue;

      recommendations.push({
        song,
        currentAccuracy,
        targetAccuracy: accuracy,
        accuracyDiff: accuracy - currentAccuracy,
        currentRating: song.rating,
        targetRating: newRating,
        ratingGain,
        isInBest,
        category: isNew ? "new" : "old"
      });
      break
    }
  });

  // Sort by weighting: prioritize small accuracy diff and high rating gain
  return recommendations.sort((a, b) => {
    // Weighted score: prioritize efficiency (rating gain per accuracy diff)
    const scoreA = a.ratingGain / Math.max(a.accuracyDiff, 0.1);
    const scoreB = b.ratingGain / Math.max(b.accuracyDiff, 0.1);
    
    if (Math.abs(scoreA - scoreB) < 0.1) {
      // If efficiency is similar, prefer higher rating gain
      return b.ratingGain - a.ratingGain;
    }
    
    return scoreB - scoreA;
  });
}

function RecommendationRow({ recommendation }: { recommendation: RecommendationData }) {
  const { song, currentAccuracy, targetAccuracy, currentRating, targetRating, accuracyDiff, ratingGain, isInBest, category } = recommendation;

  return (
    <div className="flex xs:justify-between xs:items-center text-sm h-16 max-xs:h-30 max-xs:flex-col max-xs:justify-start max-xs:gap-y-2">
      <div className="flex items-center xs:flex-1 min-w-0 h-12 max-xs:mt-1.5">
        <Image
          src={createSafeMaimaiImageUrl(song.cover)}
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
          <div className="flex items-center gap-2 mb-1">
            <div className="truncate font-medium">{song.songName}</div>
            <div className={cn(
              "px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap",
              category === "new" ? "bg-lime-100 text-lime-800" : "bg-orange-100 text-orange-800"
            )}>
              {category === "new" ? "New" : "Old"}
            </div>
            {category === "new" && isInBest && (
              <div className="px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap bg-green-100 text-green-800">
                B15
              </div>
            )}
            {category === "old" && isInBest && (
              <div className="px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap bg-red-100 text-red-800">
                B35
              </div>
            )}
          </div>
          <div className="text-muted-foreground text-xs truncate">
            {song.type.toUpperCase()} • {song.difficulty.slice(0, 3).toUpperCase()} {(song.levelPrecise / 10).toFixed(1)} • {song.artist}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="xs:text-right xs:ml-2">
          <div className="text-xs text-muted-foreground">Current → Target</div>
          <div className="font-mono text-xs">
            {currentAccuracy.toFixed(2)}% → <span className="text-green-600">{targetAccuracy.toFixed(2)}%</span>
          </div>
          <div className="font-mono text-xs">
            {currentRating} → <span className="text-green-600">{targetRating}</span>
          </div>
        </div>

        <div className="text-right ml-4 mr-2 space-y-0.5">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Target className="h-3 w-3 text-amber-500" />
            <span>+{accuracyDiff.toFixed(2)}%</span>
          </div>
          <div className="text-xs flex items-center gap-1">
            <Zap className="h-3 w-3 text-green-500" />
            <span className="font-mono font-semibold">+{ratingGain}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecommendationCard({ selectedSnapshotData }: { selectedSnapshotData: SnapshotWithSongs }) {
  const t = useTranslations();
  const [filterCategory, setFilterCategory] = useState<"all" | "new" | "old" | "best">("all");

  const { songs, snapshot } = selectedSnapshotData;
  const songsWithRating: SongWithRating[] = addRatingsAndSort(songs);
  
  const recommendations = generateRecommendations(songsWithRating, snapshot.gameVersion);
  
  // Filter recommendations based on selected category
  const filteredRecommendations = recommendations.filter(rec => {
    switch (filterCategory) {
      case "new":
        return rec.category === "new";
      case "old":
        return rec.category === "old";
      case "best":
        return rec.isInBest;
      default:
        return true;
    }
  }).slice(0, 150);

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            {t('dataContent.tabs.recommendations')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">{t('recommendations.noRecommendations')}</h3>
            <p className="text-muted-foreground">
              {t('recommendations.allOptimal')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            {t('dataContent.tabs.recommendations')} ({filteredRecommendations.length})
          </CardTitle>
          <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value as typeof filterCategory)}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('recommendations.filters.all')}
              </SelectItem>
              <SelectItem value="best">
                {t('recommendations.filters.best')}
              </SelectItem>
              <SelectItem value="new">
                {t('recommendations.filters.new')}
              </SelectItem>
              <SelectItem value="old">
                {t('recommendations.filters.old')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {t('recommendations.description')}
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-dashed divide-gray-200">
          {filteredRecommendations.map(rec => (
            <RecommendationRow key={`${rec.song.songId}-${rec.song.difficulty}`} recommendation={rec} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 