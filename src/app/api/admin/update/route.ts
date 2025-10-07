import { db } from "@/lib/db";
import { JP_AGENT, processMaimaiToken } from "@/lib/maimai-fetcher";
import { getCurrentVersion, getVersionInfo } from "@/lib/metadata";
import { songs } from "@/lib/schema";
import { load } from "cheerio";
import { randomUUID } from "crypto";
import { and, count, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";

const DXDATA_URL = "https://raw.githubusercontent.com/gekichumai/dxrating/refs/heads/main/packages/dxdata/dxdata.json";
const MAIMAI_SONGS_JSON_URL = "https://maimai.sega.jp/data/maimai_songs.json";
const MAIMAI_SONGS_JSON_URL_INTL = "https://maimai.sega.com/assets/data/maimai_songs.json";

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

// Helper function to fetch dxdata.json
async function fetchDxDataJson(): Promise<any> {
  console.log("Fetching dxdata.json...");
  const dxDataResponse = await fetch(DXDATA_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });

  if (dxDataResponse.status !== 200) {
    throw new Error(`Failed to fetch dxdata.json: HTTP ${dxDataResponse.status}`);
  }

  const dxData = await dxDataResponse.json();
  console.log(`Loaded ${dxData.songs.length} songs from dxdata.json`);
  return dxData;
}

// Helper function to get internal level value from dxdata.json
function getInternalLevelFromDxData(
  songTitle: string, 
  type: "dx" | "std", 
  difficulty: string, 
  region: "intl" | "jp",
  dxData: any
): number | null {
  // Find the song by title
  const song = dxData.songs.find((s: any) => s.title.normalize("NFKC") === songTitle);
  if (!song) {
    return null;
  }

  // Find the sheet by type and difficulty
  const sheet = song.sheets.find((s: any) => s.type === type && s.difficulty === difficulty);
  if (!sheet) {
    return null;
  }

  // Get current version info for the region
  const currentVersionId = getCurrentVersion(region);
  const currentVersionInfo = getVersionInfo(currentVersionId);
  if (!currentVersionInfo) {
    return null;
  }

  let internalLevel: number;

  // Check if multiverInternalLevelValue exists and contains our version
  if (sheet.multiverInternalLevelValue && typeof sheet.multiverInternalLevelValue === 'object') {
    const versionLevel = sheet.multiverInternalLevelValue[currentVersionInfo.shortName];
    if (typeof versionLevel === 'number') {
      internalLevel = versionLevel;
    } else {
      // Fallback to default internalLevelValue
      internalLevel = sheet.internalLevelValue;
    }
  } else {
    // Use default internalLevelValue
    internalLevel = sheet.internalLevelValue;
  }

  // Convert to 10x format and return
  return Math.round(internalLevel * 10);
}

// Helper function to get precise level value (tries dxdata first, falls back to levelToPrecise)
function getPreciseLevelValue(
  songTitle: string,
  level: string,
  type: "dx" | "std",
  difficulty: string,
  region: "intl" | "jp",
  dxData: any
): number {
  // Try to get from dxdata.json first
  const dxDataLevel = getInternalLevelFromDxData(songTitle, type, difficulty, region, dxData);
  if (dxDataLevel !== null) {
    console.log(`Using dxdata internal level for ${songTitle} (${type}/${difficulty}): ${dxDataLevel / 10}`);
    return dxDataLevel;
  }

  // Fallback to original levelToPrecise logic
  console.log(`Using fallback level calculation for ${songTitle} (${type}/${difficulty}): ${level}`);
  return levelToPrecise(level);
}

// Helper function to get cookies from redirect URL
async function getCookiesFromRedirect(region: "intl" | "jp", redirectUrl: string, redirectCookies: string | null): Promise<string> {
  console.log(`Fetching redirect URL to get login cookies: ${redirectUrl}`);
  
  const loginResponse = await fetch(redirectUrl, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      ...(redirectCookies ? { "Cookie": redirectCookies } : {}),
    },
    redirect: "manual", // Don't follow redirects,
    ...(region === "jp" ? { dispatcher: JP_AGENT } : {}),
  });

  console.log(`Login response status: ${loginResponse.status}`);

  // Extract Set-Cookie headers
  let setCookieHeaders: string[] = [];
  if (loginResponse.headers.getSetCookie) {
    setCookieHeaders = loginResponse.headers.getSetCookie();
  } else {
    // Fallback for environments that don't support getSetCookie()
    const cookieHeader = loginResponse.headers.get('set-cookie');
    if (cookieHeader) {
      setCookieHeaders = [cookieHeader];
    }
  }
  
  if (setCookieHeaders.length === 0) {
    throw new Error("No cookies received from login redirect");
  }

  console.log(`Received ${setCookieHeaders.length} cookies from login`);

  // Parse cookies into a single Cookie header value
  const cookies = setCookieHeaders.map(header => {
    // Extract just the name=value part (before first semicolon)
    const cookiePart = header.split(';')[0];
    return cookiePart;
  }).join('; ');

  console.log(`Parsed cookies for song data request`);
  return cookies;
}

