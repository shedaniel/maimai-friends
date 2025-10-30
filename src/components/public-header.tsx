"use client";

import { AboutDialog } from "@/components/about-dialog";
import { Button } from "@/components/ui/button";
import { DiscordIcon } from "@/components/ui/discord-icon";
import { Info, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LocaleSwitcher } from "./locale-switcher";

const APPLICATION_ID = process.env.NEXT_PUBLIC_DISCORD_APPLICATION_ID;

interface PublicHeaderProps {
  profileUsername: string;
}

export function PublicHeader({}: PublicHeaderProps) {
  const t = useTranslations();
  const [aboutOpen, setAboutOpen] = useState(false);
  
  const handleLogin = () => {
    // Redirect to login page
    window.location.href = '/';
  };
  
  const handleDiscordInvite = async () => {
    try {
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${APPLICATION_ID}`;
      window.open(inviteUrl, '_blank');
    } catch (error) {
      console.error('Failed to open invite link:', error);
      toast.error("Failed to open invite link");
    }
  };
  
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-1">
          <div className="whitespace-nowrap pr-2">
            <h1 className="text-lg leading-none font-semibold md:hidden">ともマイ</h1>
            <h1 className="text-lg leading-none font-semibold max-md:hidden">{t('common.title')}</h1>
            <p className="text-muted-foreground text-xs">by shedaniel</p>
          </div>
          <Button
            onClick={() => setAboutOpen(true)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-200 max-sm:hidden"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleDiscordInvite}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-200 max-sm:hidden"
          >
            <DiscordIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <LocaleSwitcher />
          <Button onClick={handleLogin} variant="default">
            <LogIn className="mr-2 h-4 w-4" />
            {t('common.login')}
          </Button>
        </div>
      </div>
      
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
} 