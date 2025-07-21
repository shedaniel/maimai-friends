"use client";

import { Region, SnapshotWithSongs } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Disc, Heart, Image, Loader2, Map, Music, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { InfoCard } from "./info-card";
import { SongsCard } from "./songs-card";
import { PlatesCard } from "./plates-card";

interface DataContentProps {
  region: Region;
  selectedSnapshotData: SnapshotWithSongs | null;
  isLoading: boolean;
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
        name: t('dataContent.tabs.recommendations'),
        value: "recommendations",
        icon: Heart,
      },
      {
        name: t('dataContent.tabs.plates'),
        value: "plates",
        icon: Disc,
      },
      {
        name: t('dataContent.tabs.map'),
        value: "map",
        icon: Map,
      },
      {
        name: t('dataContent.tabs.exportImage'),
        value: "exportImage",
        icon: Image,
      }
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
        <TabsContent value="recommendations" className="mt-0 flex-1 min-w-0">

        </TabsContent>
        <TabsContent value="plates" className="mt-0 flex-1 min-w-0">
          <PlatesCard selectedSnapshotData={selectedSnapshotData} region={region} />
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