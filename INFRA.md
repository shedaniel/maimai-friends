# Infrastructure Documentation

## Tech Stack

### Frontend
- **Framework**: Next.js 15+ (App Router) ✅ **IMPLEMENTED**
- **Language**: TypeScript ✅ **IMPLEMENTED**
- **Styling**: Tailwind CSS + shadcn/ui components ✅ **IMPLEMENTED**
- **State Management**: React hooks + tRPC with React Query ✅ **IMPLEMENTED**
- **UI Components**: shadcn/ui (Button, Card, Form, Input, Label, Dialog, DropdownMenu, Sonner, Tabs, Progress, Select, Badge) ✅ **IMPLEMENTED**
- **API Communication**: tRPC for type-safe API calls ✅ **IMPLEMENTED**
- **Notifications**: Sonner toast notifications ✅ **IMPLEMENTED**
- **Internationalization**: next-intl with 5 language support (EN, EN-GB, JA, ZH-CN, ZH-TW) ✅ **IMPLEMENTED**

### Backend
- **Runtime**: Node.js (Next.js API Routes) ✅ **IMPLEMENTED**
- **Database**: SQLite with Drizzle ORM ✅ **IMPLEMENTED**
- **ORM**: Drizzle ORM with schema validation ✅ **IMPLEMENTED**
- **Authentication**: Discord OAuth via Better Auth ✅ **IMPLEMENTED**
- **API Layer**: tRPC router with protected procedures ✅ **IMPLEMENTED**
- **HTML Parsing**: Cheerio for maimai data extraction ✅ **IMPLEMENTED**

### Infrastructure
- **Deployment**: Ready for Vercel deployment
- **Database**: SQLite for development ✅ **IMPLEMENTED**
- **Token Storage**: Encrypted tokens in database ✅ **IMPLEMENTED**
- **Rate Limiting**: In-memory rate limiting (5 requests per 5 minutes) ✅ **IMPLEMENTED**
- **Data Population**: Admin endpoint for song database updates ✅ **IMPLEMENTED**

## User Flow ✅ **IMPLEMENTED**

### Authentication ✅ **IMPLEMENTED**
1. User visits the site
2. Clicks "Login with Discord"
3. OAuth redirect to Discord
4. Discord callback creates/updates user session
5. Redirect to main dashboard

### Data Management Flow ✅ **IMPLEMENTED**
1. **Region Selection**: Dropdown in header (IN/JP)
   - Japan region shows "WIP" badge
   - Each region maintains separate data
   - Consistent button size with region codes
2. **Data Snapshot Selection**: Banner with dropdown selector
   - Shows historical snapshots with timestamps
   - Displays user info (name, rating) for each snapshot
   - Default to latest available data
3. **Data Fetching**: 
   - Token dialog for maimai token input/update
   - Automatic token reuse for subsequent fetches
   - Real-time progress via polling (2-second intervals)
   - Toast notifications for success/failure
   - Rate limited (5 requests per 5 minutes per user per region)
   - Token validation against SEGA login endpoint
   - Complete maimai data fetch flow implemented
   - Full HTML parsing and database storage ✅ **IMPLEMENTED**

### UI Features ✅ **IMPLEMENTED**
- **User Menu**: Dropdown with profile picture and logout
- **Region Switcher**: Compact dropdown showing IN/JP
- **Token Management**: Secure dialog with password toggle
- **Fetch Status**: Real-time updates with button state changes
- **Error Handling**: Toast notifications for all error states
- **Gray Background**: Subtle background with white card contrast
- **Tabbed Data View**: Player Info, Songs, Recommendations, Plates, Map, Export Image ✅ **IMPLEMENTED**
- **Rating Display**: Visual rating cards with proper color coding ✅ **IMPLEMENTED**
- **Song List**: B15/B35 organization with difficulty colors and achievement percentages ✅ **IMPLEMENTED**
- **Multi-language Support**: Automatic language detection and manual selection ✅ **IMPLEMENTED**

## Database Schema ✅ **IMPLEMENTED**

### Core Tables ✅ **IMPLEMENTED**

#### `users` ✅ **IMPLEMENTED**
```sql
- id: string (primary key, Discord ID)
- name: string (Discord username)
- email: string | null (Discord email)
- image: string | null (Discord avatar URL)
- createdAt: timestamp
- updatedAt: timestamp
```

