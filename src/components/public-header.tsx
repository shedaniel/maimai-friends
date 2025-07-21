"use client";

import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useTranslations } from "next-intl";

interface PublicHeaderProps {
  profileUsername: string;
}

export function PublicHeader({ 
  profileUsername
}: PublicHeaderProps) {
  const t = useTranslations();
  
  const handleLogin = () => {
    // Redirect to login page
    window.location.href = '/';
  };
  
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-3">
        <div>
          <h1 className="text-lg leading-none font-semibold">
            maimai friends
          </h1>
          <p className="text-muted-foreground text-xs">
            {profileUsername}&apos;s profile
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <Button onClick={handleLogin} variant="default">
          <LogIn className="mr-2 h-4 w-4" />
          {t('common.login')}
        </Button>
      </div>
    </div>
  );
} 