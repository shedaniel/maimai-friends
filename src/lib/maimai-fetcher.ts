import { db } from "./db";
import { userTokens, userSnapshots } from "./schema";
import { eq, and } from "drizzle-orm";
import { load } from "cheerio";
import { randomUUID } from "crypto";
import { getCurrentVersion } from "./metadata";

export interface TokenValidationResult {
  isValid: boolean;
  redirectUrl?: string;
  error?: string;
}

export async function processMaimaiToken(
  userId: string | null,
  region: "intl" | "jp",
  token: string
): Promise<TokenValidationResult> {
  const sanitizedToken = token.trim();

  // Handle cookie:// format
  if (sanitizedToken.startsWith('cookie://')) {
    let cookieValue = sanitizedToken.substring('cookie://'.length);
    
    // Strip clal= prefix if present since validateMaimaiToken expects just the cookie value
    if (cookieValue.startsWith('clal=')) {
      cookieValue = cookieValue.substring('clal='.length);
    }
    
    return await validateMaimaiToken(userId, region, cookieValue);
  }

  // Handle account:// format
  if (sanitizedToken.startsWith('account://')) {
    const accountData = sanitizedToken.substring('account://'.length);
    
    let cookieValue: string | null = null;
    let username: string;
    let password: string;

    // Use :://  as delimiter to avoid conflicts with @ in passwords
    const parts = accountData.split(':://');

    if (parts.length === 2) {
      // Format: account://USERNAME:://PASSWORD
      username = parts[0];
      password = parts[1];
    } else if (parts.length === 3) {
      // Format: account://COOKIE:://USERNAME:://PASSWORD
      cookieValue = parts[0];
      username = parts[1];
      password = parts[2];
    } else {
      console.log("Invalid account token format, removing from database");
      if (userId) {
        await deleteToken(userId, region);
      }
      return {
        isValid: false,
        error: "Invalid account token format. Expected account://USERNAME:://PASSWORD or account://COOKIE:://USERNAME:://PASSWORD",
      };
    }

    // Validate that we have all required parts
    if (!username || !password) {
      console.log("Invalid account token format, missing username or password");
      if (userId) {
        await deleteToken(userId, region);
      }
      return {
        isValid: false,
        error: "Invalid account token format. Username and password cannot be empty.",
      };
    }

    // If we have a cookie, try to validate it first
    if (cookieValue) {
      console.log(`Trying to validate existing cookie for user ${userId}`);
      const cookieResult = await validateMaimaiToken(userId, region, cookieValue);
      if (cookieResult.isValid) {
        return cookieResult;
      }
      console.log("Existing cookie failed validation, proceeding with login");
    }

    // Proceed with login flow
    return await performAccountLogin(userId, region, username, password);
  }

  // Invalid token format
  console.log("Invalid token format, removing from database");
  if (userId) {
    await deleteToken(userId, region);
  }
  return {
    isValid: false,
    error: "Invalid token format. Token must start with 'cookie://' or 'account://'",
  };
}

async function deleteToken(userId: string, region: "intl" | "jp"): Promise<void> {
  await db
    .delete(userTokens)
    .where(
      and(
        eq(userTokens.userId, userId),
        eq(userTokens.region, region)
      )
    );
}

