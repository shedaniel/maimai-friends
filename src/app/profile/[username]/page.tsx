import { redirect } from "next/navigation";
import { createServerSideTRPC } from "@/lib/trpc-server";
import { TRPCError } from "@trpc/server";

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  try {
    // Get the user's profile to find their main region
    const trpc = await createServerSideTRPC();
    const profileData = await trpc.user.getPublicProfile({
      username: decodeURIComponent(username),
    });

    // Redirect to the specific region page using the user's main region
    redirect(`/profile/${username}/${profileData.profileMainRegion}`);
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
      // Return a 404-like page
      return (
        <div className="container mx-auto max-w-[1300px] px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
            <p className="text-muted-foreground">
              The profile you&apos;re looking for doesn&apos;t exist or is not publicly accessible.
            </p>
          </div>
        </div>
      );
    }

    // Re-throw other errors
    throw error;
  }
} 