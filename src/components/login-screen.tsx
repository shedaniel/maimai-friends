"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const SIGNUP_ENABLED = process.env.NEXT_PUBLIC_SIGNUP_ENABLED === 'true';

interface LoginScreenProps {
  onAuth: () => void;
}

export function LoginScreen({ onAuth }: LoginScreenProps) {
  const t = useTranslations();
  const [isSignupMode, setIsSignupMode] = useState(false);

  return (
    <div className="container mx-auto max-w-md mt-8 px-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <Database className="h-6 w-6" />
            <span>{t('dashboard.title')}</span>
          </CardTitle>
          <CardDescription>
            {t('dashboard.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            {!isSignupMode ? (
              // Login Mode
              <>
                <p className="text-sm text-muted-foreground">
                  {t('auth.loginDescription')}
                </p>
                
                <Button 
                  onClick={onAuth} 
                  className="w-full"
                  size="lg"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  {t('auth.loginWithDiscord')}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.noAccount')}{" "}
                    <button 
                      onClick={() => setIsSignupMode(true)}
                      className="text-primary hover:underline font-medium"
                      disabled={!SIGNUP_ENABLED}
                    >
                      {t('auth.signupWithDiscord')}
                    </button>
                  </p>
                </div>
              </>
            ) : (
              // Signup Mode
              <>
                <p className="text-sm text-muted-foreground">
                  {t('auth.signupDescription')}
                </p>

                {!SIGNUP_ENABLED && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-md text-sm">
                    <p className="font-medium">{t('auth.signupDisabled')}</p>
                    <p className="text-xs mt-1">{t('auth.signupDisabledMessage')}</p>
                  </div>
                )}
                
                <Button 
                  onClick={onAuth} 
                  className="w-full"
                  size="lg"
                  disabled={!SIGNUP_ENABLED}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  {t('auth.signupWithDiscord')}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.haveAccount')}{" "}
                    <button 
                      onClick={() => setIsSignupMode(false)}
                      className="text-primary hover:underline font-medium"
                    >
                      {t('auth.loginToAccount')}
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
          
          <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground">
            <p className="font-medium mb-1">{t('auth.features.title')}</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>{t('auth.features.trackScores')}</li>
              <li>{t('auth.features.viewHistory')}</li>
              <li>{t('auth.features.importData')}</li>
              <li>{t('auth.features.analyzeProgress')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 