async function performAccountLogin(
  userId: string | null,
  region: "intl" | "jp",
  username: string,
  password: string
): Promise<TokenValidationResult> {
  const loginPageUrl = "https://lng-tgk-aime-gw.am-all.net/common_auth/login?site_id=maimaidxex&redirect_url=https://maimaidx-eng.com/maimai-mobile/&back_url=https://maimai.sega.com/";
  const loginUrl = "https://lng-tgk-aime-gw.am-all.net/common_auth/login/sid/";

  console.log(`Attempting account login for user ${userId} with username ${username}`);

  try {
    // Step 1: Get the login page to obtain JSESSIONID
    console.log("Step 1: Fetching login page to get JSESSIONID");
    const loginPageResponse = await fetch(loginPageUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual", // Don't follow redirects
    });

    console.log(`Login page response status: ${loginPageResponse.status}`);

    // Extract JSESSIONID from Set-Cookie header
    const setCookieHeader = loginPageResponse.headers.get("Set-Cookie");
    let jsessionId = "";
    
    if (setCookieHeader) {
      const jsessionMatch = setCookieHeader.match(/JSESSIONID=([^;]+)/);
      if (jsessionMatch) {
        jsessionId = jsessionMatch[1];
        console.log(`Extracted JSESSIONID: ${jsessionId.substring(0, 10)}...`);
      } else {
        console.log("Could not extract JSESSIONID from Set-Cookie header");
        if (userId) {
          await deleteToken(userId, region);
        }
        return {
          isValid: false,
          error: "Failed to obtain session ID. Please try again later.",
        };
      }
    } else {
      console.log("No Set-Cookie header in login page response");
      if (userId) {
        await deleteToken(userId, region);
      }
      return {
        isValid: false,
        error: "Failed to obtain session ID. Please try again later.",
      };
    }

    // Step 2: POST credentials with JSESSIONID cookie
    console.log("Step 2: Posting credentials with JSESSIONID");
    const params = new URLSearchParams({
      retention: '1',
      sid: username,
      password: password
    });

    const response = await fetch(`${loginUrl}?${params.toString()}`, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Cookie": `JSESSIONID=${jsessionId}`,
      },
      redirect: "manual", // Don't follow redirects
    });

    console.log(`Account login response status: ${response.status}`);

    if (response.status === 302) {
      // Login successful, extract clal cookie from Set-Cookie header
      const loginSetCookieHeader = response.headers.get("Set-Cookie");
      console.log(`Login Set-Cookie header: ${loginSetCookieHeader}`);

      if (loginSetCookieHeader) {
        // Extract clal cookie value
        const clalMatch = loginSetCookieHeader.match(/clal=([^;]+)/);
        if (clalMatch) {
          const clalValue = clalMatch[1];
          console.log(`Extracted clal cookie: ${clalValue.substring(0, 10)}...`);

          // Update token in database with new format including cookie
          const newToken = `account://${clalValue}:://${username}:://${password}`;
          
          if (userId) {
            await db
              .update(userTokens)
              .set({
                token: newToken,
                updatedAt: new Date()
              })
              .where(
                and(
                  eq(userTokens.userId, userId),
                  eq(userTokens.region, region)
                )
              );
          }

          console.log("Token updated in database with extracted cookie");

          // Get redirect URL for validation result
          const redirectUrl = response.headers.get("Location");
          console.log(`Login successful. Redirect URL: ${redirectUrl}`);

          return {
            isValid: true,
            redirectUrl: redirectUrl || undefined,
          };
        } else {
          console.log("Could not extract clal cookie from Set-Cookie header");
          if (userId) {
            await deleteToken(userId, region);
          }
          return {
            isValid: false,
            error: "Login successful but could not extract authentication cookie.",
          };
        }
      } else {
        console.log("No Set-Cookie header in login response");
        if (userId) {
          await deleteToken(userId, region);
        }
        return {
          isValid: false,
          error: "Login successful but no authentication cookie received.",
        };
      }
    } else {
      // Login failed
      console.log(`Account login failed with status: ${response.status}`);
      if (userId) {
        await deleteToken(userId, region);
      }
      return {
        isValid: false,
        error: "Login failed. Please check your username and password.",
      };
    }
  } catch (error) {
    console.error("Error during account login:", error);
    if (userId) {
      await deleteToken(userId, region);
    }
    return {
      isValid: false,
      error: "Failed to login. Please try again later.",
    };
  }
}

