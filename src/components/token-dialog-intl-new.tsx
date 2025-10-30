"use client";

import { useState, useRef, useLayoutEffect, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Key, Cookie, Lock, Save, ChevronRight, Copy, Smartphone, Monitor, LogIn, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import React from "react";
import { trpc } from "@/lib/trpc-client";
import { useFetchSession } from "@/hooks/useFetchSession";

interface TokenDialogIntlNewProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate: (token: string) => Promise<void>;
}

interface TokenSubDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onTokenChange: (token: string) => void;
  isValidToken: (token: string) => boolean;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

interface PasswordSubDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  showPassword: boolean;
  onShowPasswordChange: (show: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

type Step = 1 | 2 | 3;

interface StepContent {
  icon: React.ReactNode;
  title: string;
}

const STEPS: Record<Step, StepContent> = {
  1: {
    icon: <LogIn className="h-6 w-6" />,
    title: "Login to maimaidx",
  },
  2: {
    icon: <AlertCircle className="h-6 w-6" />,
    title: "Go to Not Found page",
  },
  3: {
    icon: <Cookie className="h-6 w-6" />,
    title: "Execute Code",
  },
};

function CopyableCodeBlock({ code, label }: { code: string; label?: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div
      onClick={handleCopy}
      className="cursor-pointer p-3 bg-gray-200/70 dark:bg-gray-700/50 rounded-md text-sm font-mono text-muted-foreground break-all hover:bg-gray-300/70 dark:hover:bg-gray-600/50 transition-colors flex items-start gap-2 group"
    >
      <div className="flex-1 pt-0.5">{code}</div>
      <Copy className="h-4 w-4 mt-0.75 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function StepBasedTokenDialog({
  isOpen,
  onOpenChange,
  token,
  onTokenChange,
  isValidToken,
  isSubmitting,
  onSubmit,
}: TokenSubDialogProps) {
  const t = useTranslations();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [showManualInput, setShowManualInput] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const canSubmit = token.trim().length > 0 && isValidToken(token.trim()) && !isSubmitting;

  const {
    data: loginOtpData,
    isLoading: loginOtpLoading,
    refetch: refetchLoginOtp,
  } = trpc.user.getLoginOtp.useQuery(undefined, {
    enabled: isOpen && !showManualInput,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setDirection(1);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (contentRef.current) {
      setMeasuredHeight(contentRef.current.offsetHeight);
    }
  }, [currentStep, loginOtpData, showManualInput]);

  const scriptBookmarklet = useMemo(() => {
    if (!loginOtpData) {
      return "Generating secure script link...";
    }
    const scriptUrl = loginOtpData.scriptUrl;
    return `javascript:void(function(d){var s=d.createElement("script");s.src="${scriptUrl}";d.body.append(s)}(document))`;
  }, [loginOtpData]);

  const loginLink = loginOtpData?.loginLink ?? "Generating personalized link...";
  const otpValue = loginOtpData?.otp ?? "------";
  const otpExpiry = useMemo(() => {
    if (!loginOtpData?.expiresAt) {
      return null;
    }
    try {
      return new Date(loginOtpData.expiresAt).toLocaleTimeString();
    } catch {
      return null;
    }
  }, [loginOtpData]);

  const handleNext = () => {
    if (currentStep < 3) {
      setDirection(1);
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCurrentStep(1);
      setShowManualInput(false);
      onOpenChange(false);
    }
  };

  if (showManualInput) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose} modal={false}>
        <DialogContent className="sm:max-w-md shadow">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Cookie className="h-5 w-5" />
              <span>{t('tokenDialog.tokenTab')}</span>
            </DialogTitle>
            <DialogDescription>
              Enter your browser token to authenticate
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">{t('tokenDialog.cookies')}</Label>
              <div className="relative">
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => onTokenChange(e.target.value)}
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

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowManualInput(false)}
              >
                Back to Steps
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!canSubmit}
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
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} modal={false}>
      <DialogContent className="sm:max-w-md shadow">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Cookie className="h-5 w-5" />
            <span>{t('tokenDialog.tokenTab')}</span>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-md font-bold">
              {currentStep}
            </div>
            <span className="font-medium text-foreground tracking-tight">{STEPS[currentStep].title}</span>
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={false}
          className="relative overflow-hidden"
          animate={{ height: measuredHeight ?? "auto" }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <AnimatePresence initial={false}>
            {currentStep === 1 && (
              <motion.div
                key="step1"
                ref={contentRef}
                initial={{ opacity: 0, x: 60 * direction }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 * direction, position: "absolute", top: 0, left: 0, right: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <p className="text-sm text-foreground">
                    Login to maimaidx in an <span className="font-medium">incognito / private window</span>.
                  </p>
                  <p className="text-xs text-muted-foreground">Click the link below to copy to clipboard:</p>
                  <CopyableCodeBlock code="https://maimaidx-eng.com/" />
                </div>

                <div className="text-sm text-foreground mb-0">
                  Have your own cookies already?
                </div>
                <Button variant="ghost" className="cursor-pointer px-0" size="sm" onClick={() => setShowManualInput(true)}>Enter it directly</Button>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                ref={contentRef}
                initial={{ opacity: 0, x: 60 * direction }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 * direction, position: "absolute", top: 0, left: 0, right: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <p className="text-sm text-foreground">
                    Visit this link below, in the same incognito / private tab.
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>OTP: <span className="font-mono font-semibold text-foreground">{otpValue}</span></span>
                    {otpExpiry && (
                      <span>Expires ~ {otpExpiry}</span>
                    )}
                  </div>
                  <CopyableCodeBlock code={loginLink} />
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => { void refetchLoginOtp(); }}
                      disabled={loginOtpLoading}
                    >
                      {loginOtpLoading ? "Refreshing..." : "Refresh OTP"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                ref={contentRef}
                initial={{ opacity: 0, x: 60 * direction }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 * direction, position: "absolute", top: 0, left: 0, right: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  {/* Desktop Section */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-md">Desktop</span>
                    <Monitor className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Copy the JavaScript code below and paste it in your browser's developer console (Ctrl + Shift + I or F12).
                  </p>
                  {/* Mobile Section */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-md">Mobile</span>
                    <Smartphone className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>1. Tap the code below to copy to clipboard.</p>
                    <p>2. Create a bookmark in your browser and paste the copied text in the URL field.</p>
                    <p>3. Run the bookmark.</p>
                  </div>
                  <CopyableCodeBlock code={scriptBookmarklet} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1}
          >
            Previous Step
          </Button>
          <Button
            onClick={handleNext}
            disabled={currentStep === 3}
          >
            Next Step
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PasswordSubDialog({
  isOpen,
  onOpenChange,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  showPassword,
  onShowPasswordChange,
  isSubmitting,
  onSubmit,
}: PasswordSubDialogProps) {
  const t = useTranslations();
  const canSubmit = username.trim().length > 0 && password.trim().length > 0 && !isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-md shadow">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>{t('tokenDialog.passwordTab')}</span>
          </DialogTitle>
          <DialogDescription>
            Enter your SEGA account credentials
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('tokenDialog.username')}</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
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
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder={t('tokenDialog.passwordPlaceholder')}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => onShowPasswordChange(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-md text-xs text-muted-foreground space-y-2">
            <p className="font-medium">
              {t('tokenDialog.authenticationNote')}
            </p>
            <p>{t('tokenDialog.passwordInstructions')}</p>
            <p>{t('tokenDialog.secureStorage')}</p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit}
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
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TokenDialogIntlNew({
  isOpen,
  onClose,
  onTokenUpdate,
}: TokenDialogIntlNewProps) {
  const t = useTranslations();
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use fetch session hook for polling new sessions
  const { startSessionPolling, stopSessionPolling } = useFetchSession();

  // Validate token format: clal= followed by alphanumeric characters
  const isValidToken = (tokenValue: string) => {
    const tokenRegex = /^clal=[a-zA-Z0-9]+$/;
    return tokenRegex.test(tokenValue);
  };

  const handleClose0 = () => {
    setToken("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setIsTokenDialogOpen(false);
    setIsPasswordDialogOpen(false);
    onClose();
  };

  const handleClose = () => {
    // Don't close if subdialogs are open
    if (isTokenDialogOpen || isPasswordDialogOpen) {
      return;
    }
    
    handleClose0();
  };

  // Start/stop session polling when token dialog opens/closes
  useEffect(() => {
    if (isTokenDialogOpen) {
      // Start polling for new sessions (intl region)
      startSessionPolling("intl", () => {
        // When new session detected, close all dialogs
        handleClose0();
      });
    } else {
      // Stop polling when dialog closes
      stopSessionPolling();
    }

    return () => {
      stopSessionPolling();
    };
  }, [isTokenDialogOpen]);

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim() || !isValidToken(token.trim())) return;
    const finalToken = `cookie://${token.trim()}`;

    setIsSubmitting(true);
    try {
      await onTokenUpdate(finalToken);
      setToken("");
      handleClose0();
    } catch (error) {
      console.error("Token update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) return;
    const finalToken = `account://${username.trim()}:://${password.trim()}`;

    setIsSubmitting(true);
    try {
      await onTokenUpdate(finalToken);
      setUsername("");
      setPassword("");
      handleClose0();
    } catch (error) {
      console.error("Token update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Main Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={cn("sm:max-w-md transition-[opacity,scale] duration-200", isTokenDialogOpen || isPasswordDialogOpen ? "opacity-70 scale-95" : "")}>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>{t('tokenDialog.title')}</span>
            </DialogTitle>
            <DialogDescription>
              {t('tokenDialog.intlDescription')} {t('tokenDialog.credentialsStored')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {/* Token Option - Recommended */}
            <button
              onClick={() => setIsTokenDialogOpen(true)}
              className="w-full p-4 border-2 rounded-lg hover:border-primary hover:bg-accent/50 transition-all text-left group"
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
              onClick={() => setIsPasswordDialogOpen(true)}
              className="w-full p-4 border-2 rounded-lg hover:border-primary hover:bg-accent/50 transition-all text-left group"
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
        </DialogContent>
      </Dialog>

      {/* Token Dialog - Nested */}
      <StepBasedTokenDialog
        isOpen={isTokenDialogOpen}
        onOpenChange={setIsTokenDialogOpen}
        token={token}
        onTokenChange={setToken}
        isValidToken={isValidToken}
        isSubmitting={isSubmitting}
        onSubmit={handleTokenSubmit}
      />

      {/* Password Dialog - Nested */}
      <PasswordSubDialog
        isOpen={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        username={username}
        onUsernameChange={setUsername}
        password={password}
        onPasswordChange={setPassword}
        showPassword={showPassword}
        onShowPasswordChange={setShowPassword}
        isSubmitting={isSubmitting}
        onSubmit={handlePasswordSubmit}
      />
    </>
  );
}
