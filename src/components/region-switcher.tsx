"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export type Region = "intl" | "jp";

interface RegionSwitcherProps {
  value: Region;
  onChange: (region: Region) => void;
  children?: React.ReactNode;
}

export function RegionSwitcher({ value, onChange, children }: RegionSwitcherProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(value) => onChange(value as Region)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="intl">
          International
        </TabsTrigger>
        <TabsTrigger value="jp" className="relative">
          Japan
          <Badge variant="warning" className="ml-2 text-xs">
            WIP
          </Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value={value} className="mt-4">
        {children}
      </TabsContent>
    </Tabs>
  );
} 