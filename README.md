# tomomai ともマイ

A modern web application for tracking and analyzing your maimai DX scores with friends. Built with Next.js 15, TypeScript, and Tailwind CSS.

## ✨ Features

### 🎮 **Complete Score Tracking**
- **Automatic Data Import**: Import your complete maimai profile and scores directly from maimai DX NET
- **Multi-Region Support**: Separate tracking for International and Japan regions
- **Real-Time Sync**: Live updates during data fetching with progress indicators
- **Historical Snapshots**: Keep track of your progress over time with dated snapshots

### 📊 **Advanced Analytics**
- **Rating System**: Accurate rating calculations using official maimai formulas
- **B15/B35 Analysis**: Automatic organization of your best 15 new songs and best 35 old songs
- **Visual Progress**: Color-coded difficulty displays and achievement percentages
- **Player Statistics**: Comprehensive view of play counts, ratings, and rankings

### 🌍 **Internationalization**
- **5 Languages**: English (US/UK), Japanese, Chinese (Traditional/Simplified)
- **Auto-Detection**: Automatically detects your preferred language
- **Complete Translation**: All UI elements, notifications, and messages are localized

### 🎨 **Modern Interface**
- **Responsive Design**: Perfect experience on desktop and mobile devices
- **Tabbed Navigation**: Organized sections for Player Info, Songs, Recommendations, Plates
- **Real-Time Notifications**: Toast notifications for all actions and status updates
- **Dark/Light Theme Ready**: Built with theme switching in mind

### 🔒 **Security & Privacy**
- **Discord OAuth**: Secure authentication with your Discord account
- **Encrypted Storage**: All tokens and sensitive data are encrypted
- **Rate Limiting**: Built-in protection against abuse
- **Data Isolation**: Complete separation between users and regions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Discord Application (for OAuth)
- Turso Database (recommended) or local SQLite

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shedaniel/maimai-friends.git
   cd maimai-friends
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Configure your `.env.local` file:
   ```env
   BETTER_AUTH_SECRET=your-secure-random-secret-key
   DISCORD_CLIENT_ID=your-discord-client-id
   DISCORD_CLIENT_SECRET=your-discord-client-secret
   TURSO_DATABASE_URL=libsql://your-database-url.turso.io
   TURSO_AUTH_TOKEN=your-turso-auth-token
   
   # Optional: Admin functionality for song database updates
   ADMIN_UPDATE_TOKEN=your-secure-admin-token
   
   # Discord Bot (required for Discord bot functionality)
   DISCORD_APPLICATION_ID=your-discord-application-id
   DISCORD_BOT_TOKEN=your-discord-bot-token
   DISCORD_PUBLIC_KEY=your-discord-public-key
   ```

4. **Set up database**
   ```bash
   npm run db:push
   ```

   **Note**: If you're upgrading from a previous version, you'll need to run database migrations:
   ```bash
   npm run db:push      # Apply any pending migrations
   ```

5. **Register Discord bot commands (optional)**
   ```bash
   npm run discord:register
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see your application running!

## 🎯 Usage

### Getting Started
1. **Sign In**: Use your Discord account to sign in
2. **Select Region**: Choose between International or Japan region
3. **Add Token**: Enter your maimai DX NET authentication token
4. **Fetch Data**: Click "Fetch New Data" to import your scores
5. **Explore**: View your player info, song ratings, and progress in the tabbed interface

### Understanding Your Data
- **Rating**: Your calculated rating based on your best performances
- **B15**: Your best 15 scores from the current maimai version
- **B35**: Your best 35 scores from previous maimai versions
- **Achievements**: Your accuracy percentages for each song
- **FC/FS Status**: Full Combo and Full Sync achievements

### Admin Functionality (Optional)
If you have admin access, you can update the song database:
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "http://localhost:3000/api/admin/update?token=clal=YOUR_MAIMAI_TOKEN&region=intl"
```

This endpoint:
- Scrapes the complete maimai song database from official sources
- Fetches metadata from external APIs for accurate song information
- Updates the database with all songs, difficulties, and internal level values
- Supports both International and Japan regions

## 🛠 Tech Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS v4** for styling
- **shadcn/ui** for beautiful UI components
- **next-intl** for internationalization
- **tRPC** for type-safe API calls

### Backend
- **Next.js API Routes** with TypeScript
- **Better Auth** for Discord OAuth
- **Drizzle ORM** with SQLite/Turso
- **Cheerio** for HTML parsing
- **Rate limiting** and security features

### Database
- **Turso (LibSQL)** for production (managed SQLite)
- **SQLite** for local development
- **Automatic migrations** with Drizzle

## 🗄 Database Schema

The application uses a robust database schema with the following key tables:

