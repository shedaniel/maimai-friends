"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Key, Save } from "lucide-react";
import { Region } from "@/lib/types";

interface TokenDialogProps {
  region: Region;
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate: (token: string) => Promise<void>;
}

export function TokenDialog({
  region,
  isOpen,
  onClose,
  onTokenUpdate,
}: TokenDialogProps) {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState<"token" | "password">(region === "jp" ? "password" : "token");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate token format: clal= followed by alphanumeric characters
  const isValidToken = (tokenValue: string) => {
    const tokenRegex = /^clal=[a-zA-Z0-9]+$/;
    return tokenRegex.test(tokenValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalToken = "";
    if (authMethod === "token") {
      if (!token.trim() || !isValidToken(token.trim())) return;
      finalToken = `cookie://${token.trim()}`;
    } else {
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
      onClose();
    } catch (error) {
      console.error("Token update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = authMethod === "token" 
    ? token.trim().length > 0 && isValidToken(token.trim()) && !isSubmitting
    : username.trim().length > 0 && password.trim().length > 0 && !isSubmitting;

  const isJapanRegion = region === "jp";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Update maimai authentication</span>
          </DialogTitle>
          <DialogDescription>
            {isJapanRegion 
              ? "Enter your SEGA account credentials for the Japan region."
              : "Choose your authentication method for the International region."
            } Your credentials will be saved for future use.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isJapanRegion ? (
            // Japan region: Password only
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your SEGA account username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your SEGA account password"
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

              <div className="bg-muted/50 rounded-md text-xs text-muted-foreground">
                <p className="font-medium mb-1">
                  Authentication:
                </p>
                <p>Use your SEGA account credentials to authenticate with maimai DX NET Japan.</p>
                <p>Your credentials will be stored securely for future fetches.</p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent mr-2" />
                    Saving Credentials...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Credentials
                  </>
                )}
              </Button>
            </form>
          ) : (
            // International region: Tabs with Token and Password options
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs className="w-full" value={authMethod} onValueChange={(value) => setAuthMethod(value as "token" | "password")}>
                <TabsList className="bg-gray-200 grid w-full grid-cols-2">
                  <TabsTrigger value="token">Token</TabsTrigger>
                  <TabsTrigger value="password">Password</TabsTrigger>
                </TabsList>

                <TabsContent value="token" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="token">Cookies</Label>
                    <div className="relative">
                      <Input
                        id="token"
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="clal=your_token_here"
                        className={`${token && !isValidToken(token) ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {token && !isValidToken(token) && (
                      <p className="text-xs text-red-500">
                        Token must start with "clal=" followed by letters and numbers only
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="password" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your SEGA account username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your SEGA account password"
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
                </TabsContent>
              </Tabs>

                <div className="bg-muted/50 rounded-md text-xs text-muted-foreground">
                  <p className="font-medium mb-1">
                    Authentication:
                  </p>
                  <ul className="space-y-1 list-disc list-outside pl-4">
                    <li>
                      <strong>Token:</strong> Cookie value starting with "clal=" from maimai DX NET.
                      <p className="mb-2">The token may get invalidated after a certain period of time, so you may need to update it in the future.</p>
                      <p>For easier cookie extraction, first install this <a className="underline text-blue-600" href="/maimai-cookie-extractor.user.js" target="_blank" rel="noopener noreferrer">userscript</a> (requires Tampermonkey/Greasemonkey).</p>
                      <p>Then, <a className="underline text-blue-600" href="https://lng-tgk-aime-gw.am-all.net/common_auth/login?site_id=maimaidxex&redirect_url=https://maimaidx-eng.com/maimai-mobile/&back_url=https://maimai.sega.com/" target="_blank" rel="noopener noreferrer">visit this link</a> in incognito mode and login to anime.</p>
                      <p>Finally, <a className="underline text-blue-600" href="https://lng-tgk-aime-gw.am-all.net/common_auth" target="_blank" rel="noopener noreferrer">visit this link</a>, you will see "Not Found", click the "Copy maimai cookie" button on top right and paste the cookie into the input field above.</p>
                    </li>
                    <li>
                      <strong>Password:</strong> Use your SEGA account username and password directly
                    </li>
                  </ul>
                  <p className="mt-2">Your credentials will be stored securely for future fetches.</p>
                </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent mr-2" />
                    Saving Credentials...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Credentials
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 