// Helper function to fetch and parse song data for a specific difficulty and version
async function fetchSongDataForDifficulty(region: "intl" | "jp", cookies: string, difficulty: number, version: number): Promise<any[]> {
  const songsUrl = `https://${region === "intl" ? "maimaidx-eng.com" : "maimaidx.jp"}/maimai-mobile/record/musicVersion/search/?version=${version}&diff=${difficulty}`;
  console.log(`Fetching songs data for version ${version}, difficulty ${difficulty} from: ${songsUrl}`);

  const songsResponse = await fetch(songsUrl, {
    method: "GET",
    headers: {
      "Cookie": cookies,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Referer": `https://${region === "intl" ? "maimaidx-eng.com" : "maimaidx.jp"}/maimai-mobile/`,
    },
    ...(region === "jp" ? { dispatcher: JP_AGENT } : {}),
  });

  console.log(`Songs data response status for version ${version}, difficulty ${difficulty}: ${songsResponse.status}`);

  if (songsResponse.status !== 200) {
    throw new Error(`Failed to fetch songs data for version ${version}, difficulty ${difficulty}: HTTP ${songsResponse.status}`);
  }

  const songsHtml = await songsResponse.text();
  console.log(`Songs data for version ${version}, difficulty ${difficulty} fetched successfully, length: ${songsHtml.length} characters`);
  
  return parseSongData(songsHtml, difficulty, version);
}

// Helper function to parse song data from HTML
function parseSongData(html: string, difficulty: number, version: number): any[] {
  const $ = load(html);
  
  // Use correct selector based on difficulty
  const difficultySelectors = [
    ".music_basic_score_back",      // difficulty 0
    ".music_advanced_score_back",   // difficulty 1
    ".music_expert_score_back",     // difficulty 2
    ".music_master_score_back",     // difficulty 3
    ".music_remaster_score_back"    // difficulty 4
  ];
  
  const selector = difficultySelectors[difficulty];
  if (!selector) {
    console.error(`Invalid difficulty: ${difficulty}`);
    return [];
  }
  
  const blocks = $(selector);
  const songs: any[] = [];

  console.log(`Found ${blocks.length} song blocks for difficulty ${difficulty} using selector ${selector}`);

  blocks.each((index, element) => {
    try {
      const block = $(element);
      const parent = block.parent();

      // Extract music type (dx/std) from icon image
      const iconElement = parent.find('img.music_kind_icon');
      if (iconElement.length === 0) {
        console.warn(`No music kind icon found for block ${index}`);
        return; // Skip this block
      }

      const iconSrc = iconElement.attr('src');
      if (!iconSrc) {
        console.warn(`No src attribute found for music kind icon in block ${index}`);
        return; // Skip this block
      }

      let musicType: "dx" | "std";
      if (iconSrc.includes('music_dx.png')) {
        musicType = "dx";
      } else if (iconSrc.includes('music_standard.png')) {
        musicType = "std";
      } else {
        console.warn(`Unknown music type icon: ${iconSrc} in block ${index}`);
        return; // Skip this block
      }

      // Extract song name
      const nameElement = block.find('.music_name_block');
      if (nameElement.length === 0) {
        console.warn(`No music name block found for block ${index}`);
        return; // Skip this block
      }
      const songName = nameElement.text().trim().normalize("NFKC");

      // Extract level
      const levelElement = block.find('.music_lv_block');
      if (levelElement.length === 0) {
        console.warn(`No music level block found for block ${index}`);
        return; // Skip this block
      }
      const level = levelElement.text().trim();

      // Extract input value and name
      const inputElement = block.find('input');
      if (inputElement.length === 0) {
        console.warn(`No input element found for block ${index}`);
        return; // Skip this block
      }
      const inputValue = inputElement.attr('value');
      const inputName = inputElement.attr('name');

      if (!inputValue || !inputName) {
        console.warn(`Input element missing value or name attribute in block ${index}`);
        return; // Skip this block
      }

      // Map difficulty number to difficulty name
      const difficultyNames = ["basic", "advanced", "expert", "master", "remaster"];
      const difficultyName = difficultyNames[difficulty] || "unknown";

      const songData = {
        songName,
        level,
        musicType,
        difficulty: difficultyName,
        inputValue,
        inputName,
        // Additional metadata
        difficultyNumber: difficulty,
        version,
        index,
      };

      songs.push(songData);

      console.log(`Extracted song ${index}: ${songName} (${level}, ${musicType}, ${difficultyName})`);
    } catch (error) {
      console.error(`Error processing song block ${index}:`, error);
    }
  });

  console.log(`Successfully extracted ${songs.length} songs for difficulty ${difficulty}`);
  return songs;
}