- **`users`**: Discord user profiles and authentication
- **`user_tokens`**: Encrypted maimai authentication tokens per region
- **`user_snapshots`**: Player data snapshots with ratings and stats
- **`songs`**: Complete maimai song database with all difficulties and versions
- **`user_scores`**: Individual song scores linked to snapshots
- **`fetch_sessions`**: Track data fetching progress and status

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Database
npm run db:generate     # Generate migration files
npm run db:push         # Push schema changes to database
npm run db:migrate      # Run migrations
npm run db:studio       # Open Drizzle Studio (database browser)
```

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (auth, trpc, admin)
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── data-content.tsx  # Main data visualization
│   ├── info-card.tsx     # Player info display
│   ├── songs-card.tsx    # Song list with ratings
│   └── ...
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication configuration
│   ├── db.ts             # Database connection
│   ├── schema.ts         # Database schema
│   ├── rating-calculator.ts # Rating calculation logic
│   ├── maimai-fetcher.ts # Data fetching and parsing
│   └── ...
├── server/               # tRPC server setup
└── middleware.ts         # Next.js middleware
```

## 🌐 Discord Setup

### Discord OAuth (for user authentication)

1. **Create Discord Application**
   - Visit [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and name it
   - Navigate to "OAuth2" section

2. **Configure OAuth2**
   - Add redirect URI: `http://localhost:3000/api/auth/callback/discord`
   - For production: `https://yourdomain.com/api/auth/callback/discord`
   - Copy Client ID and Client Secret to your `.env.local`

### Discord Bot (for bot functionality)

1. **Enable Bot**
   - In your Discord Application, navigate to "Bot" section
   - Click "Add Bot" to create a bot user
   - Copy the Bot Token to your `.env.local` as `DISCORD_BOT_TOKEN`

2. **Get Application Credentials**
   - Go to "General Information" section
   - Copy "Application ID" to your `.env.local` as `DISCORD_APPLICATION_ID`
   - Copy "Public Key" to your `.env.local` as `DISCORD_PUBLIC_KEY`

3. **Set Interactions Endpoint URL (for production)**
   - In "General Information", scroll to "Interactions Endpoint URL"
   - Set it to: `https://yourdomain.com/api/interactions`
   - This tells Discord where to send slash command interactions

4. **Register Bot Commands**
   ```bash
   npm run discord:register
   ```

5. **Invite Bot to Server**
   - Use `/invite` slash command to get an invite link
   - Or manually create: `https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=applications.commands`

## 🤖 Discord Bot Features

The ともマイ Discord bot extends the web application's functionality directly into Discord servers:

### Available Commands

- **`/invite`** - Get an invite link to add the bot to your server
  - Returns a beautiful embed with bot information and features
  - Public response for server promotion

- **`/top`** - Show your latest maimai rating (International region)
  - Displays your current rating with playful commentary
  - Shows stars, total plays, and last update time
  - Public response to show off your scores

- **`/topjp`** - Show your latest maimai rating (Japan region)  
  - Same as `/top` but for Japan region data
  - Requires Japan region scores to be imported

- **Error Handling**: Commands show helpful ephemeral messages if:
  - User hasn't linked their Discord account
  - No score data found for the region
  - Database connection issues

### Bot Architecture

- **Serverless**: Runs on Vercel using HTTP interactions (no persistent connection needed)
- **Secure**: All requests are verified using Discord's signature verification
- **Extensible**: Easy to add new slash commands by updating the interactions endpoint

### Limitations

- **HTTP-only**: Cannot listen to message events or maintain persistent state
- **Slash commands only**: Focused on structured interactions rather than message parsing
- **No real-time features**: Perfect for on-demand information and utility commands

---

## 🏗 Database Setup

### Option 1: Turso (Recommended for Production)

1. **Install Turso CLI**
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. **Create Database**
   ```bash
   turso db create maimai-friends-[your-username]
   turso db show maimai-friends-[your-username] --url
   turso db tokens create maimai-friends-[your-username]
   ```

3. **Update Environment**
   ```env
   TURSO_DATABASE_URL=libsql://your-database-url.turso.io
   TURSO_AUTH_TOKEN=your-turso-auth-token
   ```

### Option 2: Local SQLite

For local development, you can use SQLite directly:
```env
DATABASE_URL=file:./dev.db
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   - Import your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard

 2. **Environment Variables**
    ```env
    BETTER_AUTH_SECRET=your-production-secret
    DISCORD_CLIENT_ID=your-discord-client-id
    DISCORD_CLIENT_SECRET=your-discord-client-secret
    TURSO_DATABASE_URL=your-production-database-url
    TURSO_AUTH_TOKEN=your-production-auth-token
    
    # Optional: Admin functionality for song database updates
    ADMIN_UPDATE_TOKEN=your-production-admin-token
    ```

3. **Database Migrations**
   - Run `npm run db:push` to set up your production database
   - Or use the migration commands if you prefer versioned migrations

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **SEGA** for creating maimai DX
- **[dxrating](https://github.com/gekichumai/dxrating)** for providing comprehensive maimai DX song metadata and internal level data
- **shadcn/ui** for the beautiful component library
- **Vercel** for hosting and deployment
- **Turso** for the edge database solution
- **Discord** for OAuth integration

## 🚧 Contributing & Support

**Note**: We are not currently accepting contributions until the project reaches proper deployment status. Please check back later for contribution guidelines.

For now, this project is in active development and we appreciate your interest, but ask that you wait until we have a stable foundation before submitting pull requests.

---

Built with ❤️ for the maimai community
