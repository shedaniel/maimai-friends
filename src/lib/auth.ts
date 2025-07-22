import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./schema";
import { invites } from "./schema";
import { and, eq, isNull, lt, or } from "drizzle-orm";

const SIGNUP_TYPE = process.env.NEXT_PUBLIC_ACCOUNT_SIGNUP_TYPE || 'disabled'; // disabled, invite-only, enabled

// Helper function to validate and claim invitations
async function validateAndClaimInvite(inviteCode: string, userId: string) {
  const now = new Date();
  
  // Auto-cleanup old/revoked/expired invites
  try {
    await db
      .delete(invites)
      .where(
        or(
          eq(invites.revoked, true),
          and(
            lt(invites.expiresAt, now),
            isNull(invites.claimedBy)
          )
        )
      );
  } catch (error) {
    console.error("Auto-cleanup failed:", error);
  }

  // Find the invitation
  const [invite] = await db
    .select({
      id: invites.id,
      code: invites.code,
      createdBy: invites.createdBy,
      claimedBy: invites.claimedBy,
      createdAt: invites.createdAt,
      expiresAt: invites.expiresAt,
      revoked: invites.revoked,
    })
    .from(invites)
    .where(eq(invites.code, inviteCode))
    .limit(1);

  if (!invite) {
    throw new Error("Invalid invitation code");
  }

  // Check if invitation is valid
  if (invite.revoked) {
    throw new Error("This invitation has been revoked");
  }

  if (invite.claimedBy) {
    throw new Error("This invitation has already been used");
  }

  if (new Date(invite.expiresAt) <= now) {
    throw new Error("This invitation has expired");
  }

  // Check for self-claiming
  if (invite.createdBy === userId) {
    throw new Error("You cannot use your own invitation code");
  }

  // Claim the invitation
  await db
    .update(invites)
    .set({
      claimedBy: userId,
      claimedAt: now,
    })
    .where(eq(invites.id, invite.id));

  return invite;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET || "development-secret-change-in-production",
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    },
  },
  plugins: [nextCookies()],
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          if (SIGNUP_TYPE === 'disabled') {
            throw new Error("unable_to_create_user");
          }
          
          // For invite-only mode, check if there's an invitation
          if (SIGNUP_TYPE === 'invite-only') {
            let inviteCode: string | null = null;
            
            // Try to extract invitation code from cookies
            if (context?.request) {
              const cookieHeader = context.request.headers.get('cookie');
              if (cookieHeader) {
                const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                  const [key, value] = cookie.trim().split('=');
                  acc[key] = value;
                  return acc;
                }, {} as Record<string, string>);
                
                inviteCode = cookies.pendingInviteCode || null;
              }
            }
            
            if (!inviteCode) {
              console.log("No invitation code found in cookies during signup");
              throw new Error("Invitation required for signup");
            }
            
            console.log(`Found invitation code during signup: ${inviteCode}`);
            
            // Validate invitation (we'll claim it in the after hook)
            const now = new Date();
            const [invite] = await db
              .select({
                id: invites.id,
                createdBy: invites.createdBy,
                claimedBy: invites.claimedBy,
                expiresAt: invites.expiresAt,
                revoked: invites.revoked,
              })
              .from(invites)
              .where(eq(invites.code, inviteCode))
              .limit(1);

            if (!invite) {
              throw new Error("Invalid invitation code");
            }

            if (invite.revoked) {
              throw new Error("This invitation has been revoked");
            }

            if (invite.claimedBy) {
              throw new Error("This invitation has already been used");
            }

            if (new Date(invite.expiresAt) <= now) {
              throw new Error("This invitation has expired");
            }
          }
          
          return { data: user };
        },
        after: async (user, context) => {
          // For invite-only mode, claim the invitation after user creation
          if (SIGNUP_TYPE === 'invite-only') {
            let inviteCode: string | null = null;
            
            // Read the invitation code from cookies again
            if (context?.request) {
              const cookieHeader = context.request.headers.get('cookie');
              if (cookieHeader) {
                const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                  const [key, value] = cookie.trim().split('=');
                  acc[key] = value;
                  return acc;
                }, {} as Record<string, string>);
                
                inviteCode = cookies.pendingInviteCode || null;
              }
            }
            
            if (inviteCode) {
              console.log(`Attempting to claim invitation ${inviteCode} for user ${user.id}`);
              try {
                await validateAndClaimInvite(inviteCode, user.id);
                console.log(`Successfully claimed invitation ${inviteCode} for user ${user.id}`);
              } catch (error) {
                console.error(`Failed to claim invitation ${inviteCode} for user ${user.id}:`, error);
                // Note: At this point the user is already created, so we can't easily roll back
                // In a production system, you might want to implement compensation logic
              }
            } else {
              console.log(`No invitation code found in after hook for user ${user.id}`);
            }
          }
        },
      },
    },
  },
}); 