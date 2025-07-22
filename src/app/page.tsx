"use client";

import { useSession, signIn } from "@/lib/auth-client";
import { LoginScreen } from "@/components/login-screen";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  const { data: session, isPending } = useSession();

  const handleDiscordLogin = async () => {
    try {
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
      // For signup, we use the same social login flow
      // The actual user creation prevention will be handled at the auth layer
      await signIn.social({
        provider: "discord",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("Discord signup error:", error);
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
    return <LoginScreen onLogin={handleDiscordLogin} onSignup={handleDiscordSignup} />;
  }

  return <Dashboard user={session.user} />;
}
