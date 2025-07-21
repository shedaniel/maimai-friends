import { createServerSideTRPC } from "@/lib/trpc-server";
import { TRPCError } from "@trpc/server";
import { Region } from "@/lib/types";
import { ProfilePageClient } from "@/components/profile-page-client";
import { notFound } from "next/navigation";

// Mark this page as dynamic to avoid conflicts with cookie usage in layout
export const dynamic = 'force-dynamic';

interface RegionProfilePageProps {
  params: Promise<{
    username: string;
    region: string;
  }>;
}

// Validate region parameter
function isValidRegion(region: string): region is Region {
  return region === 'intl' || region === 'jp';
}

export default async function RegionProfilePage({ params }: RegionProfilePageProps) {
  const { username, region } = await params;

  // Validate region
  if (!isValidRegion(region)) {
    notFound();
  }

  try {
    const trpc = await createServerSideTRPC();
    
    // Get the user's profile data
    const profileData = await trpc.user.getPublicProfile({
      username: decodeURIComponent(username),
    });

    // Get the user's snapshot data for the specified region
    const snapshotData = await trpc.user.getPublicSnapshotData({
      username: decodeURIComponent(username),
      region,
    });

    return (
      <ProfilePageClient 
        profileData={profileData}
        snapshotData={snapshotData}
        region={region}
        username={decodeURIComponent(username)}
      />
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
      notFound();
    }

    // Re-throw other errors
    throw error;
  }
} 