export async function validateMaimaiToken(
  userId: string | null, 
  region: "intl" | "jp", 
  token: string
): Promise<TokenValidationResult> {
  const loginUrl = "https://lng-tgk-aime-gw.am-all.net/common_auth/login?site_id=maimaidxex&redirect_url=https://maimaidx-eng.com/maimai-mobile/&back_url=https://maimai.sega.com/";

  // Validate and sanitize the token
  const sanitizedToken = token.trim();
  
  // Check if token contains only ASCII characters
  if (!/^[\x00-\x7F]*$/.test(sanitizedToken)) {
    console.log("Token contains non-ASCII characters, removing from database");
    
    // Remove invalid token from database
    if (userId) {
      await deleteToken(userId, region);
    }
    
    return {
      isValid: false,
      error: "Invalid token format. Please ensure you copied the clal cookie correctly (ASCII characters only).",
    };
  }

  // Check if token is not empty
  if (!sanitizedToken) {
    console.log("Empty token provided, removing from database");
    
    // Remove empty token from database
    if (userId) {
      await deleteToken(userId, region);
    }
    
    return {
      isValid: false,
      error: "Token cannot be empty.",
    };
  }

  console.log(`Validating token for user ${userId} in ${region} region (token length: ${sanitizedToken.length})`);

  try {
    const response = await fetch(loginUrl, {
      method: "GET",
      headers: {
        "Cookie": `clal=${sanitizedToken}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual", // Don't follow redirects
    });

    console.log(`Token validation response status: ${response.status}`);

    if (response.status === 302) {
      // Token is valid, get redirect URL
      const redirectUrl = response.headers.get("Location");
      console.log(`Token validation successful. Redirect URL: ${redirectUrl}`);
      
      return {
        isValid: true,
        redirectUrl: redirectUrl || undefined,
      };
    } else if (response.status === 200) {
      // Token expired, clear from database
      console.log("Token expired, clearing from database");
      
      if (userId) {
        await deleteToken(userId, region);
      }

      return {
        isValid: false,
        error: "Token has expired. Please provide a new token.",
      };
    } else {
      // Unexpected status code
      console.log(`Unexpected response status: ${response.status}`);
      return {
        isValid: false,
        error: `Unexpected response from SEGA servers (${response.status})`,
      };
    }
  } catch (error) {
    console.error("Error validating token:", error);
    return {
      isValid: false,
      error: "Failed to validate token. Please try again later.",
    };
  }
}

async function fetchPlayerDataWithLogin(redirectUrl: string): Promise<{ html: string; cookies: string }> {
  // Step 1: Follow the redirect URL to get login cookies
  console.log(`Fetching redirect URL to get login cookies: ${redirectUrl}`);
  
  const loginResponse = await fetch(redirectUrl, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
    redirect: "manual", // Don't follow redirects
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

  console.log(`Parsed cookies for player data request`);

  // Step 2: Fetch player data using the login cookies
  const playerDataUrl = "https://maimaidx-eng.com/maimai-mobile/playerData/";
  console.log(`Fetching player data from: ${playerDataUrl}`);

  const playerDataResponse = await fetch(playerDataUrl, {
    method: "GET",
    headers: {
      "Cookie": cookies,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Referer": redirectUrl,
    },
  });

  console.log(`Player data response status: ${playerDataResponse.status}`);

  if (playerDataResponse.status !== 200) {
    throw new Error(`Failed to fetch player data: HTTP ${playerDataResponse.status}`);
  }

  const playerDataHtml = await playerDataResponse.text();
  console.log(`Player data HTML length: ${playerDataHtml.length} characters`);

  // Check for error in response
  if (playerDataHtml.includes("ERROR CODE：100001") || playerDataHtml.includes("Please login again")) {
    throw new Error("Session expired or invalid. Please provide a new token.");
  }

  return { html: playerDataHtml, cookies };
}

// Fetch songs data for a specific difficulty using existing cookies
async function fetchSongsData(cookies: string, difficulty: number): Promise<string> {
  const songsUrl = `https://maimaidx-eng.com/maimai-mobile/record/musicGenre/search/?genre=99&diff=${difficulty}`;
  console.log(`Fetching songs data for difficulty ${difficulty} from: ${songsUrl}`);

  const songsResponse = await fetch(songsUrl, {
    method: "GET",
    headers: {
      "Cookie": cookies,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Referer": "https://maimaidx-eng.com/maimai-mobile/",
    },
  });

  console.log(`Songs data response status for difficulty ${difficulty}: ${songsResponse.status}`);

  if (songsResponse.status !== 200) {
    throw new Error(`Failed to fetch songs data for difficulty ${difficulty}: HTTP ${songsResponse.status}`);
  }

  const songsHtml = await songsResponse.text();
  console.log(`Songs data for difficulty ${difficulty} fetched successfully, length: ${songsHtml.length} characters`);
  
  return songsHtml;
}

// Fetch all songs data for all difficulties (0-4)
async function fetchAllSongsData(cookies: string): Promise<{ [difficulty: number]: string }> {
  const songsData: { [difficulty: number]: string } = {};
  
  console.log(`Fetching songs data for all difficulties (0-4)`);
  
  for (let difficulty = 0; difficulty <= 4; difficulty++) {
    try {
      const html = await fetchSongsData(cookies, difficulty);
      songsData[difficulty] = html;
      console.log(`Successfully fetched songs for difficulty ${difficulty}`);
    } catch (error) {
      console.error(`Failed to fetch songs for difficulty ${difficulty}:`, error);
      throw new Error(`Failed to fetch songs for difficulty ${difficulty}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  
  console.log(`Successfully fetched songs data for all difficulties`);
  return songsData;
}

interface PlayerData {
  iconUrl: string;
  displayName: string;
  rating: number;
  title: string;
  stars: number;
  versionPlayCount: number;
  totalPlayCount: number;
  courseRankUrl: string;
  classRankUrl: string;
}

async function extractPlayerData(html: string): Promise<PlayerData> {
  const $ = load(html);
  const block = $('.see_through_block');
  
  if (block.length === 0) {
    throw new Error("Could not find .see_through_block in player data");
  }
  
  // Extract icon URL
  const iconElement = block.find('img.w_112');
  if (iconElement.length === 0) {
    throw new Error("Could not find user icon in player data");
  }
  
  const iconSrc = iconElement.attr('src');
  if (!iconSrc) {
    throw new Error("User icon element found but src attribute is missing");
  }
  
  const iconUrl = iconSrc.startsWith('http') ? iconSrc : `https://maimaidx-eng.com${iconSrc}`;
  console.log(`Extracted icon URL: ${iconUrl}`);
  
  // Extract display name
  const nameElement = block.find('.name_block');
  if (nameElement.length === 0) {
    throw new Error("Could not find .name_block in player data");
  }
  const displayName = nameElement.text().trim();
  console.log(`Extracted display name: ${displayName}`);
  
  // Extract rating
  const ratingElement = block.find('.rating_block');
  if (ratingElement.length === 0) {
    throw new Error("Could not find .rating_block in player data");
  }
  const ratingText = ratingElement.text().trim();
  const rating = parseInt(ratingText, 10);
  if (isNaN(rating)) {
    throw new Error(`Invalid rating format: ${ratingText}`);
  }
  console.log(`Extracted rating: ${rating}`);
  
  // Extract title
  const titleElement = block.find('.trophy_block');
  if (titleElement.length === 0) {
    throw new Error("Could not find .trophy_block in player data");
  }
  const title = titleElement.text().trim();
  console.log(`Extracted title: ${title}`);
  
  // Extract stars
  const starsElement = block.find('.p_l_10.f_l.f_14');
  if (starsElement.length === 0) {
    throw new Error("Could not find stars element in player data");
  }
  const starsText = starsElement.text().trim();
  // Format is ×999 or x999, extract just the number part
  const starsMatch = starsText.match(/[×x](\d+)/);
  if (!starsMatch) {
    throw new Error(`Invalid stars format: ${starsText}`);
  }
  const stars = parseInt(starsMatch[1], 10);
  console.log(`Extracted stars: ${stars} (from text: ${starsText})`);
  
  // Extract play counts
  const playCountElement = block.find('.t_r.f_12');
  if (playCountElement.length === 0) {
    throw new Error("Could not find play count element in player data");
  }
  const playCountText = playCountElement.text().trim();
  console.log(`Play count text: ${playCountText}`);
  
  // Parse version play count: "play count of current version：195"
  const versionPlayCountMatch = playCountText.match(/play count of current version[：:]\s*(\d+)/);
  if (!versionPlayCountMatch) {
    throw new Error(`Could not parse version play count from: ${playCountText}`);
  }
  const versionPlayCount = parseInt(versionPlayCountMatch[1], 10);
  
  // Parse total play count: "maimaiDX total play count：909"
  const totalPlayCountMatch = playCountText.match(/maimaiDX total play count[：:]\s*(\d+)/);
  if (!totalPlayCountMatch) {
    throw new Error(`Could not parse total play count from: ${playCountText}`);
  }
  const totalPlayCount = parseInt(totalPlayCountMatch[1], 10);
  
  console.log(`Extracted version play count: ${versionPlayCount}`);
  console.log(`Extracted total play count: ${totalPlayCount}`);
  
  // Extract course rank and class rank images
  const rankElements = block.find('.h_35.f_l');
  if (rankElements.length < 2) {
    throw new Error(`Expected 2 rank elements, found ${rankElements.length}`);
  }
  
  // Course rank (first element) - the element itself is an img
  const courseRankSrc = rankElements.eq(0).attr('src');
  if (!courseRankSrc) {
    throw new Error("Course rank image src attribute is missing");
  }
  const courseRankUrl = courseRankSrc.startsWith('http') ? courseRankSrc : `https://maimaidx-eng.com${courseRankSrc}`;
  console.log(`Extracted course rank URL: ${courseRankUrl}`);
  
  // Class rank (second element) - the element itself is an img
  const classRankSrc = rankElements.eq(1).attr('src');
  if (!classRankSrc) {
    throw new Error("Class rank image src attribute is missing");
  }
  const classRankUrl = classRankSrc.startsWith('http') ? classRankSrc : `https://maimaidx-eng.com${classRankSrc}`;
  console.log(`Extracted class rank URL: ${classRankUrl}`);
  
  return {
    iconUrl,
    displayName,
    rating,
    title,
    stars,
    versionPlayCount,
    totalPlayCount,
    courseRankUrl,
    classRankUrl,
  };
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  console.log(`Fetching image for base64 encoding: ${imageUrl}`);
  
  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch icon image: HTTP ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  
  // Get content type for data URL
  const contentType = response.headers.get('content-type') || 'image/png';
  const dataUrl = `data:${contentType};base64,${base64}`;
  
  console.log(`Image encoded as base64 (${base64.length} characters)`);
  return dataUrl;
}

async function createUserSnapshot(
  userId: string,
  region: "intl" | "jp",
  playerData: PlayerData,
  iconBase64: string
): Promise<void> {
  const snapshotId = randomUUID();
  
  console.log(`Creating user snapshot with ID: ${snapshotId}`);
  
  await db.insert(userSnapshots).values({
    id: snapshotId,
    userId: userId,
    region: region,
    fetchedAt: new Date(),
    gameVersion: getCurrentVersion(region),
    rating: playerData.rating,
    courseRankUrl: playerData.courseRankUrl,
    classRankUrl: playerData.classRankUrl,
    stars: playerData.stars,
    versionPlayCount: playerData.versionPlayCount,
    totalPlayCount: playerData.totalPlayCount,
    iconUrl: iconBase64,
    displayName: playerData.displayName,
    title: playerData.title,
  });
  
  console.log(`User snapshot created successfully`);
}

export async function fetchMaimaiData(
  userId: string,
  region: "intl" | "jp",
  sessionId: string
): Promise<void> {
  // Get the user's token from database
  const tokenRecord = await db.query.userTokens.findFirst({
    where: and(
      eq(userTokens.userId, userId),
      eq(userTokens.region, region)
    ),
  });

  if (!tokenRecord) {
    throw new Error("No token found for this region. Please add your maimai token first.");
  }

  // Validate the token first
  const validation = await processMaimaiToken(userId, region, tokenRecord.token);
  
  if (!validation.isValid) {
    throw new Error(validation.error || "Token validation failed");
  }

  console.log("Token validation passed, proceeding with data fetch...");
  
  if (!validation.redirectUrl) {
    throw new Error("No redirect URL received from token validation");
  }

  try {
    // Fetch player data HTML using login flow
    const { html: playerDataHtml, cookies } = await fetchPlayerDataWithLogin(validation.redirectUrl);
    
    // Extract player data from HTML
    const playerData = await extractPlayerData(playerDataHtml);
    
    // Fetch and encode icon as base64
    const iconBase64 = await fetchImageAsBase64(playerData.iconUrl);
    
    // Fetch all songs data using the same cookies
    console.log("Starting songs data fetch...");
    const allSongsData = await fetchAllSongsData(cookies);
    console.log("Songs data fetch completed");
    
    // Create user snapshot with real player data
    await createUserSnapshot(userId, region, playerData, iconBase64);
    
    console.log("Player data processed and snapshot created successfully");
    console.log(`Session ID: ${sessionId}`);
    
  } catch (error) {
    console.error("Error during maimai data fetch:", error);
    throw error;
  }
} 