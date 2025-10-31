import { db } from "@/lib/db";
import { getCurrentVersion, getVersionFromDate } from "@/lib/metadata";
import { normalizeName } from "@/lib/name-utils";
import { songs } from "@/lib/schema";
import { randomUUID } from "crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { promises as fs } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { resolveBaseUrl } from "@/lib/base-url";

const MAIMAI_SONGS_JSON_URL = "https://github.com/zvuc/otoge-db/raw/refs/heads/master/maimai/data/music-ex.json";
const MAIMAI_SONGS_JSON_URL_INTL = "https://github.com/zvuc/otoge-db/raw/refs/heads/master/maimai/data/music-ex-intl.json";

const MODIFY_DATABASE = true;
const SAVE_TO_FILE = false;

type Song = {
  songName: string;
  artist: string;
  cover: string;
  difficulty: "basic" | "advanced" | "expert" | "master" | "remaster" | "utage";
  level: "1" | "1+" | "2" | "2+" | "3" | "3+" | "4" | "4+" | "5" | "5+" | "6" | "6+" | "7" | "7+" | "8" | "8+" | "9" | "9+" | "10" | "10+" | "11" | "11+" | "12" | "12+" | "13" | "13+" | "14" | "14+" | "15" | "15+" | "16" | "16+";
  levelPrecise: number;
  type: "std" | "dx";
  genre: string;
  addedVersion: number;
}

type SongsJsonRecord = {
  sort: string;
  title: string;
  title_kana: string;
  artist: string;
  catcode: string;
  version: string;
  bpm: string;
  image_url: string;
  release: string;
  intl: "0" | "1";
  date_added: string;
  date_intl_added?: string;
  date_updated: string;
  date_intl_updated?: string;
} & Partial<{
  lev_bas: string;
  lev_bas_i: string;
  lev_bas_notes: string;
  lev_bas_notes_tap: string;
  lev_bas_notes_hold: string;
  lev_bas_notes_slide: string;
  lev_bas_notes_break: string;
  lev_bas_designer?: string;
}> & Partial<{
  lev_adv: string;
  lev_adv_i: string;
  lev_adv_notes: string;
  lev_adv_notes_tap: string;
  lev_adv_notes_hold: string;
  lev_adv_notes_slide: string;
  lev_adv_notes_break: string;
  lev_adv_designer?: string;
}> & Partial<{
  lev_exp: string;
  lev_exp_i: string;
  lev_exp_notes: string;
  lev_exp_notes_tap: string;
  lev_exp_notes_hold: string;
  lev_exp_notes_slide: string;
  lev_exp_notes_break: string;
  lev_exp_designer?: string;
}> & Partial<{
  lev_mas: string;
  lev_mas_i: string;
  lev_mas_notes: string;
  lev_mas_notes_tap: string;
  lev_mas_notes_hold: string;
  lev_mas_notes_slide: string;
  lev_mas_notes_break: string;
  lev_mas_designer?: string;
}> & Partial<{
  lev_remas: string;
  lev_remas_i: string;
  lev_remas_notes: string;
  lev_remas_notes_tap: string;
  lev_remas_notes_hold: string;
  lev_remas_notes_slide: string;
  lev_remas_notes_break: string;
  lev_remas_designer?: string;
}> & Partial<{
  lev_utage: string;
  lev_utage_notes: string;
  lev_utage_notes_tap: string;
  lev_utage_notes_hold: string;
  lev_utage_notes_slide: string;
  lev_utage_notes_break: string;
  lev_utage_designer?: string;
}> & Partial<{
  dx_lev_bas: string;
  dx_lev_bas_i: string;
  dx_lev_bas_notes: string;
  dx_lev_bas_notes_tap: string;
  dx_lev_bas_notes_hold: string;
  dx_lev_bas_notes_slide: string;
  dx_lev_bas_notes_break: string;
  dx_lev_bas_designer?: string;
}> & Partial<{
  dx_lev_adv: string;
  dx_lev_adv_i: string;
  dx_lev_adv_notes: string;
  dx_lev_adv_notes_tap: string;
  dx_lev_adv_notes_hold: string;
  dx_lev_adv_notes_slide: string;
  dx_lev_adv_notes_break: string;
  dx_lev_adv_designer?: string;
}> & Partial<{
  dx_lev_exp: string;
  dx_lev_exp_i: string;
  dx_lev_exp_notes: string;
  dx_lev_exp_notes_tap: string;
  dx_lev_exp_notes_hold: string;
  dx_lev_exp_notes_slide: string;
  dx_lev_exp_notes_break: string;
  dx_lev_exp_designer?: string;
}> & Partial<{
  dx_lev_mas: string;
  dx_lev_mas_i: string;
  dx_lev_mas_notes: string;
  dx_lev_mas_notes_tap: string;
  dx_lev_mas_notes_hold: string;
  dx_lev_mas_notes_slide: string;
  dx_lev_mas_notes_break: string;
  dx_lev_mas_designer?: string;
}> & Partial<{
  dx_lev_remas: string;
  dx_lev_remas_i: string;
  dx_lev_remas_notes: string;
  dx_lev_remas_notes_tap: string;
  dx_lev_remas_notes_hold: string;
  dx_lev_remas_notes_slide: string;
  dx_lev_remas_notes_break: string;
  dx_lev_remas_designer?: string;
}>;

