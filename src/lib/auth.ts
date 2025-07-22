import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./schema";

const SIGNUP_ENABLED = process.env.NEXT_PUBLIC_ACCOUNT_SIGNUP_ENABLED === 'true';

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
        before: async (user) => {
          if (!SIGNUP_ENABLED) {
            throw new Error("unable_to_create_user");
          }
          return { data: user };
        },
      },
    },
  },
}); 