#### `user_tokens` ✅ **IMPLEMENTED**
```sql
- id: string (primary key)
- userId: string (foreign key -> users.id)
- region: enum ('intl', 'jp')
- token: string (stored securely)
- createdAt: timestamp
- updatedAt: timestamp
- UNIQUE constraint on (userId, region)
```

#### `fetch_sessions` ✅ **IMPLEMENTED**
```sql
- id: string (primary key)
- userId: string (foreign key -> users.id)
- region: enum ('intl', 'jp')
- status: enum ('pending', 'completed', 'failed')
- startedAt: timestamp
- completedAt: timestamp | null
- errorMessage: string | null
```

#### `user_snapshots` ✅ **IMPLEMENTED**
```sql
- id: string (primary key)
- userId: string (foreign key -> users.id)
- region: enum ('intl', 'jp')
- fetchedAt: timestamp
- gameVersion: int
- rating: int (0-20000)
- courseRank: enum ('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R', 'U')
- classRank: enum ('B5', 'B4', 'B3', 'B2', 'B1', 'A5', 'A4', 'A3', 'A2', 'A1', 'S5', 'S4', 'S3', 'S2', 'S1', 'SS5', 'SS4', 'SS3', 'SS2', 'SS1', 'SSS5', 'SSS4', 'SSS3', 'SSS2', 'SSS1', 'LEGEND')
- stars: int
- versionPlayCount: int
- totalPlayCount: int
- iconUrl: string
- displayName: string
- title: string
```

#### `songs` ✅ **IMPLEMENTED**
```sql
- id: string (primary key, auto-generated)
- songName: string
- artist: string
- cover: string (URL)
- difficulty: enum ('basic', 'advanced', 'expert', 'master', 'remaster', 'utage')
- level: enum ('1', '1+', '2', '2+', ..., '15', '15+', '16', '16+')
- levelPrecise: int (stored as 10x, e.g., 16.5 = 165)
- type: enum ('std', 'dx')
- genre: string
- region: enum ('intl', 'jp')
- gameVersion: int
- addedVersion: int (-1 for legacy versions, version offset for newer versions)
- UNIQUE constraint on (songName, difficulty, type, region, gameVersion)
```

#### `user_scores` ✅ **IMPLEMENTED**
```sql
- id: string (primary key)
- snapshotId: string (foreign key -> user_snapshots.id)
- songId: string (foreign key -> songs.id)
- achievement: int (stored as 10000x, e.g., 99.1234% = 991234)
- dxScore: int
- fc: enum ('none', 'fc', 'fc+', 'ap', 'ap+')
- fs: enum ('none', 'sync', 'fs', 'fs+', 'fdx', 'fdx+')
```

#### `detailed_scores` ✅ **IMPLEMENTED** (Optional detailed recent play data)
```sql
- id: string (primary key)
- snapshotId: string (foreign key -> user_snapshots.id)
- songId: string (foreign key -> songs.id)
- playIndex: int
- played: timestamp
- fast: int
- late: int
- achievement: int (stored as 10000x)
- dxScore: int
- fc: enum ('none', 'fc', 'fc+', 'ap', 'ap+')
- fs: enum ('none', 'sync', 'fs', 'fs+', 'fdx', 'fdx+')
- tapPerf: int
- tapGreat: int
- tapGood: int
- tapMiss: int
- holdPerf: int
- holdGreat: int
- holdGood: int
- holdMiss: int
- slidePerf: int
- slideGreat: int
- slideGood: int
- slideMiss: int
- touchPerf: int
- touchGreat: int
- touchGood: int
- touchMiss: int
- breakCritPerf: int
- breakPerf: int
- breakGreat: int
- breakGood: int
- breakMiss: int
- venue: string | null
```

## API Architecture ✅ **IMPLEMENTED**

### tRPC API Layer ✅ **IMPLEMENTED**
- **Base Route**: `/api/trpc/[trpc]` - All tRPC endpoints
- **Type Safety**: Full TypeScript integration with client/server
- **Authentication**: Protected procedures using session middleware
- **Error Handling**: Structured error responses with proper status codes

### Authentication Endpoints ✅ **IMPLEMENTED**
- `GET /api/auth/[...all]` - Better Auth handler (Discord OAuth)
- Discord OAuth flow with automatic user creation/updates
- Session management with secure cookies

### tRPC Procedures ✅ **IMPLEMENTED**

