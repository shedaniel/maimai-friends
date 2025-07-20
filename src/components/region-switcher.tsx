"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Globe, Flag } from "lucide-react";
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
        return "IN";
      case "jp":
        return "JP";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-white">
          <Globe className="h-4 w-4" />
          {getRegionCode(value)}
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
          className={`${value === "jp" ? "bg-accent" : ""} flex items-center justify-between`}
        >
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            <span>{t('regions.jp')}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {t('regions.wip')}
          </Badge>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 