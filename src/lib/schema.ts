import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

// Existing auth tables
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  timezone: text("timezone"), // nullable, null = Asia/Tokyo (JP default)
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

// Maimai-specific tables
export const userTokens = sqliteTable("user_tokens", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  region: text("region", { enum: ["intl", "jp"] }).notNull(),
  token: text("token").notNull(), // Encrypted
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
}, (table) => ({
  userRegionUnique: unique().on(table.userId, table.region),
}));

export const fetchSessions = sqliteTable("fetch_sessions", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  region: text("region", { enum: ["intl", "jp"] }).notNull(),
  status: text("status", { enum: ["pending", "completed", "failed"] }).notNull(),
  startedAt: integer("startedAt", { mode: "timestamp" }).notNull(),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  errorMessage: text("errorMessage"),
});

export const userSnapshots = sqliteTable("user_snapshots", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  region: text("region", { enum: ["intl", "jp"] }).notNull(),
  fetchedAt: integer("fetchedAt", { mode: "timestamp" }).notNull(),
  gameVersion: integer("gameVersion").notNull(),
  rating: integer("rating").notNull(), // 0-20000
  courseRankUrl: text("courseRankUrl").notNull(),
  classRankUrl: text("classRankUrl").notNull(),
  stars: integer("stars").notNull(),
  versionPlayCount: integer("versionPlayCount").notNull(),
  totalPlayCount: integer("totalPlayCount").notNull(),
  iconUrl: text("iconUrl").notNull(),
  displayName: text("displayName").notNull(),
  title: text("title").notNull(),
});

export const songs = sqliteTable("songs", {
  id: text("id").primaryKey(),
  songName: text("songName").notNull(),
  artist: text("artist").notNull(),
  cover: text("cover").notNull(), // URL
  difficulty: text("difficulty", { enum: ["basic", "advanced", "expert", "master", "remaster", "utage"] }).notNull(),
  level: text("level", { 
    enum: ["1", "1+", "2", "2+", "3", "3+", "4", "4+", "5", "5+", "6", "6+", "7", "7+", "8", "8+", "9", "9+", "10", "10+", "11", "11+", "12", "12+", "13", "13+", "14", "14+", "15", "15+", "16", "16+"] 
  }).notNull(),
  levelPrecise: integer("levelPrecise").notNull(), // stored as 10x, e.g., 16.5 = 165
  type: text("type", { enum: ["std", "dx"] }).notNull(),
  genre: text("genre").notNull(), // Will define enum later based on maimai genres
  region: text("region", { enum: ["intl", "jp"] }).notNull(),
  gameVersion: integer("gameVersion").notNull(),
}, (table) => ({
  songNameDifficultyTypeRegionVersionUnique: unique("song_name_difficulty_type_region_version_unique").on(table.songName, table.difficulty, table.type, table.region, table.gameVersion),
}));

export const userScores = sqliteTable("user_scores", {
  id: text("id").primaryKey(),
  snapshotId: text("snapshotId").notNull().references(() => userSnapshots.id, { onDelete: "cascade" }),
  songId: text("songId").notNull().references(() => songs.id, { onDelete: "cascade" }),
  achievement: integer("achievement").notNull(), // stored as 10000x, e.g., 99.1234% = 991234
  dxScore: integer("dxScore").notNull(),
  fc: text("fc", { enum: ["none", "fc", "fc+", "ap", "ap+"] }).notNull(),
  fs: text("fs", { enum: ["none", "sync", "fs", "fs+", "fdx", "fdx+"] }).notNull(),
});

export const detailedScores = sqliteTable("detailed_scores", {
  id: text("id").primaryKey(),
  snapshotId: text("snapshotId").notNull().references(() => userSnapshots.id, { onDelete: "cascade" }),
  songId: text("songId").notNull().references(() => songs.id, { onDelete: "cascade" }),
  playIndex: integer("playIndex").notNull(),
  played: integer("played", { mode: "timestamp" }).notNull(),
  fast: integer("fast").notNull(),
  late: integer("late").notNull(),
  achievement: integer("achievement").notNull(), // stored as 10000x
  dxScore: integer("dxScore").notNull(),
  fc: text("fc", { enum: ["none", "fc", "fc+", "ap", "ap+"] }).notNull(),
  fs: text("fs", { enum: ["none", "sync", "fs", "fs+", "fdx", "fdx+"] }).notNull(),
  tapPerf: integer("tapPerf").notNull(),
  tapGreat: integer("tapGreat").notNull(),
  tapGood: integer("tapGood").notNull(),
  tapMiss: integer("tapMiss").notNull(),
  holdPerf: integer("holdPerf").notNull(),
  holdGreat: integer("holdGreat").notNull(),
  holdGood: integer("holdGood").notNull(),
  holdMiss: integer("holdMiss").notNull(),
  slidePerf: integer("slidePerf").notNull(),
  slideGreat: integer("slideGreat").notNull(),
  slideGood: integer("slideGood").notNull(),
  slideMiss: integer("slideMiss").notNull(),
  touchPerf: integer("touchPerf").notNull(),
  touchGreat: integer("touchGreat").notNull(),
  touchGood: integer("touchGood").notNull(),
  touchMiss: integer("touchMiss").notNull(),
  breakCritPerf: integer("breakCritPerf").notNull(),
  breakPerf: integer("breakPerf").notNull(),
  breakGreat: integer("breakGreat").notNull(),
  breakGood: integer("breakGood").notNull(),
  breakMiss: integer("breakMiss").notNull(),
  venue: text("venue"),
}); 