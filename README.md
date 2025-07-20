This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) and enhanced with [shadcn/ui](https://ui.shadcn.com/) and [Better Auth](https://better-auth.com/).

## Features

- **Next.js 15** with App Router
- **Tailwind CSS v4** for styling
- **shadcn/ui** components for beautiful UI
- **Better Auth** for authentication with Discord OAuth
- **Turso (LibSQL)** managed SQLite database
- **Drizzle ORM** for type-safe database operations
- **TypeScript** for type safety

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up your environment variables by configuring Discord OAuth and Turso database:

### Discord OAuth Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 settings and add redirect URI: `http://localhost:3000/api/auth/callback/discord`
4. Copy your Client ID and Client Secret

### Turso Database Setup

1. Sign up for [Turso](https://turso.tech/) and install the CLI:
   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. Create a new database:
   ```bash
   turso db create maimai-charts-[your-username]
   ```

3. Get your database URL and create an auth token:
   ```bash
   turso db show maimai-charts-[your-username] --url
   turso db tokens create maimai-charts-[your-username]
   ```

4. Update your `.env.local` file:

```env
BETTER_AUTH_SECRET=your-secure-random-secret-key
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
TURSO_DATABASE_URL=libsql://your-database-url.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```

### Database Migration

Run the database migration to create the required tables:

```bash
npm run db:push
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication

The app includes Discord OAuth authentication with:
- Discord OAuth sign-in flow
- Session management with Discord user data
- User avatar and username display
- Protected routes capability

## Database

This project uses:
- **Turso**: Edge-hosted LibSQL database for global low-latency
- **Drizzle ORM**: Type-safe database operations with great developer experience

### Database Commands

```bash
# Generate migration files
npm run db:generate

# Push schema changes to database
npm run db:push

# Open Drizzle Studio (database browser)
npm run db:studio
```

## Discord OAuth Setup

To set up Discord OAuth:

1. **Create Discord Application:**
   - Visit [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Navigate to the "OAuth2" section

2. **Configure OAuth2:**
   - Add redirect URI: `http://localhost:3000/api/auth/callback/discord`
   - For production: `https://yourdomain.com/api/auth/callback/discord`
   - Note down your Client ID and Client Secret

3. **Update Environment Variables:**
   ```bash
   echo "DISCORD_CLIENT_ID=your-actual-client-id" >> .env.local
   echo "DISCORD_CLIENT_SECRET=your-actual-client-secret" >> .env.local
   ```

## Project Structure

```
src/
├── app/
│   ├── api/auth/[...all]/route.ts  # Better Auth API routes
│   ├── globals.css                  # Global styles with shadcn/ui variables
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Home page with Discord auth
├── components/ui/                   # shadcn/ui components
├── lib/
│   ├── auth.ts                      # Better Auth server configuration
│   ├── auth-client.ts               # Better Auth client configuration
│   ├── db.ts                        # Drizzle database connection
│   ├── schema.ts                    # Drizzle database schema
│   └── utils.ts                     # Utility functions
drizzle.config.ts                    # Drizzle configuration
```

## Available Components

This project includes the following shadcn/ui components:
- Button
- Input
- Card
- Form
- Label

To add more components:

```bash
npx shadcn@latest add [component-name]
```

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Better Auth Documentation](https://better-auth.com)
- [Discord OAuth Documentation](https://discord.com/developers/docs/topics/oauth2)
- [Turso Documentation](https://docs.turso.tech/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Make sure to add your environment variables in the Vercel dashboard.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
