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

  return <Dashboard user={session.user} />;
}