// Helper function to convert level string to precise value (stored as 10x)
function levelToPrecise(level: string): number {
  const trimmedLevel = level.trim();
  
  if (trimmedLevel.endsWith('+')) {
    // Plus level: extract base number and add 6
    const baseLevel = parseInt(trimmedLevel.slice(0, -1), 10);
    if (isNaN(baseLevel)) {
      console.warn(`Invalid plus level format: ${level}`);
      return 10; // Default to 1.0 (10)
    }
    return baseLevel * 10 + 6;
  } else {
    // Base level: just multiply by 10
    const baseLevel = parseInt(trimmedLevel, 10);
    if (isNaN(baseLevel)) {
      console.warn(`Invalid level format: ${level}`);
      return 10; // Default to 1.0 (10)
    }
    return baseLevel * 10;
  }
}

async function fetchRecords(region: "intl" | "jp"): Promise<Song[]> {
  const url = region === "intl" ? MAIMAI_SONGS_JSON_URL_INTL : MAIMAI_SONGS_JSON_URL;
  return fetchRecordsWithUrl(region, url);
}

async function fetchRecordsWithUrl(region: "intl" | "jp", url: string): Promise<Song[]> {
  const response = await fetch(url);
  const data = await response.json();
  const prefixes = [
    ["lev_bas", "std", "basic"],
    ["dx_lev_bas", "dx", "basic"],
    ["lev_adv", "std", "advanced"],
    ["dx_lev_adv", "dx", "advanced"],
    ["lev_exp", "std", "expert"],
    ["dx_lev_exp", "dx", "expert"],
    ["lev_mas", "std", "master"],
    ["dx_lev_mas", "dx", "master"],
    ["lev_remas", "std", "remaster"],
    ["dx_lev_remas", "dx", "remaster"],
    ["lev_utage", "dx", "utage"],
  ];
  function parseDate(date: string): Date | null {
    // format of YYYYMMDD
    const match = date.match(/(\d{4})(\d{2})(\d{2})/);
    if (!match) {
      return null;
    }
    const [, year, month, day] = match;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }
  return data.flatMap((song: SongsJsonRecord) => {
    const records: Song[] = [];
    if (region === "intl" && song.intl === "0") return [];
    const addedDateString = region === "intl" ? song.date_intl_added : song.date_added;
    if (!addedDateString) {
      console.warn(`No added date found for song ${song.title} in ${region}`);
      return [];
    }
    const addedDate = parseDate(addedDateString);
    const addedVersion = addedDate ? getVersionFromDate(addedDate, region) : null;
    for (const [prefix, type, difficulty] of prefixes) {
      if (prefix in song) {
        records.push({
          songName: normalizeName(song.title),
          artist: song.artist,
          cover: region === "intl" ? `https://maimaidx-eng.com/maimai-mobile/img/Music/${song.image_url}` : `https://maimaidx.jp/maimai-mobile/img/Music/${song.image_url}`,
          difficulty: difficulty as Song["difficulty"],
          level: song[prefix as keyof SongsJsonRecord]!.replace("?", "") as Song["level"],
          levelPrecise: !!song[prefix + "_i" as keyof SongsJsonRecord] ? Math.round(parseFloat(song[prefix + "_i" as keyof SongsJsonRecord] as string) * 10)
            : levelToPrecise(song[prefix as keyof SongsJsonRecord]!.replace("?", "") as string),
          type: type as Song["type"],
          genre: song.catcode,
          addedVersion: addedVersion ?? 0,
        });
      }
    }
    return records;
  });
}

function convertToSong(record: Song, region: "intl" | "jp", gameVersion: number): typeof songs.$inferInsert {
  return {
    id: randomUUID(),
    songName: record.songName,
    artist: record.artist,
    cover: record.cover,
    difficulty: record.difficulty,
    level: record.level,
    levelPrecise: record.levelPrecise,
    type: record.type,
    genre: record.genre,
    region: region,
    gameVersion: gameVersion,
    addedVersion: record.addedVersion,
  };
}