#### User Router (`/api/trpc/user.*`)
- `user.getSnapshots` - Get user's data snapshots by region ✅ **IMPLEMENTED**
- `user.startFetch` - Initiate new data fetch with optional token ✅ **IMPLEMENTED**
- `user.getFetchStatus` - Get latest fetch session status ✅ **IMPLEMENTED**
- `user.hasToken` - Check if user has saved token for region ✅ **IMPLEMENTED**

### Admin Endpoints ✅ **IMPLEMENTED**
- `GET /api/admin/update` - Populate song database from maimai sources
- **Authentication**: Requires ADMIN_UPDATE_TOKEN environment variable
- **Parameters**: `?token=<maimai_token>&region=<intl|jp>`
- **Token validation**: Validates against SEGA login endpoint
- **Song data scraping**: Fetches all songs across versions and difficulties
- **Metadata integration**: Combines scraped data with official JSON sources
- **External APIs**: Integrates with [dxdata.json](https://github.com/gekichumai/dxrating) for accurate internal level values
- **Batch processing**: Handles large datasets with proper batching and upserts

### Maimai Data Processing ✅ **IMPLEMENTED**
- **Complete HTML Parsing**: Full maimai-mobile data extraction ✅ **IMPLEMENTED**
- **Player Data Extraction**: Rating, profile info, play counts ✅ **IMPLEMENTED**
- **Song Score Processing**: Achievement, FC, FS status per song ✅ **IMPLEMENTED**
- **Token Validation**: Validates `clal` cookie against SEGA login endpoint
- **Login Flow**: Automatic login using redirect URL and cookie extraction
- **Error Detection**: Detects session expiration and invalid tokens
- **Token Cleanup**: Automatically removes invalid tokens from database
- **Database Storage**: Complete data storage in structured format ✅ **IMPLEMENTED**

## Rating System ✅ **IMPLEMENTED**

### Rating Calculation ✅ **IMPLEMENTED**
- **Accuracy-based Factors**: Implements official maimai rating formula
  - 100.5%+: 0.224 factor
  - 100.0%+: 0.216 factor
  - 99.5%+: 0.211 factor
  - 99.0%+: 0.208 factor
  - 98.0%+: 0.203 factor
  - 97.0%+: 0.200 factor
  - 94.0%+: 0.168 factor
  - 90.0%+: 0.152 factor
  - 80.0%+: 0.136 factor
- **Song Rating Formula**: `floor(factor × accuracy × levelPrecise / 10)`
- **B15/B35 Organization**: Automatic categorization of top ratings
  - New songs (current version): Top 15 ratings
  - Old songs (previous versions): Top 35 ratings

### Data Visualization ✅ **IMPLEMENTED**
- **Player Info Card**: Rating display with color-coded badges, profile picture, title
- **Songs List**: Organized by B15/B35 with difficulty colors and achievement percentages
- **Song Cards**: Cover images, difficulty color coding, FC/FS status display
- **Rating Display**: Visual rating badges with proper maimai color scheme

## Version Management ✅ **IMPLEMENTED**

### Version Tracking ✅ **IMPLEMENTED**
- **Complete Version History**: From maimai DX (v0) to PRiSM PLUS (v11)
- **Regional Release Dates**: Separate tracking for International and Japan regions
- **Current Version Detection**: Automatic current version detection by region and date
- **Version-based Organization**: Songs categorized by added version for B15/B35 logic

### Version Metadata ✅ **IMPLEMENTED**
```typescript
- id: number (version ID)
- name: string (full version name)
- shortName: string (abbreviated name)
- intlReleaseDate: string | null (YYYY/MM/DD format)
- jpReleaseDate: string | null (YYYY/MM/DD format)
```

## Rate Limiting & Caching ✅ **IMPLEMENTED**

### Rate Limiting ✅ **IMPLEMENTED**
- **Data Fetching**: 5 requests per 5 minutes per user per region
- **Implementation**: In-memory sliding window using fetch_sessions table
- **Concurrent Fetch Prevention**: Blocks multiple pending fetches per region
- **Smart Window**: Only enforces limit when user has made 5+ requests

### Polling & Real-time Updates ✅ **IMPLEMENTED**
- **Fetch Status Polling**: 2-second intervals for responsive UI
- **Auto-timeout**: 5-minute maximum polling duration
- **Latest Session**: Always polls most recent fetch session
- **Toast Notifications**: Immediate feedback on completion/failure

## Internationalization ✅ **IMPLEMENTED**

### Multi-language Support ✅ **IMPLEMENTED**
- **Languages**: English (US), English (UK), Japanese, Chinese (Traditional), Chinese (Simplified)
- **Auto-detection**: Automatic language detection from browser preferences
- **Manual Selection**: User can override language in settings
- **Complete Coverage**: All UI text, labels, notifications, and messages translated
- **Dynamic Loading**: Language switching without page reload

### Message Structure ✅ **IMPLEMENTED**
- **Namespaced Keys**: Organized by component/feature (auth, dashboard, settings, etc.)
- **Parameterized Messages**: Support for dynamic values (counts, names, dates)
- **Consistent Terminology**: Standardized maimai-specific terms across languages

## Security Considerations

### Data Protection
- **Tokens**: Encrypt maimai tokens before database storage
- **Sessions**: Secure HTTP-only cookies
- **API**: CSRF protection on state-changing operations

### Privacy
- **Data Isolation**: Strict user-based data separation
- **Regional Separation**: Complete data isolation by region
- **Retention**: Define data retention policies

## Deployment Strategy

### Development
- SQLite database for local development
- Environment variables for Discord OAuth and admin functionality
- Hot reload with Next.js dev server

### Production
- PostgreSQL for production database
- Redis for caching and rate limiting
- Environment-based configuration
- Database migrations via Drizzle

### Required Environment Variables
```env
# Authentication
BETTER_AUTH_SECRET=your-secure-random-secret-key
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Database
TURSO_DATABASE_URL=libsql://your-database-url.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Admin functionality (optional, for song database updates)
ADMIN_UPDATE_TOKEN=your-secure-admin-token

# Discord Bot (required for Discord bot functionality)
NEXT_PUBLIC_DISCORD_APPLICATION_ID=your-discord-application-id
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_PUBLIC_KEY=your-discord-public-key
```

## Future Considerations

### Scalability
- Database sharding by region if needed
- CDN for static assets
- Horizontal scaling of API routes

### Features
- Real-time updates via WebSocket
- Export functionality ✅ **UI PREPARED**
- Data visualization ✅ **PARTIALLY IMPLEMENTED**
- Mobile app support

### Monitoring
- Error tracking (Sentry)
- Performance monitoring
- Database query optimization
- User analytics (privacy-compliant)

## Current Implementation Status

### ✅ Completed Features
- **Full Authentication Flow**: Discord OAuth with Better Auth
- **Complete UI System**: Responsive design with shadcn/ui components
- **Tabbed Data Interface**: Player Info, Songs, Recommendations, Plates with proper navigation
- **tRPC API Layer**: Type-safe client/server communication
- **Database Schema**: All core tables implemented with Drizzle ORM
- **Song Database**: Complete song database with all difficulties, versions, and regions
- **Token Management**: Secure storage with automatic validation
- **Rate Limiting**: Sliding window (5 requests per 5 minutes)
- **Maimai Data Flow**: Complete token validation, login, HTML parsing, and data storage
- **Rating System**: Full rating calculation with B15/B35 organization
- **Real-time Updates**: Polling with toast notifications
- **Error Handling**: Comprehensive error states and user feedback
- **Responsive UI**: Works on desktop and mobile devices
- **Internationalization**: 5-language support with complete translations
- **Data Visualization**: Player info cards, song lists, rating displays with proper styling
- **Version Management**: Complete version tracking and metadata system
- **Admin Tools**: Song database population from external sources

### 🔄 Next Implementation Priorities
1. **Plates System**: Complete plate achievement tracking and display
2. **Recommendations Engine**: Song recommendation logic based on player data
3. **Map Feature**: Visual representation of player progress
4. **Export Functionality**: Image generation for social sharing
5. **Historical Analysis**: Compare snapshots over time with charts
6. **Advanced Filtering**: Search and filter songs by various criteria

### 🎯 Production Ready
- Core infrastructure is production-ready
- Database migrations are prepared and tested
- Authentication is secure and functional
- Rate limiting prevents abuse
- Error handling provides excellent user experience
- Token management is secure and automatic
- Data parsing and storage pipeline is complete and robust
- UI is polished and responsive with proper internationalization
- Rating calculations are accurate and properly implemented 