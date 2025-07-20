"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import Image from "next/image";
import { RegionSwitcher, Region } from "@/components/region-switcher";

interface User {
  name?: string | null;
  image?: string | null;
}

interface UserHeaderProps {
  user: User;
  selectedRegion: Region;
  onRegionChange: (region: Region) => void;
  onLogout: () => void;
}

export function UserHeader({ user, selectedRegion, onRegionChange, onLogout }: UserHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-3">
        <div>
          <h1 className="text-lg leading-none font-semibold">maimai charts</h1>
          <p className="text-muted-foreground text-xs">by shedaniel</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <RegionSwitcher value={selectedRegion} onChange={onRegionChange} />
        
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-background data-[state=open]:ring-2 data-[state=open]:ring-gray-300 data-[state=open]:ring-offset-2 data-[state=open]:ring-offset-background">
            {user.image ? (
              <Image 
                src={user.image} 
                alt="Profile"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <User className="h-5 w-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                maimai charts user
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
                 </DropdownMenuContent>
       </DropdownMenu>
      </div>
    </div>
  );
} 