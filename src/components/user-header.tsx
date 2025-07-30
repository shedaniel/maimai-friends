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
import { LogOut, Settings, User as UserIcon, Info, Users } from "lucide-react";
import Image from "next/image";
import { RegionSwitcher } from "@/components/region-switcher";
import { Region, User } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AboutDialog } from "@/components/about-dialog";
import { InvitesDialog } from "@/components/invites-dialog";
import { DiscordIcon } from "@/components/ui/discord-icon";
import { toast } from "sonner";

const SIGNUP_TYPE = process.env.NEXT_PUBLIC_ACCOUNT_SIGNUP_TYPE || 'disabled';
const APPLICATION_ID = process.env.NEXT_PUBLIC_DISCORD_APPLICATION_ID;

interface UserHeaderProps {
  user: User;
  selectedRegion: Region;
  onRegionChange: (region: Region) => void;
  onLogout: () => void;
  onSettings: () => void;
}

export function UserHeader({ user, selectedRegion, onRegionChange, onLogout, onSettings }: UserHeaderProps) {
  const t = useTranslations();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  
  const handleDiscordInvite = async () => {
    try {
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${APPLICATION_ID}&scope=applications.commands`;
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Copied Discord Bot Invite Link");
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error("Failed to copy invite link");
    }
  };
  
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-1">
          <div className="whitespace-nowrap pr-2">
            <h1 className="text-lg leading-none font-semibold">tomomai ともマイ</h1>
            <p className="text-muted-foreground text-xs">by shedaniel</p>
          </div>
          <Button 
            onClick={() => setAboutOpen(true)} 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-200"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button 
            onClick={handleDiscordInvite} 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-200"
          >
            <DiscordIcon className="h-4 w-4" />
          </Button>
        </div>
      
      <div className="flex items-center space-x-4">
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
                              <UserIcon className="h-5 w-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {t('userHeader.memberLabel')}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SIGNUP_TYPE === 'invite-only' && (
            <>
              <DropdownMenuItem onClick={() => setInvitesOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                <span>{t('common.invitations')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onSettings}>
            <Settings className="mr-2 h-4 w-4" />
            <span>{t('common.settings')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('common.logout')}</span>
          </DropdownMenuItem>
                 </DropdownMenuContent>
       </DropdownMenu>
      </div>
    </div>
    
    <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    <InvitesDialog isOpen={invitesOpen} onClose={() => setInvitesOpen(false)} />
  </>
  );
} 