// Helper function to fetch detailed song information
async function fetchSongDetail(region: "intl" | "jp", cookies: string, inputName: string, inputValue: string): Promise<any> {
  const params = new URLSearchParams();
  params.append(inputName, inputValue);
  const detailUrl = `https://${region === "intl" ? "maimaidx-eng.com" : "maimaidx.jp"}/maimai-mobile/record/musicDetail/?${params.toString()}`;
  console.log(`Fetching song detail from: ${detailUrl}`);

  const detailResponse = await fetch(detailUrl, {
    method: "GET",
    headers: {
      "Cookie": cookies,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Referer": `https://${region === "intl" ? "maimaidx-eng.com" : "maimaidx.jp"}/maimai-mobile/`,
    },
    ...(region === "jp" ? { dispatcher: JP_AGENT } : {}),
  });

  console.log(`Song detail response status: ${detailResponse.status}`);

  if (detailResponse.status !== 200) {
    throw new Error(`Failed to fetch song detail: HTTP ${detailResponse.status}`);
  }

  const detailHtml = await detailResponse.text();
  console.log(`Song detail fetched successfully, length: ${detailHtml.length} characters`);
  
  return parseSongDetail(detailHtml, region);
}

// Helper function to parse detailed song information from HTML
function parseSongDetail(html: string, region: "intl" | "jp"): any {
  const $ = load(html);
  
  // Extract cover image URL
  const coverElement = $('.basic_block > img');
  if (coverElement.length === 0) {
    throw new Error("Could not find cover image in song detail");
  }
  const coverSrc = coverElement.attr('src');
  if (!coverSrc) {
    throw new Error("Cover image element found but src attribute is missing");
  }
  const coverUrl = coverSrc.startsWith('http') ? coverSrc : `https://${region === "intl" ? "maimaidx-eng.com" : "maimaidx.jp"}${coverSrc}`;

  // Extract genre
  const genreElement = $('.basic_block .blue');
  if (genreElement.length === 0) {
    throw new Error("Could not find genre element in song detail");
  }
  const genre = genreElement.text().trim();

  // Extract artist
  const artistElement = $('.basic_block .f_12.break');
  if (artistElement.length === 0) {
    throw new Error("Could not find artist element in song detail");
  }
  const artist = artistElement.text().trim();

  console.log(`Extracted song detail: cover=${coverUrl}, genre=${genre}, artist=${artist}`);

  return {
    coverUrl,
    genre,
    artist,
  };
}

