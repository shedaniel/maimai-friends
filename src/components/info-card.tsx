"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Region, SnapshotWithSongs } from "@/lib/types";
import { createSafeMaimaiImageUrl } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";

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

export function InfoCard({ 
  selectedSnapshotData, 
  region, 
  showPlayCounts = true 
}: { 
  selectedSnapshotData: SnapshotWithSongs; 
  region: Region; 
  showPlayCounts?: boolean;
}) {
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
          <div className={`grid gap-2 text-sm ${showPlayCounts ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>{t('dataContent.rating', { rating: snapshot.rating })}</div>
            <div>{t('dataContent.stars', { stars: snapshot.stars })}</div>
            {showPlayCounts && (
              <>
                <div>{t('dataContent.versionPlays', { count: snapshot.versionPlayCount })}</div>
                <div>{t('dataContent.totalPlays', { count: snapshot.totalPlayCount })}</div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 