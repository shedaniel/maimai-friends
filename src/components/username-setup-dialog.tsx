"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc-client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface UsernameSetupDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function UsernameSetupDialog({ isOpen, onComplete }: UsernameSetupDialogProps) {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available?: boolean;
    error?: string;
  }>({});

  // Get suggested username
  const { data: suggestedData } = trpc.user.getSuggestedUsername.useQuery(
    undefined,
    { enabled: isOpen }
  );

  // Set/update username mutation
  const setUsernameMutation = trpc.user.setUsername.useMutation({
    onSuccess: () => {
      toast.success('Username set successfully!');
      onComplete();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Check username availability mutation
  const checkAvailability = trpc.user.checkUsernameAvailability.useQuery(
    { username },
    {
      enabled: username.length > 0,
      refetchOnWindowFocus: false,
    }
  );

  // Update availability state when check completes
  useEffect(() => {
    if (checkAvailability.data) {
      setAvailability(checkAvailability.data);
      setIsChecking(false);
    } else if (checkAvailability.error) {
      setAvailability({
        available: false,
        error: checkAvailability.error.message,
      });
      setIsChecking(false);
    } else if (checkAvailability.isLoading && username.length > 0) {
      setIsChecking(true);
    }
  }, [checkAvailability.data, checkAvailability.error, checkAvailability.isLoading, username]);

  // Set suggested username when data loads
  useEffect(() => {
    if (suggestedData?.suggestedUsername && !username) {
      setUsername(suggestedData.suggestedUsername);
    }
  }, [suggestedData, username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    if (!availability.available) {
      toast.error('Please choose an available username');
      return;
    }

    setUsernameMutation.mutate({ username: username.trim() });
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setIsChecking(value.length > 0);
    setAvailability({});
  };

  const getAvailabilityIcon = () => {
    if (username.length === 0) return null;
    if (isChecking) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
    if (availability.available === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (availability.available === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getAvailabilityMessage = () => {
    if (username.length === 0) return null;
    if (isChecking) return <span className="text-sm text-gray-500">Checking availability...</span>;
    if (availability.available === true) return <span className="text-sm text-green-600">Username is available!</span>;
    if (availability.error) return <span className="text-sm text-red-600">{availability.error}</span>;
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Choose Your Username</DialogTitle>
          <DialogDescription>
            You need to set a username to use this app. This will be used for your public profile URL and must be unique.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="Enter your username"
                className="pr-10"
                maxLength={32}
                autoComplete="off"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getAvailabilityIcon()}
              </div>
            </div>
            {getAvailabilityMessage()}
            <div className="text-xs text-gray-500 space-y-1">
              <p>• 1-32 characters long</p>
              <p>• Letters, numbers, dashes (-), and underscores (_) only</p>
              <p>• Will be used in your profile URL: /profile/{username}</p>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="submit"
              disabled={
                !username.trim() ||
                !availability.available ||
                isChecking ||
                setUsernameMutation.isPending
              }
            >
              {setUsernameMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting Username...
                </>
              ) : (
                'Set Username'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 