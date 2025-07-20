"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Globe } from "lucide-react";

export type Region = "intl" | "jp";

interface RegionSwitcherProps {
  value: Region;
  onChange: (region: Region) => void;
}

export function RegionSwitcher({ value, onChange }: RegionSwitcherProps) {
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
          className={value === "intl" ? "bg-accent" : ""}
        >
          International
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("jp")}
          className={`${value === "jp" ? "bg-accent" : ""} justify-between`}
        >
          <span>Japan</span>
          <Badge variant="secondary" className="text-xs">
            WIP
          </Badge>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 