// Helper function to format difficulty for Discord
function formatDifficulty(difficulty: string): string {
  const diffMap: Record<string, string> = {
    basic: "BAS",
    advanced: "ADV",
    expert: "EXP",
    master: "MAS",
    remaster: "REM",
    utage: "UTAGE",
  };
  return diffMap[difficulty] || difficulty.toUpperCase();
}

// Helper function to format level precise as decimal
function formatLevelPrecise(levelPrecise: number): string {
  return (levelPrecise / 10).toFixed(1);
}

// Helper function to send Discord webhook
async function sendDiscordWebhook(
  region: "intl" | "jp",
  added: typeof songs.$inferSelect[],
  deleted: typeof songs.$inferSelect[],
  modified: Array<{ old: typeof songs.$inferSelect; new: typeof songs.$inferSelect }>,
) {
  const webhookUrl = process.env.DISCORD_UPDATE_WEBHOOK;
  if (!webhookUrl) {
    console.log("DISCORD_UPDATE_WEBHOOK not set, skipping webhook notification");
    return;
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const regionName = region === "jp" ? "Japan" : "International";

  let description = "";

  // Added charts
  if (added.length > 0) {
    description += `**${added.length} Chart${added.length > 1 ? 's' : ''} Added**\n`;
    for (const song of added) {
      description += `- ${song.songName}: ${formatDifficulty(song.difficulty)} ${song.level} (${formatLevelPrecise(song.levelPrecise)})\n`;
    }
    description += "\n";
  }

  // Deleted charts
  if (deleted.length > 0) {
    description += `**${deleted.length} Chart${deleted.length > 1 ? 's' : ''} Deleted**\n`;
    for (const song of deleted) {
      description += `- ${song.songName}: ${formatDifficulty(song.difficulty)} ${song.level} (${formatLevelPrecise(song.levelPrecise)})\n`;
    }
    description += "\n";
  }

  // Modified charts (only show if level or levelPrecise changed)
  const levelChanges = modified.filter(
    m => m.old.level !== m.new.level || m.old.levelPrecise !== m.new.levelPrecise
  );
  if (levelChanges.length > 0) {
    description += `**${levelChanges.length} Chart${levelChanges.length > 1 ? 's' : ''} Updated**\n`;
    for (const { old, new: newSong } of levelChanges) {
      description += `- ${newSong.songName}: ${formatDifficulty(newSong.difficulty)} ${old.level} (${formatLevelPrecise(old.levelPrecise)}) -> ${newSong.level} (${formatLevelPrecise(newSong.levelPrecise)})\n`;
    }
    description += "\n";
  }

  // Determine color based on changes
  let color: number;
  if (deleted.length > 0) {
    color = 0xFF0000; // Red - any deleted
  } else if (added.length > 0) {
    color = 0x00FF00; // Green - songs added, no deleted
  } else if (levelChanges.length > 0) {
    color = 0xFFFF00; // Yellow - only modified
  } else {
    color = 0x808080; // Gray - no changes
  }

  const baseUrl = resolveBaseUrl();
  const payload = {
    username: "ともマイ",
    avatar_url: `${baseUrl}/icon.png`,
    embeds: [
      {
        title: `Song data update - ${dateStr} - ${regionName}`,
        description: description.trim() || "No changes detected",
        color: color,
        timestamp: now.toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Discord webhook failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Discord webhook error response: ${errorText}`);
    } else {
      console.log("Discord webhook sent successfully");
    }
  } catch (error) {
    console.error("Error sending Discord webhook:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for admin token authentication
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    // Validate token against environment variable
    const adminToken = process.env.ADMIN_UPDATE_TOKEN;
    if (!adminToken) {
      console.error("ADMIN_UPDATE_TOKEN environment variable not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (token !== adminToken) {
      console.warn("Invalid admin token attempt");
      return NextResponse.json(
        { error: "Invalid authorization token" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') as "intl" | "jp";

    if (!region || (region !== "intl" && region !== "jp")) {
      return NextResponse.json(
        { error: "Missing or invalid 'region' query parameter. Must be 'intl' or 'jp'" },
        { status: 400 }
      );
    }

    console.log(`Admin update requested: scraping maimai data for region ${region}`);

    // Get body of json, parse it, and get the fallback records (this is optional, do not error if no json is provided)
    const body = await request.json();
    const fallbackRecords: Song[] = body.fallbackRecords ?? [];

    const currentVersionForRegion = getCurrentVersion(region);
    let allRecords: Song[];
    if (region === "jp") {
      allRecords = await fetchRecords(region);
    } else {
      const [jpRecords, intlRecords] = await Promise.all([
        fetchRecordsWithUrl("jp", "https://github.com/zvuc/otoge-db/raw/refs/heads/master/maimai/data/music-ex-prismplus-final.json"),
        fetchRecords("intl"),
      ]);
      // set of both, with intl records taking precedence, the unique key should be songName-difficulty-type
      allRecords = intlRecords;
      const uniqueKeys = new Set<string>(intlRecords.map(record => `${record.songName}-${record.difficulty}-${record.type}`));
      allRecords.push(...jpRecords
        .filter(record => !uniqueKeys.has(`${record.songName}-${record.difficulty}-${record.type}`))
        .filter(record => record.addedVersion === currentVersionForRegion)
      );
    } 

    for (const record of fallbackRecords) {
      if (!allRecords.some(r => r.songName === record.songName && r.difficulty === record.difficulty && r.type === record.type)) {
        allRecords.push(record);
        console.log(`Added fallback song: ${record.songName} (${record.difficulty}, ${record.type})`);
      }
    }

    // Fetch existing songs from database before modifications
    console.log("Fetching existing songs from database...");
    const existingSongs = await db
      .select()
      .from(songs)
      .where(
        and(eq(songs.region, region), eq(songs.gameVersion, currentVersionForRegion))
      );
    console.log(`Found ${existingSongs.length} existing songs in database`);

    // Create maps for tracking changes
    const existingSongsMap = new Map(
      existingSongs.map(song => [
        `${song.songName}-${song.difficulty}-${song.type}`,
        song
      ])
    );
    const newSongsMap = new Map(
      allRecords.map(record => [
        `${record.songName}-${record.difficulty}-${record.type}`,
        record
      ])
    );

    if (SAVE_TO_FILE) {
      // Write current date to file
      const filePath = join(process.cwd(), "data", `${region}-${currentVersionForRegion}-prev.json`);
      // Select data from database
      const prevRecords = (await db.select()
        .from(songs)
        .where(and(eq(songs.region, region), eq(songs.gameVersion, currentVersionForRegion)))
        .orderBy(songs.songName, songs.difficulty, songs.type))
        .sort((a, b) => a.songName.localeCompare(b.songName) * 1000000 + a.difficulty.localeCompare(b.difficulty) * 1000 + a.type.localeCompare(b.type));
      await fs.writeFile(filePath, JSON.stringify(prevRecords, null, 2));
      console.log(`Saved ${prevRecords.length} records to ${filePath}`);

      // Write new records to file
      const newFilePath = join(process.cwd(), "data", `${region}-${currentVersionForRegion}-new.json`);
      const newRecords = allRecords.map(record => convertToSong(record, region, currentVersionForRegion))
        .map(song => ({...song, id: prevRecords.find(prev => prev.songName === song.songName && prev.difficulty === song.difficulty && prev.type === song.type)?.id ?? song.id}))
        .sort((a, b) => a.songName.localeCompare(b.songName) * 1000000 + a.difficulty.localeCompare(b.difficulty) * 1000 + a.type.localeCompare(b.type));
      await fs.writeFile(newFilePath, JSON.stringify(newRecords, null, 2));
      console.log(`Saved ${newRecords.length} records to ${newFilePath}`);
    }

    // Should upsert all records, and delete records that are not in the new data
    try {
      // Split into batches of 1000 records to avoid SQL limits
      const batchSize = 1000;
      let totalUpserted = 0;
      
      for (let i = 0; i < allRecords.length; i += batchSize) {
        const batch = allRecords.slice(i, i + batchSize);
        console.log(`Upserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allRecords.length / batchSize)} (${batch.length} records)`);

        if (MODIFY_DATABASE) await db.insert(songs)
          .values(batch.map(record => convertToSong(record, region, currentVersionForRegion)))
          .onConflictDoUpdate({
            target: [
              songs.songName,
              songs.difficulty,
              songs.type,
              songs.region,
              songs.gameVersion,
            ],
            set: {
              artist: sql`excluded.artist`,
              cover: sql`excluded.cover`,
              level: sql`excluded.level`,
              levelPrecise: sql`excluded.levelPrecise`,
              genre: sql`excluded.genre`,
              addedVersion: sql`excluded.addedVersion`,
            },
          });

        totalUpserted += batch.length;
      }
      
      console.log(`Successfully upserted ${totalUpserted} records to database`);
    } catch (error) {
      console.error("Error during batch upsert:", error);
      throw new Error(`Database upsert failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Delete records that are not in the new data
    const newRecordCompositeKeys = new Set(
      allRecords.map(
        (record) => `${record.songName}-${record.difficulty}-${record.type}`,
      ),
    );
    const recordsToDeleteCandidate = await db
      .select({
        id: songs.id,
        songName: songs.songName,
        difficulty: songs.difficulty,
        type: songs.type,
      })
      .from(songs)
      .where(
        and(eq(songs.region, region), eq(songs.gameVersion, currentVersionForRegion)),
      );

    const idsToDelete: string[] = [];
    console.log(`Found ${recordsToDeleteCandidate.length} records to delete for region ${region} and game version ${currentVersionForRegion}:`);
    for (const record of recordsToDeleteCandidate) {
      const existingCompositeKey = `${record.songName}-${record.difficulty}-${record.type}`;
      if (!newRecordCompositeKeys.has(existingCompositeKey)) {
        idsToDelete.push(record.id);
        console.log(` - ${record.songName} (${record.difficulty} ${record.type}) - ${record.id}`);
      }
    }

    if (idsToDelete.length > 0) {
      console.log(`Deleting ${idsToDelete.length} old records for region ${region} and game version ${currentVersionForRegion}.`);
      if (MODIFY_DATABASE) await db.delete(songs).where(inArray(songs.id, idsToDelete));
      console.log('Deletion complete.');
    } else {
      console.log(`No old records found to delete for region ${region} and game version ${currentVersionForRegion}.`);
    }

    // Calculate changes for Discord webhook
    const addedSongs: typeof songs.$inferSelect[] = [];
    const deletedSongs: typeof songs.$inferSelect[] = [];
    const modifiedSongs: Array<{ old: typeof songs.$inferSelect; new: typeof songs.$inferSelect }> = [];

    // Find added songs (in new but not in existing)
    for (const record of allRecords) {
      const key = `${record.songName}-${record.difficulty}-${record.type}`;
      if (!existingSongsMap.has(key)) {
        // This is a new song, convert it to the format expected
        const newSongData = convertToSong(record, region, currentVersionForRegion);
        addedSongs.push({
          ...newSongData,
          // We need to fill in the other fields that are part of $inferSelect
          id: newSongData.id,
        } as typeof songs.$inferSelect);
      } else {
        // Check if it was modified (levelPrecise changed)
        const existingSong = existingSongsMap.get(key)!;
        if (existingSong.artist !== record.artist) {
          // Check if there are two songs with different artists but the same song name and difficulty and type
          const sameSong = allRecords.find(r => r.songName === record.songName && r.difficulty === record.difficulty && r.type === record.type && r.artist !== record.artist);
          if (sameSong) {
            continue;
          } else {
            // Song changed artist, so it is a modified song
            console.log(`Song ${record.songName} (${record.difficulty} ${record.type}) changed artist from ${existingSong.artist} to ${record.artist}`);
          }
        }
        if (record.difficulty === "utage") {
          // Check amount of songs with the same song name and difficulty and type, and in utage
          const sameSongsUtage = allRecords.filter(r => r.songName === record.songName && r.difficulty === record.difficulty && r.type === record.type && r.difficulty === "utage");
          if (sameSongsUtage.length > 1) {
            continue;
          }
        }
        if (existingSong.levelPrecise !== record.levelPrecise || existingSong.level !== record.level) {
          const newSongData = convertToSong(record, region, currentVersionForRegion);
          modifiedSongs.push({
            old: existingSong,
            new: {
              ...newSongData,
              id: existingSong.id, // Keep the same ID
            } as typeof songs.$inferSelect,
          });
        }
      }
    }

    // Find deleted songs (in existing but not in new)
    for (const existingSong of existingSongs) {
      const key = `${existingSong.songName}-${existingSong.difficulty}-${existingSong.type}`;
      if (!newSongsMap.has(key)) {
        deletedSongs.push(existingSong);
      }
    }

    console.log(`Changes summary: ${addedSongs.length} added, ${deletedSongs.length} deleted, ${modifiedSongs.length} modified`);

    // Send Discord webhook notification
    await sendDiscordWebhook(region, addedSongs, deletedSongs, modifiedSongs);

    return NextResponse.json({
      success: true,
      message: "Song data update completed",
      statistics: {
        total: allRecords.length,
        added: addedSongs.length,
        deleted: idsToDelete.length,
        modified: modifiedSongs.length,
      },
    });
  } catch (error) {
    console.error("Error in admin update route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
} 