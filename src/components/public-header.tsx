"use client";

import { Button } from "@/components/ui/button";
import { LogIn, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AboutDialog } from "@/components/about-dialog";

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
  
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-lg leading-none font-semibold">
              maimai friends
            </h1>
            <p className="text-muted-foreground text-xs">
              by shedaniel
            </p>
          </div>
          <Button 
            onClick={() => setAboutOpen(true)} 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-200"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
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