// Helper function to prepare song entries from scraped difficulty data
function prepareSongEntriesFromScrapedData(difficulties: any[], jsonSong: any | undefined, region: "intl" | "jp", dxData: any): any[] {
  const difficultyNames = ["basic", "advanced", "expert", "master", "remaster"];
  const records: any[] = [];

  // Get common song info from first difficulty
  const songInfo = difficulties[0];
  const { songName, musicType } = songInfo;

  // Use JSON data for metadata if available
  const artist = jsonSong?.artist || "Unknown Artist";
  const cover = jsonSong?.image_url 
    ? `https://maimaidx.jp/maimai-mobile/img/Music/${jsonSong.image_url}`
    : "https://maimaidx.jp/maimai-mobile/img/Music/default.png";
  const genre = jsonSong?.catcode || "Unknown";
  
  const gameVersion = getCurrentVersion(region);

  // Prepare each difficulty as a separate record
  for (const difficulty of difficulties) {
    const difficultyName = difficultyNames[difficulty.difficultyNumber] || `difficulty_${difficulty.difficultyNumber}`;
    
    // Calculate addedVersion: -1 for versions 0-12, version-13 for versions 13+
    const addedVersion = difficulty.version <= 12 ? -1 : difficulty.version - 13;
    
    records.push({
      id: randomUUID(),
      songName,
      artist,
      cover,
      difficulty: difficultyName as "basic" | "advanced" | "expert" | "master" | "remaster",
      level: difficulty.level,
      levelPrecise: getPreciseLevelValue(songName, difficulty.level, musicType, difficultyName, region, dxData),
      type: musicType as "std" | "dx",
      genre,
      region,
      gameVersion,
      addedVersion,
    });
  }

  console.log(`Prepared ${records.length} difficulty entries for ${songName}@${musicType} from scraped data`);
  return records;
}

// Helper function to prepare song entries using fetched metadata
function prepareSongEntriesWithFetchedData(difficulties: any[], songDetail: any, region: "intl" | "jp", dxData: any): any[] {
  const difficultyNames = ["basic", "advanced", "expert", "master", "remaster"];
  const records: any[] = [];

  // Get common song info from first difficulty
  const songInfo = difficulties[0];
  const { songName, musicType } = songInfo;

  // Use fetched metadata
  const { artist, coverUrl, genre } = songDetail;
  
  const gameVersion = getCurrentVersion(region);

  // Prepare each difficulty as a separate record
  for (const difficulty of difficulties) {
    const difficultyName = difficultyNames[difficulty.difficultyNumber] || `difficulty_${difficulty.difficultyNumber}`;
    
    // Calculate addedVersion: -1 for versions 0-12, version-13 for versions 13+
    const addedVersion = difficulty.version <= 12 ? -1 : difficulty.version - 13;
    
    records.push({
      id: randomUUID(),
      songName,
      artist,
      cover: coverUrl,
      difficulty: difficultyName as "basic" | "advanced" | "expert" | "master" | "remaster",
      level: difficulty.level,
      levelPrecise: getPreciseLevelValue(songName, difficulty.level, musicType, difficultyName, region, dxData),
      type: musicType as "std" | "dx",
      genre,
      region,
      gameVersion,
      addedVersion,
    });
  }

  console.log(`Prepared ${records.length} difficulty entries for ${songName}@${musicType} from fetched data`);
  return records;
}

