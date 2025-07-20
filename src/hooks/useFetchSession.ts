import { useState } from "react";
import { trpc, trpcClient } from "@/lib/trpc-client";
import { toast } from "sonner";
import { Region, FetchSession } from "@/lib/types";

export function useFetchSession(onFetchComplete?: () => void) {
  const [currentSession, setCurrentSession] = useState<FetchSession | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  // tRPC mutation for starting fetch
  const startFetchMutation = trpc.user.startFetch.useMutation({
    onSuccess: (data, variables) => {
      const session: FetchSession = {
        id: data.sessionId,
        status: "pending",
        startedAt: new Date(),
      };
      setCurrentSession(session);
      setLastFetchTime(new Date());
      setFetchError(null);
      
      // Start polling immediately with the returned session ID
      pollFetchStatus(data.sessionId, variables.region);
    },
    onError: (error) => {
      setFetchError(error.message);
      // Don't set error here - let it bubble up to be caught by the calling component
    },
  });

  // Start data fetch with optional token (if no token, uses saved token)
  const startDataFetch = async (region: Region, token?: string): Promise<void> => {
    setFetchError(null);
    // Let the mutation error bubble up to the caller
    await startFetchMutation.mutateAsync({ region, token });
  };

  // Start automatic fetch using saved token
  const startAutomaticFetch = async (region: Region): Promise<void> => {
    return startDataFetch(region); // No token provided, will use saved token
  };

  const pollFetchStatus = async (sessionId: string, region: Region) => {
    const maxAttempts = 150; // 5 minutes max (300 seconds / 2 seconds = 150 attempts)
    let attempts = 0;

    const poll = async () => {
      try {
        // Query the latest fetch status directly using tRPC client
        const result = await trpcClient.user.getFetchStatus.query({
          region,
        });
        
        if (result && result.id === sessionId) {
          // Only update if this is the session we're tracking
          const updatedSession: FetchSession = {
            id: result.id,
            status: result.status,
            startedAt: result.startedAt,
            completedAt: result.completedAt || undefined,
            errorMessage: result.errorMessage || undefined,
          };
          setCurrentSession(updatedSession);

          if (result.status === "completed") {
            toast.success("Data fetch completed successfully!");
            onFetchComplete?.();
            return "completed";
          } else if (result.status === "failed") {
            const errorMessage = result.errorMessage || "Fetch failed";
            setFetchError(errorMessage);
            toast.error(`Data fetch failed: ${errorMessage}`);
            return "failed";
          }
        } else if (!result) {
          // No fetch sessions found at all
          setFetchError("Fetch session not found");
          return "error";
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          setFetchError("Fetch timeout");
          return "timeout";
        }
      } catch (error) {
        console.error("Error polling fetch status:", error);
        setFetchError("Failed to check fetch status");
        return "error";
      }
    };

    return poll();
  };

  const resetFetchSession = () => {
    setCurrentSession(null);
    setFetchError(null);
  };

  const isFetching = currentSession?.status === "pending" || startFetchMutation.isPending;

  return {
    currentSession,
    fetchError,
    lastFetchTime,
    isFetching,
    startDataFetch,
    startAutomaticFetch,
    resetFetchSession,
  };
} 