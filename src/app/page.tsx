"use client";

import { useSession, signIn } from "@/lib/auth-client";
import { LoginScreen } from "@/components/login-screen";
import { Dashboard } from "@/components/dashboard";
import { useState } from "react";

export default function Home() {
  const { data: session, isPending } = useSession();
  const [signupError, setSignupError] = useState<string | null>(null);

  const handleDiscordLogin = async () => {
    try {
      setSignupError(null);
      await signIn.social({
        provider: "discord",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("Discord login error:", error);
    }
  };

  const handleDiscordSignup = async () => {
    try {
      setSignupError(null);
      await signIn.social({
        provider: "discord",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("Discord signup error:", error);
      if (error instanceof Error && error.message.includes("Signups are currently disabled")) {
        setSignupError("Signups are currently disabled. Only existing users can log in.");
      } else {
        setSignupError("An error occurred during signup. Please try again.");
      }
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
    return <LoginScreen onLogin={handleDiscordLogin} onSignup={handleDiscordSignup} signupError={signupError} />;
  }

  return <Dashboard user={session.user} />;
}
