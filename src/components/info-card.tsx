"use client";

import { Card, CardContent } from "@/components/ui/card";
import { getRatingImageUrl } from "@/lib/rating-calculator";
import { SnapshotWithSongs } from "@/lib/types";
import { createSafeMaimaiImageUrl } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

function RatingImage({ rating }: { rating: number }) {
  return (
    <Image src={createSafeMaimaiImageUrl(getRatingImageUrl(rating))} alt={rating.toString()} width={120} height={35} crossOrigin="anonymous" />
  );
}

export function InfoCard({ 
  selectedSnapshotData, 
  showPlayCounts = true,
  visitableProfileAt,
}: { 
  selectedSnapshotData: SnapshotWithSongs; 
  showPlayCounts?: boolean;
  visitableProfileAt: string | null;
}) {
  const t = useTranslations();

  const { snapshot } = selectedSnapshotData;

  return (
    <Card>
      <CardContent>
        {/* Profile Visibility Banner */}
        <div className="mb-6 p-4 rounded-md bg-muted ring-2 ring-offset-2 ring-offset-card ring-primary/20">
          {visitableProfileAt ? (
            <div>
              <h3 className="font-medium mb-1 text-primary">Public Profile</h3>
              <p className="text-sm text-muted-foreground">
                Accessible by{" "}
                <Link 
                  href={`/profile/${visitableProfileAt}`} 
                  className="text-primary hover:text-primary/80 underline"
                >
                  https://tomomai.lol/profile/{visitableProfileAt}
                </Link>
                ! You may change your privacy settings in top right Icon → Settings → Publish Profile.
              </p>
            </div>
          ) : (
            <div>
              <h3 className="font-medium mb-1 text-primary">Private Profile</h3>
              <p className="text-sm text-muted-foreground">
                Only accessible by you! You may change your privacy settings in top right Icon → Settings → Publish Profile.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          <Image src={createSafeMaimaiImageUrl(snapshot.iconUrl)} alt={snapshot.title} width={80} height={80} />
          <div className="flex flex-col min-w-0 self-stretch my-1 space-y-0.5 items-stretch">
            <span className="text-sm text-muted-foreground bg-gray-100 rounded-full px-6 py-1 text-center inset-shadow-sm truncate">{snapshot.title}</span>
            <span className="text-lg font-medium flex items-center self-center max-xs:flex-col">
              <span className="mx-4 flex-1 whitespace-nowrap max-xs:text-md max-2xs:text-sm">{snapshot.displayName}</span>
              <div className="shrink-0 grow-0 min-w-fit w-[120px] h-[35px] relative">
                <RatingImage rating={snapshot.rating} />
                <span className="absolute top-[3px] left-[8px] w-[106px] h-[21px] tracking-[1.65px] text-right text-[18px] text-white box-border font-normal font-mono">{snapshot.rating}</span>
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