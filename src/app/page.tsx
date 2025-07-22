"use client";

import { useSession, signIn } from "@/lib/auth-client";
import { LoginScreen } from "@/components/login-screen";
import { Dashboard } from "@/components/dashboard";
import { toast } from "sonner";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function HomeContent() {
  const { data: session, isPending } = useSession();
  const searchParams = useSearchParams();

  // Handle Better Auth error redirects and invitation success
  useEffect(() => {
    const error = searchParams.get('error');
    const isSignupError = error === 'unable_to_create_user';
    const isAuthError = error === 'auth_error';
    
    if (isSignupError) {
      toast.error("Sign up is currently disabled. Only existing users can log in.");
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    } else if (isAuthError) {
      toast.error("An error occurred during authentication. Please try again.");
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    } else if (session) {
      // Check if there's a pending invitation that was just used
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      if (cookies.pendingInviteCode) {
        // Clear the pending invitation cookie
        document.cookie = 'pendingInviteCode=; path=/; max-age=0';
        toast.success("Welcome! Your invitation has been claimed successfully.");
      }
    }
  }, [searchParams, session]);

  const handleDiscordAuth = async () => {
    try {
      await signIn.social({
        provider: "discord",
        callbackURL: "/",
        errorCallbackURL: "/",
      });
    } catch (error) {
      console.error("Discord auth error:", error);
      toast.error("An error occurred during authentication. Please try again.");
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onAuth={handleDiscordAuth} />;
  }

  return <Dashboard user={session.user} />;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[100dvh]">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
