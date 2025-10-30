import { AuthHandler } from "@/components/auth-handler";
import { Dashboard } from "@/components/dashboard";
import { LoginScreen } from "@/components/login-screen";
import { getServerSession } from "@/lib/auth-server";
import { createServerSideTRPC } from "@/lib/trpc-server";
import { useNewTokenDialog } from "@/lib/flags";
import { Suspense } from "react";

// Force dynamic rendering since we need to check authentication
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const newTokenDialog = await useNewTokenDialog();

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
  
  // First, get user data to determine their region preference
  const userData = await trpc.user.getUserData().catch(() => ({
    hasUsername: false,
    username: null,
    publishProfile: false,
    region: "intl" as const,
    role: "user" as const,
  }));

  const userRegion = userData.region || "intl";

  // Then fetch all other data in parallel using the correct region
  const [timezoneData, tokenData, profileSettings, snapshotsData] = await Promise.all([
    trpc.user.getTimezone().catch(() => ({ timezone: null })),
    trpc.user.hasToken({ region: userRegion }).catch(() => ({ hasToken: false })),
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
    trpc.user.getSnapshots({ region: userRegion }).catch(() => ({ snapshots: [] })),
  ]);

  // Fetch the latest snapshot data if we have snapshots
  // This is the slowest query (potentially hundreds of songs), so we do it last
  const latestSnapshotId = snapshotsData.snapshots[0]?.id;
  const initialSnapshotData = latestSnapshotId
    ? await trpc.user.getSnapshotData({ 
        snapshotId: latestSnapshotId, 
        region: userRegion 
      }).catch(() => undefined)
    : undefined;

  return (
    <Dashboard 
      user={session.user}
      initialUserData={userData}
      initialHasToken={tokenData?.hasToken ?? false}
      initialTimezone={timezoneData?.timezone ?? null}
      initialProfileSettings={profileSettings}
      initialSnapshots={snapshotsData.snapshots}
      initialSnapshotData={initialSnapshotData}
      newTokenDialog={newTokenDialog}
    />
  );
}
