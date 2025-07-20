"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, Settings, Save } from "lucide-react";
import { Region } from "./region-switcher";

interface DataFetcherProps {
  region: Region;
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate: (token: string) => Promise<void>;
}

export function DataFetcher({
  region,
  isOpen,
  onClose,
  onTokenUpdate,
}: DataFetcherProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsSubmitting(true);
    try {
      await onTokenUpdate(token.trim());
      setToken(""); // Clear token after successful update
      onClose(); // Close dialog after successful update
    } catch (error) {
      console.error("Token update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = token.trim().length > 0 && !isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Update Maimai Token</span>
          </DialogTitle>
          <DialogDescription>
            Enter a new token or update your existing token for the {region === "intl" ? "International" : "Japan"} region.
            This token will be saved for future use.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Token Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Maimai Token</Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter your maimai token"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your token will be encrypted and stored securely for future fetches.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent mr-2" />
                  Saving Token...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Token
                </>
              )}
            </Button>
          </form>

          {/* Instructions */}
          <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground">
            <p className="font-medium mb-1">How to get your token:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Log into maimai DX NET</li>
              <li>Go to your browser&apos;s developer tools</li>
              <li>Find the authentication token in the Network tab</li>
              <li>Copy and paste it here</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 