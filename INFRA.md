# Infrastructure Documentation

## Tech Stack

### Frontend
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React hooks + Server Components
- **UI Components**: shadcn/ui (Button, Card, Form, Input, Label)

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Database**: SQLite (production: consider PostgreSQL)
- **ORM**: Drizzle ORM
- **Authentication**: Custom auth system with Discord OAuth

### Infrastructure
- **Deployment**: Vercel (recommended) or similar
- **Database**: SQLite for development, PostgreSQL for production
- **Caching**: Redis (for rate limiting and fetch states)
- **File Storage**: Public assets in `/public`

## User Flow

### Authentication
1. User visits the site
2. Clicks "Login with Discord"
3. OAuth redirect to Discord
4. Discord callback creates/updates user session
5. Redirect to main dashboard

### Data Management Flow
1. **Region Selection**: Tabs at top (International/Japan)
   - Japan region shows "WIP" badge
   - Each region maintains separate data
2. **Data Date Selection**: Banner with date picker
   - Shows historical snapshots
   - Default to latest available data
3. **Data Fetching**: 
   - Requires maimai token input
   - Shows progress/pending state
   - Prevents concurrent fetches
   - Rate limited (1 request/minute per user per region)

## Database Schema

### Core Tables

#### `users`
```sql
- id: string (primary key, Discord ID)
- discordUsername: string
- discordAvatar: string | null
- createdAt: timestamp
- updatedAt: timestamp
```

#### `user_tokens`
```sql
- id: string (primary key)
- userId: string (foreign key -> users.id)
- region: enum ('intl', 'jp')
- token: string (encrypted)
- createdAt: timestamp
- updatedAt: timestamp
```

#### `fetch_sessions`
```sql
- id: string (primary key)
- userId: string (foreign key -> users.id)
- region: enum ('intl', 'jp')
- status: enum ('pending', 'completed', 'failed')
- startedAt: timestamp
- completedAt: timestamp | null
- errorMessage: string | null
```

#### `user_snapshots`
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

#### `songs`
```sql
- id: string (primary key, auto-generated)
- songName: string
- artist: string
- cover: string (URL)
- difficulty: enum ('basic', 'advanced', 'expert', 'master', 'remaster', 'utage')
- level: enum ('1', '1+', '2', '2+', ..., '15', '15+', '16', '16+')
- levelPrecise: int (stored as 10x, e.g., 16.5 = 165)
- type: enum ('std', 'dx')
- addedDate: date
- genre: enum (TBD - will define based on maimai genres)
- intlLevelOverride: enum | null
- intlLevelPreciseOverride: int | null
```

#### `user_scores`
```sql
- id: string (primary key)
- snapshotId: string (foreign key -> user_snapshots.id)
- songId: string (foreign key -> songs.id)
- playCount: int
- lastPlayed: timestamp
- achievement: int (stored as 10000x, e.g., 99.1234% = 991234)
- dxScore: int
- fc: enum ('none', 'fc', 'fc+', 'ap', 'ap+')
- fs: enum ('none', 'sync', 'fs', 'fs+', 'fdx', 'fdx+')
```

#### `detailed_scores` (Optional detailed recent play data)
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

## API Architecture

### Authentication Endpoints
- `GET /api/auth/discord` - Initiate Discord OAuth
- `GET /api/auth/callback` - Handle Discord OAuth callback
- `POST /api/auth/logout` - Clear user session

### Data Management Endpoints
- `GET /api/user/snapshots` - Get user's data snapshots by region
- `POST /api/user/fetch` - Initiate new data fetch
- `GET /api/user/fetch/status` - Check fetch status
- `POST /api/user/token` - Save/update maimai token

### Data Endpoints
- `GET /api/snapshots/[id]` - Get specific snapshot data
- `GET /api/scores/[snapshotId]` - Get scores for snapshot
- `GET /api/songs` - Get songs database

## Rate Limiting & Caching

### Rate Limiting
- **Data Fetching**: 1 request per minute per user per region
- **API Calls**: 100 requests per minute per IP
- Implementation: Redis with user/IP-based keys

### Caching Strategy
- **Songs Database**: Cache in memory, refresh daily
- **User Snapshots**: Cache for 5 minutes
- **Fetch Status**: Real-time updates via polling

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
- Environment variables for Discord OAuth
- Hot reload with Next.js dev server

### Production
- PostgreSQL for production database
- Redis for caching and rate limiting
- Environment-based configuration
- Database migrations via Drizzle

## Future Considerations

### Scalability
- Database sharding by region if needed
- CDN for static assets
- Horizontal scaling of API routes

### Features
- Real-time updates via WebSocket
- Export functionality
- Data visualization
- Mobile app support

### Monitoring
- Error tracking (Sentry)
- Performance monitoring
- Database query optimization
- User analytics (privacy-compliant) 