"use client";

import { Flag, Ship } from "lucide-react";
import { useTranslations } from "next-intl";

import { Region } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select-friendly";

interface RegionSwitcherProps {
  value: Region;
  onChange: (region: Region) => void;
}

export function RegionSwitcher({ value, onChange }: RegionSwitcherProps) {
  const t = useTranslations();

  const getRegionCode = (region: Region) => {
    switch (region) {
      case "intl":
        return t('regions.intl');
      case "jp":
        return t('regions.jp');
    }
  };

  const getRegionCodeShort = (region: Region) => {
    switch (region) {
      case "intl":
        return t('regions.short.intl');
      case "jp":
        return t('regions.short.jp');
    }
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger variant="secondary" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="intl">
          <div className="flex items-center justify-between gap-2 whitespace-nowrap">
            <Ship className="h-4 w-4" />
            {t('regions.intl')}
          </div>
        </SelectItem>
        <SelectItem value="jp">
          <div className="flex items-center justify-between gap-2 whitespace-nowrap">
            <Flag className="h-4 w-4" />
            {t('regions.jp')}
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
} 