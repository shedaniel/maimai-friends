"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Flag, Globe } from "lucide-react";
import { useTranslations } from "next-intl";

import { Region } from "@/lib/types";

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-white">
          <Globe className="h-4 w-4" />
          <span className="sm:hidden">{getRegionCodeShort(value)}</span>
          <span className="max-sm:hidden">{getRegionCode(value)}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onChange("intl")}
          className={`${value === "intl" ? "bg-accent" : ""} flex items-center gap-2`}
        >
          <Globe className="h-4 w-4" />
          {t('regions.intl')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("jp")}
          className={`${value === "jp" ? "bg-accent" : ""} flex items-center gap-2`}
        >
          <Flag className="h-4 w-4" />
          {t('regions.jp')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 