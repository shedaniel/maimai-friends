import { AuthHandler } from "@/components/auth-handler";
import { Dashboard } from "@/components/dashboard";
import { LoginScreen } from "@/components/login-screen";
import { getServerSession } from "@/lib/auth-server";
import { createServerSideTRPC } from "@/lib/trpc-server";
import { Suspense } from "react";

// Force dynamic rendering since we need to check authentication
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    // Fetch signup requirements on the server
    const trpc = await createServerSideTRPC();
    const signupRequirements = await trpc.user.getSignupRequirements() as {
      signupEnabled: boolean;
      inviteRequired: boolean;
      reason: 'disabled' | 'invite-only' | 'enabled' | 'open';
    };

    return (
      <>
        <Suspense fallback={null}>
          <AuthHandler />
        </Suspense>
        <LoginScreen signupRequirements={signupRequirements} />
      </>
    );
  }

  // Fetch initial dashboard data on the server with authenticated context
  const trpc = await createServerSideTRPC(session);
  
  // First fetch user data to get their region preference
  const userData = await trpc.user.getUserData().catch(() => ({
    hasUsername: false,
    username: null,
    publishProfile: false,
    region: "intl" as const,
    role: "user" as const,
  }));

  // Then fetch timezone, token status, and profile settings in parallel using the user's region
  const [timezoneData, tokenData, profileSettings] = await Promise.all([
    trpc.user.getTimezone().catch(() => ({ timezone: null })),
    trpc.user.hasToken({ region: userData.region || "intl" }).catch(() => ({ hasToken: false })),
    trpc.user.getProfileSettings().catch(() => ({
      publishProfile: false,
      profileMainRegion: 'intl' as const,
      profileShowAllScores: true,
      profileShowScoreDetails: true,
      profileShowPlates: true,
      profileShowPlayCounts: true,
      profileShowEvents: true,
      profileShowInSearch: true,
    })),
  ]);

  return (
    <Dashboard 
      user={session.user}
      initialUserData={userData}
      initialHasToken={tokenData?.hasToken ?? false}
      initialTimezone={timezoneData?.timezone ?? null}
      initialProfileSettings={profileSettings}
    />
  );
}