// Helper function to load fallback JSON data
async function loadFallbackJsonData(region: "intl" | "jp", version: number): Promise<any[] | null> {
  try {
    const filePath = join(process.cwd(), "data", "extra", `${region}-${version}.json`);
    console.log(`Checking for fallback JSON file: ${filePath}`);
    
    const fileContent = await fs.readFile(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);
    
    console.log(`Loaded ${jsonData.length} fallback songs from ${region}-${version}.json`);
    return jsonData;
  } catch (error) {
    console.log(`No fallback JSON file found for ${region}-${version} or error reading it:`, error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

// Helper function to load exclusion JSON data
async function loadExclusionJsonData(region: "intl" | "jp", version: number): Promise<string[] | null> {
  try {
    const filePath = join(process.cwd(), "data", "exclusion", `${region}-${version}.json`);
    console.log(`Checking for exclusion JSON file: ${filePath}`);

    if (!(await fs.stat(filePath)).isFile()) {
      console.log(`No exclusion JSON file found for ${region}-${version}`);
      return null;
    }

    const fileContent = await fs.readFile(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent) as string[];

    console.log(`Loaded ${jsonData.length} exclusion songs from ${region}-${version}.json`);
    return jsonData;
  } catch (error) {
    console.log(`No exclusion JSON file found for ${region}-${version} or error reading it:`, error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

// Helper function to convert fallback JSON songs to database records
function convertFallbackJsonToRecords(fallbackSongs: any[], region: "intl" | "jp", gameVersion: number): any[] {
  const records: any[] = [];
  const difficultyMap = {
    "easy": "basic",
    "advanced": "advanced", 
    "expert": "expert",
    "master": "master",
    "remaster": "remaster"
  };

  for (const song of fallbackSongs) {
    const { title, artist, genre, type, addedVersion, cover, levels } = song;
    
    // Process each difficulty level in the song
    for (const [difficultyKey, difficultyData] of Object.entries(levels)) {
      const mappedDifficulty = difficultyMap[difficultyKey as keyof typeof difficultyMap];
      if (!mappedDifficulty || !difficultyData) continue;
      
      const levelData = difficultyData as { level: string; levelPrecise: number };
      
      records.push({
        id: randomUUID(),
        songName: title,
        artist,
        cover,
        difficulty: mappedDifficulty as "basic" | "advanced" | "expert" | "master" | "remaster",
        level: levelData.level,
        levelPrecise: levelData.levelPrecise,
        type: type as "std" | "dx",
        genre,
        region,
        gameVersion,
        addedVersion,
      });
    }
  }

  console.log(`Converted ${records.length} records from ${fallbackSongs.length} fallback songs`);
  return records;
}

// Helper function to check if a song record already exists in the list
function songRecordExists(records: any[], songName: string, difficulty: string, type: string): boolean {
  return records.some(record => 
    record.songName === songName && 
    record.difficulty === difficulty && 
    record.type === type
  );
}

// Helper function to add fallback songs that don't already exist
function addFallbackSongs(allRecords: any[], fallbackRecords: any[]): number {
  let addedCount = 0;
  
  for (const fallbackRecord of fallbackRecords) {
    const fallbackSongName = fallbackRecord.songName.normalize("NFKC");
    if (!songRecordExists(allRecords, fallbackSongName, fallbackRecord.difficulty, fallbackRecord.type)) {
      allRecords.push(fallbackRecord);
      addedCount++;
      console.log(`Added fallback song: ${fallbackSongName} (${fallbackRecord.difficulty}, ${fallbackRecord.type})`);
    } else {
      console.log(`Skipped duplicate fallback song: ${fallbackSongName} (${fallbackRecord.difficulty}, ${fallbackRecord.type})`);
    }
  }
  
  console.log(`Added ${addedCount} fallback songs out of ${fallbackRecords.length} candidates`);
  return addedCount;
}

export async function GET(request: NextRequest) {
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
    const maimaiToken = searchParams.get('token');
    const region = searchParams.get('region') as "intl" | "jp";

    if (!maimaiToken) {
      return NextResponse.json(
        { error: "Missing 'token' query parameter" },
        { status: 400 }
      );
    }

    if (!region || (region !== "intl" && region !== "jp")) {
      return NextResponse.json(
        { error: "Missing or invalid 'region' query parameter. Must be 'intl' or 'jp'" },
        { status: 400 }
      );
    }

    console.log(`Admin update requested: scraping maimai data for region ${region}`);

    // Step 1: Validate the maimai token
    console.log("Step 1: Validating maimai token...");
    const validation = await processMaimaiToken(null, region, maimaiToken);
    
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || "Token validation failed" },
        { status: 400 }
      );
    }

    if (!validation.redirectUrl) {
      return NextResponse.json(
        { error: "No redirect URL received from token validation" },
        { status: 400 }
      );
    }

    console.log("Token validation successful, proceeding with data scraping...");

    // Step 2: Get cookies from redirect URL
    console.log("Step 2: Getting cookies from redirect URL...");
    const cookies = await getCookiesFromRedirect(region, validation.redirectUrl, validation.cookies || null);

    // Step 3: Fetch and parse song data for all difficulties (0-4) and versions
    console.log("Step 3: Fetching and parsing song data for all difficulties and versions...");
    const allSongData: any[] = [];
    
    // Get available versions for the region
    const currentVersion = getCurrentVersion(region);
    
    console.log(`Current version for region ${region}: ${currentVersion}`);
    
    // Fetch data for legacy versions (0-12) and current versions (13 to 13 + versionsCount - 1)
    const versionRanges = [
      { start: 0, end: 12, description: "legacy versions" },
      { start: 13, end: 13 + currentVersion, description: "current versions" }
    ];
    
    for (const range of versionRanges) {
      console.log(`Fetching ${range.description} (versions ${range.start}-${range.end})...`);
      
      for (let version = range.start; version <= range.end; version++) {
        const promises: Promise<any[]>[] = [];
        for (let difficulty = 0; difficulty <= 4; difficulty++) {
          console.log(`Fetching songs for version ${version}, difficulty ${difficulty}...`);
          try {
            promises.push(fetchSongDataForDifficulty(region, cookies, difficulty, version));
          } catch (error) {
            console.warn(`Failed to fetch data for version ${version}, difficulty ${difficulty}:`, error);
            // Continue with other combinations even if one fails
          }
        }
        const difficultyData = await Promise.all(promises);
        allSongData.push(...difficultyData.flat());
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Total songs fetched from all difficulties and versions: ${allSongData.length}`);

    // Step 4: Fetch maimai songs JSON data
    console.log("Step 4: Fetching maimai songs JSON data...");
    const songsJsonResponse = await fetch(region === "intl" ? MAIMAI_SONGS_JSON_URL_INTL : MAIMAI_SONGS_JSON_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (songsJsonResponse.status !== 200) {
      throw new Error(`Failed to fetch maimai songs JSON: HTTP ${songsJsonResponse.status}`);
    }

    const songsJsonData = await songsJsonResponse.json();
    console.log(`Loaded ${songsJsonData.length} songs from JSON data`);

    // Step 4.5: Fetch dxdata.json for accurate internal level values
    console.log("Step 4.5: Fetching dxdata.json for internal level values...");
    const dxData = await fetchDxDataJson();

    // Step 5: Create a map of songs by title for quick lookup
    const songsJsonMap = new Map<string, any>();
    songsJsonData.forEach((song: any) => {
      songsJsonMap.set(song.title.normalize("NFKC"), song);
    });

    // Step 6: Process songs using scraped data and JSON metadata
    console.log("Step 6: Processing songs with scraped data and JSON metadata...");
    const songsNeedingFetch: any[] = [];

    // Group songs by song name and type to combine all difficulties
    const songsGrouped = new Map<string, any[]>();
    allSongData.forEach(song => {
      const songKey = `${song.songName}@${song.musicType}`;
      if (!songsGrouped.has(songKey)) {
        songsGrouped.set(songKey, []);
      }
      songsGrouped.get(songKey)!.push(song);
    });

    console.log(`Found ${songsGrouped.size} unique songs to process...`);

    let processedFromJson = 0;
    let processedFromFetch = 0;
    const allRecordsToInsert: any[] = [];

    // Process each unique song
    for (const [songKey, difficulties] of songsGrouped) {
      try {
        // Get the first song to extract common info
        const songInfo = difficulties[0];
        const jsonSong = songsJsonMap.get(songInfo.songName);
        
        if (jsonSong) {
          // Prepare song entries from scraped difficulty data with JSON metadata
          const records = prepareSongEntriesFromScrapedData(difficulties, jsonSong, region, dxData);
          allRecordsToInsert.push(...records);
          console.log(`Successfully processed ${songKey} (with JSON data) - ${difficulties.length} difficulties`);
          processedFromJson++;
        } else {
          // Need to fetch individual song details
          console.log(`${songKey} not found in JSON, will fetch individually`);
          songsNeedingFetch.push(songInfo);
        }
        
      } catch (error) {
        console.error(`Error processing song ${songKey}:`, error);
        // Add to fetch queue as fallback
        songsNeedingFetch.push(difficulties[0]);
      }
    }

    console.log(`Processed ${processedFromJson} songs from JSON`);
    console.log(`${songsNeedingFetch.length} songs need individual fetching`);

    // Step 7: Check if any songs found in JSON were not found in pre-fetch
    console.log("Step 7: Checking if any songs found in JSON were not found in pre-fetch...");
    const currentVersionForRegion = getCurrentVersion(region);
    const exclusionData = await loadExclusionJsonData(region, currentVersionForRegion) || [];
    const songsNotFoundInPreFetch = Array.from(songsJsonMap.entries())
      .flatMap(([key, song]) => {
        const hasStd = "lev_adv" in song;
        const hasDx = "lev_dx" in song;
        const flat = []
        if (hasStd) flat.push({ songName: key, musicType: "std" });
        if (hasDx) flat.push({ songName: key, musicType: "dx" });
        return flat;
      })
      .filter(song => !exclusionData.includes(`${song.songName}@${song.musicType}`))
      .filter(song => !songsGrouped.has(`${song.songName}@${song.musicType}`));
    console.log(`Found ${songsNotFoundInPreFetch.length} songs not found in pre-fetch`);
    for (const song of songsNotFoundInPreFetch) {
      console.log(` - ${song.songName} (${song.musicType})`);
    }

    // Step 8: Fetch remaining songs individually (sequential with 500ms delay)
    if (songsNeedingFetch.length > 0) {
      console.log("Step 8: Fetching remaining songs individually...");

      for (let i = 0; i < songsNeedingFetch.length; i++) {
        const song = songsNeedingFetch[i];
        const songKey = `${song.songName}@${song.musicType}`;
        
        try {
          console.log(`Fetching details for song ${i + 1}/${songsNeedingFetch.length}: ${songKey}`);
          
          // Fetch detailed song information
          const songDetail = await fetchSongDetail(region, cookies, song.inputName, song.inputValue);
          
          // Get all difficulties for this song from the grouped data
          const difficulties = songsGrouped.get(songKey) || [];
          
          // Prepare song entries using fetched metadata
          const records = prepareSongEntriesWithFetchedData(difficulties, songDetail, region, dxData);
          allRecordsToInsert.push(...records);
          
          console.log(`Successfully processed ${songKey} (with fetched data) - ${difficulties.length} difficulties`);
          processedFromFetch++;
          
          // Add 500ms delay between requests (except for the last one)
          if (i < songsNeedingFetch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (error) {
          console.error(`Error processing song ${songKey}:`, error);
          // Continue with other songs even if one fails
        }
      }
    }

    // Step 9: Load and add fallback songs from JSON files if they exist
    console.log("Step 9: Loading fallback songs from JSON files...");
    const fallbackJsonData = await loadFallbackJsonData(region, currentVersionForRegion);
    
    let fallbackSongsAdded = 0;
    if (fallbackJsonData && fallbackJsonData.length > 0) {
      console.log(`Found fallback JSON data with ${fallbackJsonData.length} songs`);
      
      // Convert fallback JSON to database records format
      const fallbackRecords = convertFallbackJsonToRecords(fallbackJsonData, region, currentVersionForRegion);
      
      // Add fallback songs that don't already exist
      fallbackSongsAdded = addFallbackSongs(allRecordsToInsert, fallbackRecords);
      
      console.log(`Added ${fallbackSongsAdded} fallback songs from ${region}-${currentVersionForRegion}.json`);
    } else {
      console.log(`No fallback songs found for ${region}-${currentVersionForRegion}.json`);
    }

    const prevSongsLength = await db.select({ count: count() }).from(songs)
      .where(
        and(
          eq(songs.region, region),
          eq(songs.gameVersion, currentVersionForRegion),
        )
      );

    // Step 10: Batch upsert all records
    if (allRecordsToInsert.length > 0) {
      console.log(`Step 10: Performing batch upsert of ${allRecordsToInsert.length} records...`);
      
      try {
        // Split into batches of 1000 records to avoid SQL limits
        const batchSize = 1000;
        let totalUpserted = 0;
        
        for (let i = 0; i < allRecordsToInsert.length; i += batchSize) {
          const batch = allRecordsToInsert.slice(i, i + batchSize);
          console.log(`Upserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allRecordsToInsert.length / batchSize)} (${batch.length} records)`);
          
          await db.insert(songs).values(batch).onConflictDoUpdate({
            target: [songs.songName, songs.difficulty, songs.type, songs.region, songs.gameVersion],
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
    }

    const newSongsLength = await db.select({ count: count() }).from(songs)
      .where(
        and(
          eq(songs.region, region),
          eq(songs.gameVersion, currentVersionForRegion),
        )
      );

    const totalProcessed = processedFromJson + processedFromFetch;
    console.log(`Successfully processed ${totalProcessed} songs total (${processedFromJson} from JSON, ${processedFromFetch} from individual fetch, ${fallbackSongsAdded} fallback songs added)`);

    return NextResponse.json({
      success: true,
      message: "Song data update completed",
      statistics: {
        total: totalProcessed,
        fromJson: processedFromJson,
        fromFetch: processedFromFetch,
        fallbackSongsAdded,
        totalRecords: allRecordsToInsert.length,
        prevSongsLength: prevSongsLength[0].count,
        newSongsLength: newSongsLength[0].count,
        addedSongs: newSongsLength[0].count - prevSongsLength[0].count,
        region,
        gameVersion: getCurrentVersion(region),
        timestamp: new Date().toISOString(),
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

// Only allow GET requests
export async function POST() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
} 