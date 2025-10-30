"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Key, Cookie, Lock, Save, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface TokenDialogIntlNewProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate: (token: string) => Promise<void>;
}

type AuthStep = "select" | "token" | "password";

export function TokenDialogIntlNew({
  isOpen,
  onClose,
  onTokenUpdate,
}: TokenDialogIntlNewProps) {
  const t = useTranslations();
  const [step, setStep] = useState<AuthStep>("select");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate token format: clal= followed by alphanumeric characters
  const isValidToken = (tokenValue: string) => {
    const tokenRegex = /^clal=[a-zA-Z0-9]+$/;
    return tokenRegex.test(tokenValue);
  };

  const handleClose = () => {
    setStep("select");
    setToken("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    onClose();
  };

  const handleBack = () => {
    setStep("select");
    setToken("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalToken = "";
    if (step === "token") {
      if (!token.trim() || !isValidToken(token.trim())) return;
      finalToken = `cookie://${token.trim()}`;
    } else if (step === "password") {
      if (!username.trim() || !password.trim()) return;
      finalToken = `account://${username.trim()}:://${password.trim()}`;
    }

    setIsSubmitting(true);
    try {
      await onTokenUpdate(finalToken);
      // Clear form after successful update
      setToken("");
      setUsername("");
      setPassword("");
      handleClose();
    } catch (error) {
      console.error("Token update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmitToken = token.trim().length > 0 && isValidToken(token.trim()) && !isSubmitting;
  const canSubmitPassword = username.trim().length > 0 && password.trim().length > 0 && !isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>{t('tokenDialog.title')}</span>
              </DialogTitle>
              <DialogDescription>
                {t('tokenDialog.intlDescription')} {t('tokenDialog.credentialsStored')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 pt-4">
              {/* Token Option - Recommended */}
              <button
                onClick={() => setStep("token")}
                className="w-full p-4 border-2 rounded-lg hover:border-primary hover:bg-accent/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-1 p-2 rounded-md bg-primary/10">
                    <Cookie className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-base">{t('tokenDialog.tokenTab')}</span>
                      <Badge variant="default">
                        Recommended
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Login to your maimaidx account with your browser tokens. Token may expire from time to time. No password required and supports social logins.
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                </div>
              </button>

              {/* Password Option */}
              <button
                onClick={() => setStep("password")}
                className="w-full p-4 border-2 rounded-lg hover:border-primary hover:bg-accent/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-1 p-2 rounded-md bg-primary/10">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-base">{t('tokenDialog.passwordTab')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Login to your maimaidx account with your SEGA account credentials. Never expire. Not recommended.
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                </div>
              </button>
            </div>
          </>
        ) : step === "token" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Cookie className="h-5 w-5" />
                <span>{t('tokenDialog.tokenTab')}</span>
              </DialogTitle>
              <DialogDescription>
                Enter your browser token to authenticate
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">{t('tokenDialog.cookies')}</Label>
                <div className="relative">
                  <Input
                    id="token"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={t('tokenDialog.tokenPlaceholder')}
                    className={`${token && !isValidToken(token) ? 'border-red-500' : ''}`}
                  />
                </div>
                {token && !isValidToken(token) && (
                  <p className="text-xs text-red-500">
                    {t('tokenDialog.tokenValidationError')}
                  </p>
                )}
              </div>

              <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium">
                  {t('tokenDialog.authenticationNote')}
                </p>
                <p>{t('tokenDialog.tokenInstructions.description')}</p>
                <p>{t('tokenDialog.tokenInstructions.expiration')}</p>
                <div className="space-y-1 pt-2">
                  <p>For easier cookie extraction, first install this <a className="underline text-blue-600" href="/maimai-cookie-extractor.user.js" target="_blank" rel="noopener noreferrer">userscript</a> (requires Tampermonkey/Greasemonkey).</p>
                  <p>Then, <a className="underline text-blue-600" href="https://lng-tgk-aime-gw.am-all.net/common_auth/login?site_id=maimaidxex&redirect_url=https://maimaidx-eng.com/maimai-mobile/&back_url=https://maimai.sega.com/" target="_blank" rel="noopener noreferrer">visit this link</a> in incognito mode and login to aime.</p>
                  <p>Finally, <a className="underline text-blue-600" href="https://lng-tgk-aime-gw.am-all.net/common_auth" target="_blank" rel="noopener noreferrer">visit this link</a>, you will see &quot;Not Found&quot;, click the &quot;Copy maimai cookie&quot; button on top right and paste the cookie into the input field above.</p>
                </div>
                <p className="pt-2">{t('tokenDialog.secureStorage')}</p>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!canSubmitToken}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent mr-2" />
                      {t('tokenDialog.savingCredentials')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('tokenDialog.saveCredentials')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>{t('tokenDialog.passwordTab')}</span>
              </DialogTitle>
              <DialogDescription>
                Enter your SEGA account credentials
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t('tokenDialog.username')}</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('tokenDialog.usernamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('tokenDialog.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('tokenDialog.passwordPlaceholder')}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium">
                  {t('tokenDialog.authenticationNote')}
                </p>
                <p>{t('tokenDialog.passwordInstructions')}</p>
                <p>{t('tokenDialog.secureStorage')}</p>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!canSubmitPassword}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent mr-2" />
                      {t('tokenDialog.savingCredentials')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('tokenDialog.saveCredentials')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

