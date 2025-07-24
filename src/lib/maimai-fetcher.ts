import { db } from "./db";
import { userTokens, userSnapshots, songs, userScores } from "./schema";
import { eq, and } from "drizzle-orm";
import { load } from "cheerio";
import { randomUUID } from "crypto";
import { getCurrentVersion } from "./metadata";
import { Agent } from "undici";
import { FETCH_STATES, getStateForDifficulty } from "./fetch-states";
import { appendFetchState } from "./fetch-states-server";

export const JP_AGENT = new Agent({
  connect: {
    rejectUnauthorized: false
  }
});

export interface TokenValidationResult {
  isValid: boolean;
  redirectUrl?: string;
  error?: string;
  cookies?: string;
}

export async function processMaimaiToken(
  userId: string | null,
  region: "intl" | "jp",
  token: string
): Promise<TokenValidationResult> {
  const sanitizedToken = token.trim();

  // Handle cookie:// format
  if (sanitizedToken.startsWith('cookie://')) {
    if (region === "jp") {
      return {
        isValid: false,
        error: "Cookie format is not supported for Japan region.",
      };
    }

    let cookieValue = sanitizedToken.substring('cookie://'.length);
    
    // Strip clal= prefix if present since validateMaimaiToken expects just the cookie value
    if (cookieValue.startsWith('clal=')) {
      cookieValue = cookieValue.substring('clal='.length);
    }
    
    return await validateInternationalMaimaiToken(userId, cookieValue);
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
    if (cookieValue && region === "intl") {
      console.log(`Trying to validate existing cookie for user ${userId}`);
      const cookieResult = await validateInternationalMaimaiToken(userId, cookieValue);
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
  return region === "intl" ? await performInternationalAccountLogin(userId, username, password) : await performJapanAccountLogin(userId, username, password);
}

async function performJapanAccountLogin(
  userId: string | null,
  username: string,
  password: string
): Promise<TokenValidationResult> {
  const maimaiMobileUrl = "https://maimaidx.jp/maimai-mobile/";
  const submitUrl = "https://maimaidx.jp/maimai-mobile/submit/";

  console.log(`Attempting Japan account login for user ${userId} with username ${username}`);

  try {
    // Step 1: Get the maimai mobile page to obtain _t token and cookies
    console.log("Step 1: Fetching maimai mobile page to get _t token and cookies");
    const maimaiPageResponse = await fetch(maimaiMobileUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual", // Don't follow redirects
      ...{ dispatcher: JP_AGENT },
    });

    console.log(`Maimai mobile page response status: ${maimaiPageResponse.status}`);

    // Extract cookies from Set-Cookie headers
    let setCookieHeaders: string[] = [];
    if (maimaiPageResponse.headers.getSetCookie) {
      setCookieHeaders = maimaiPageResponse.headers.getSetCookie();
    } else {
      // Fallback for environments that don't support getSetCookie()
      const cookieHeader = maimaiPageResponse.headers.get('set-cookie');
      if (cookieHeader) {
        setCookieHeaders = [cookieHeader];
      }
    }
    
    if (setCookieHeaders.length === 0) {
      console.log("No Set-Cookie headers in maimai mobile page response");
      if (userId) {
        await deleteToken(userId, "jp");
      }
      return {
        isValid: false,
        error: "Failed to obtain session cookies. Please try again later.",
      };
    }

    // Extract _t token from Set-Cookie headers
    let tToken = "";
    const cookies = setCookieHeaders.map(header => {
      // Extract just the name=value part (before first semicolon)
      const cookiePart = header.split(';')[0];
      
      // Check if this is the _t token
      if (cookiePart.startsWith('_t=')) {
        tToken = cookiePart.substring(3); // Remove '_t=' prefix
        console.log(`Extracted _t token: ${tToken.substring(0, 10)}...`);
      }
      
      return cookiePart;
    }).join('; ');

    if (!tToken) {
      console.log("Could not extract _t token from Set-Cookie headers");
      if (userId) {
        await deleteToken(userId, "jp");
      }
      return {
        isValid: false,
        error: "Failed to obtain authentication token. Please try again later.",
      };
    }

    console.log(`Parsed cookies for login request: ${cookies.substring(0, 50)}...`);

    // Step 2: POST credentials with all cookies and _t token
    console.log("Step 2: Posting credentials with cookies and _t token");
    const formData = new URLSearchParams({
      segaId: username,
      password: password,
      token: tToken
    });

    const response = await fetch(submitUrl, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Cookie": cookies,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": maimaiMobileUrl,
      },
      body: formData.toString(),
      redirect: "manual", // Don't follow redirects
      ...{ dispatcher: JP_AGENT },
    });

    console.log(`Japan account login response status: ${response.status}`);

    if (response.status === 302) {
      // Check redirect URL
      const redirectUrl = response.headers.get("Location");
      console.log(`Login redirect URL: ${redirectUrl}`);

      if (!redirectUrl) {
        // 302 without redirect URL means login failed
        console.log("Login failed: 302 response without redirect URL");
        if (userId) {
          await deleteToken(userId, "jp");
        }
        return {
          isValid: false,
          error: "Login failed. Please check your username and password.",
        };
      }

      if (redirectUrl.includes("https://maimaidx.jp/maimai-mobile/aimeList/")) {
        // Login successful
        console.log("Login successful, redirecting to aimeList");

        // Return success with the aimeList submit URL and cookies
        const aimeListSubmitUrl = "https://maimaidx.jp/maimai-mobile/aimeList/submit/?idx=0";
        console.log(`Login successful. Using aimeList submit URL: ${aimeListSubmitUrl}`);

        return {
          isValid: true,
          redirectUrl: aimeListSubmitUrl,
          cookies: cookies,
        };
      } else {
        // Unexpected redirect URL
        console.log(`Unexpected redirect URL: ${redirectUrl}`);
        if (userId) {
          await deleteToken(userId, "jp");
        }
        return {
          isValid: false,
          error: "Login failed. Please check your username and password.",
        };
      }
    } else {
      // Login failed with non-302 status
      console.log(`Japan account login failed with status: ${response.status}`);
      if (userId) {
        await deleteToken(userId, "jp");
      }
      return {
        isValid: false,
        error: "Login failed. Please check your username and password.",
      };
    }
  } catch (error) {
    console.error("Error during Japan account login:", error);
    if (userId) {
      await deleteToken(userId, "jp");
    }
    return {
      isValid: false,
      error: "Failed to login. Please try again later.",
    };
  }
}

async function performInternationalAccountLogin(
  userId: string | null,
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
          await deleteToken(userId, "intl");
        }
        return {
          isValid: false,
          error: "Failed to obtain session ID. Please try again later.",
        };
      }
    } else {
      console.log("No Set-Cookie header in login page response");
      if (userId) {
        await deleteToken(userId, "intl");
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
                  eq(userTokens.region, "intl")
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
            await deleteToken(userId, "intl");
          }
          return {
            isValid: false,
            error: "Login successful but could not extract authentication cookie.",
          };
        }
      } else {
        console.log("No Set-Cookie header in login response");
        if (userId) {
          await deleteToken(userId, "intl");
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
        await deleteToken(userId, "intl");
      }
      return {
        isValid: false,
        error: "Login failed. Please check your username and password.",
      };
    }
  } catch (error) {
    console.error("Error during account login:", error);
    if (userId) {
      await deleteToken(userId, "intl");
    }
    return {
      isValid: false,
      error: "Failed to login. Please try again later.",
    };
  }
}

export async function validateInternationalMaimaiToken(
  userId: string | null, 
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
      await deleteToken(userId, "intl");
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
      await deleteToken(userId, "intl");
    }
    
    return {
      isValid: false,
      error: "Token cannot be empty.",
    };
  }

  console.log(`Validating token for user ${userId} in intl region (token length: ${sanitizedToken.length})`);

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
        await deleteToken(userId, "intl");
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

async function fetchPlayerDataWithLogin(region: "intl" | "jp", redirectUrl: string, redirectCookies: string | null): Promise<{ html: string; cookies: string }> {
  // Step 1: Follow the redirect URL to get login cookies
  console.log(`Fetching redirect URL to get login cookies: ${redirectUrl}`);
  
  const loginResponse = await fetch(redirectUrl, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      ...(redirectCookies ? { "Cookie": redirectCookies } : {}),
    },
    redirect: "manual", // Don't follow redirects
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

  console.log(`Parsed cookies for player data request`);

  // Step 2: Fetch player data using the login cookies
  const playerDataUrl = region === "jp"
    ? "https://maimaidx.jp/maimai-mobile/playerData/"
    : "https://maimaidx-eng.com/maimai-mobile/playerData/";
  console.log(`Fetching player data from: ${playerDataUrl}`);

  const playerDataResponse = await fetch(playerDataUrl, {
    method: "GET",
    headers: {
      "Cookie": cookies,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Referer": redirectUrl,
    },
    ...(region === "jp" ? { dispatcher: JP_AGENT } : {}),
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

// Parse score data from HTML for a specific difficulty
function parseScoreData(html: string, difficulty: number): ScoreData[] {
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
  const scores: ScoreData[] = [];

  console.log(`Found ${blocks.length} score blocks for difficulty ${difficulty} using selector ${selector}`);

  blocks.each((index, element) => {
    try {
      const block = $(element);
      
      // Only consider blocks that contain .music_score_block (played songs)
      const scoreBlocks = block.find('.music_score_block');
      if (scoreBlocks.length === 0) {
        return; // Skip unplayed songs
      }
      
      const parent = block.parent();

      // Extract music type (dx/std) from icon image
      const iconElement = parent.find('img.music_kind_icon');
      if (iconElement.length === 0) {
        console.warn(`No music kind icon found for score block ${index}`);
        return;
      }

      const iconSrc = iconElement.attr('src');
      if (!iconSrc) {
        console.warn(`No src attribute found for music kind icon in score block ${index}`);
        return;
      }

      let musicType: "dx" | "std";
      if (iconSrc.includes('music_dx.png')) {
        musicType = "dx";
      } else if (iconSrc.includes('music_standard.png')) {
        musicType = "std";
      } else {
        console.warn(`Unknown music type icon: ${iconSrc} in score block ${index}`);
        return;
      }

      // Extract song name
      const nameElement = block.find('.music_name_block');
      if (nameElement.length === 0) {
        console.warn(`No music name block found for score block ${index}`);
        return;
      }
      const songName = nameElement.text().trim();

      // Extract level
      const levelElement = block.find('.music_lv_block');
      if (levelElement.length === 0) {
        console.warn(`No music level block found for score block ${index}`);
        return;
      }
      const level = levelElement.text().trim();

      // Extract achievement and dx score from the two .music_score_block elements
      if (scoreBlocks.length < 2) {
        console.warn(`Expected 2 score blocks, found ${scoreBlocks.length} for song ${songName}`);
        return;
      }

      // First score block: achievement (e.g., "97.6977%")
      const achievementText = scoreBlocks.eq(0).text().trim();
      const achievementMatch = achievementText.match(/(\d+\.?\d*)%/);
      if (!achievementMatch) {
        console.warn(`Could not parse achievement: ${achievementText} for song ${songName}`);
        return;
      }
      const achievementFloat = parseFloat(achievementMatch[1]);
      const achievement = Math.round(achievementFloat * 10000); // Convert to 10000x format

      // Second score block: dx score (e.g., "758 / 963")
      const dxScoreText = scoreBlocks.eq(1).text().trim();
      const dxScoreMatch = dxScoreText.match(/(\d+)\s*\/\s*\d+/);
      if (!dxScoreMatch) {
        console.warn(`Could not parse dx score: ${dxScoreText} for song ${songName}`);
        return;
      }
      const dxScore = parseInt(dxScoreMatch[1], 10);

      // Extract fs and fc from the three .h_30 elements
      const h30Elements = block.find('.h_30');
      if (h30Elements.length < 2) {
        console.warn(`Expected at least 2 h_30 elements, found ${h30Elements.length} for song ${songName}`);
        return;
      }

      // First .h_30 is fs (sync status)
      let fs: "none" | "sync" | "fs" | "fs+" | "fdx" | "fdx+" = "none";
      const fsElement = h30Elements.eq(0);
      const fsSrc = fsElement.attr('src');
      if (fsSrc) {
        if (fsSrc.includes('_fdxp.png')) {
          fs = "fdx+";
        } else if (fsSrc.includes('_fdx.png')) {
          fs = "fdx";
        } else if (fsSrc.includes('_fsp.png')) {
          fs = "fs+";
        } else if (fsSrc.includes('_fs.png')) {
          fs = "fs";
        } else if (fsSrc.includes('_sync.png')) {
          fs = "sync";
        }
      }

      // Second .h_30 is fc (full combo status)
      let fc: "none" | "fc" | "fc+" | "ap" | "ap+" = "none";
      const fcElement = h30Elements.eq(1);
      const fcSrc = fcElement.attr('src');
      if (fcSrc) {
        if (fcSrc.includes('_app.png')) {
          fc = "ap+";
        } else if (fcSrc.includes('_ap.png')) {
          fc = "ap";
        } else if (fcSrc.includes('_fcp.png')) {
          fc = "fc+";
        } else if (fcSrc.includes('_fc.png')) {
          fc = "fc";
        }
      }

      // Map difficulty number to difficulty name
      const difficultyNames = ["basic", "advanced", "expert", "master", "remaster"];
      const difficultyName = difficultyNames[difficulty] || "unknown";

      const scoreData: ScoreData = {
        songName,
        level,
        musicType,
        difficulty: difficultyName,
        difficultyNumber: difficulty,
        achievement,
        dxScore,
        fc,
        fs,
      };

      scores.push(scoreData);

      console.log(`Extracted score ${index}: ${songName} (${level}, ${musicType}, ${difficultyName}) - ${achievementFloat}%, ${dxScore} dx, ${fc}/${fs}`);
    } catch (error) {
      console.error(`Error processing score block ${index}:`, error);
    }
  });

  console.log(`Successfully extracted ${scores.length} scores for difficulty ${difficulty}`);
  return scores;
}

// Fetch songs data for a specific difficulty using existing cookies
async function fetchSongsData(cookies: string, difficulty: number, region: "intl" | "jp"): Promise<ScoreData[]> {
  const baseUrl = region === "jp" ? "https://maimaidx.jp" : "https://maimaidx-eng.com";
  const songsUrl = `${baseUrl}/maimai-mobile/record/musicGenre/search/?genre=99&diff=${difficulty}`;
  console.log(`Fetching songs data for difficulty ${difficulty} from: ${songsUrl}`);

  const songsResponse = await fetch(songsUrl, {
    method: "GET",
    headers: {
      "Cookie": cookies,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Referer": `${baseUrl}/maimai-mobile/`,
    },
    ...(region === "jp" ? { dispatcher: JP_AGENT } : {}),
  });

  console.log(`Songs data response status for difficulty ${difficulty}: ${songsResponse.status}`);

  if (songsResponse.status !== 200) {
    throw new Error(`Failed to fetch songs data for difficulty ${difficulty}: HTTP ${songsResponse.status}`);
  }

  const songsHtml = await songsResponse.text();
  console.log(`Songs data for difficulty ${difficulty} fetched successfully, length: ${songsHtml.length} characters`);
  
  // Parse the HTML to extract score data
  const scoreData = parseScoreData(songsHtml, difficulty);
  
  return scoreData;
}

// Fetch all songs data for all difficulties (0-4)
async function fetchAllSongsData(cookies: string, region: "intl" | "jp", sessionId?: string): Promise<{ [difficulty: number]: ScoreData[] }> {
  console.log(`Fetching songs data for all difficulties (0-4)${sessionId ? ' with tracking' : ''}`);
  
  // Create promises for all difficulties to fetch concurrently
  const difficultyPromises = Array.from({ length: 5 }, (_, difficulty) => {
    return fetchSongsData(cookies, difficulty, region).then((scoreData) => {
      console.log(`Successfully fetched ${scoreData.length} scores for difficulty ${difficulty}`);
      
      // Track progress if sessionId is provided
      if (sessionId) {
        const state = getStateForDifficulty(difficulty);
        if (state) {
          appendFetchState(sessionId, state); // Fire and forget
        }
      }
      
      return { difficulty, scoreData };
    }).catch((error) => {
      console.error(`Failed to fetch songs for difficulty ${difficulty}:`, error);
      throw new Error(`Failed to fetch songs for difficulty ${difficulty}: ${error instanceof Error ? error.message : "Unknown error"}`);
    });
  });
  
  // Wait for all difficulties to complete
  const results = await Promise.all(difficultyPromises);
  
  // Convert results back to the expected format
  const songsData: { [difficulty: number]: ScoreData[] } = {};
  for (const { difficulty, scoreData } of results) {
    songsData[difficulty] = scoreData;
  }
  
  console.log(`Successfully fetched songs data for all difficulties`);
  return songsData;
}



interface PlayerData {
  iconUrl: string;
  iconBase64: string;
  displayName: string;
  rating: number;
  title: string;
  stars: number;
  versionPlayCount: number;
  totalPlayCount: number;
  courseRankUrl: string;
  classRankUrl: string;
}

interface ScoreData {
  songName: string;
  level: string;
  musicType: "dx" | "std";
  difficulty: string;
  difficultyNumber: number;
  achievement: number; // stored as 10000x
  dxScore: number;
  fc: "none" | "fc" | "fc+" | "ap" | "ap+";
  fs: "none" | "sync" | "fs" | "fs+" | "fdx" | "fdx+";
}

async function extractPlayerData(region: "intl" | "jp", html: string): Promise<PlayerData> {
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

  const playCountRegex = region === "jp" ? /現バージョンプレイ回数[：:]\s*(\d+)/ : /play count of current version[：:]\s*(\d+)/;
  const totalPlayCountRegex = region === "jp" ? /累計プレイ回数[：:]\s*(\d+)/ : /maimaiDX total play count[：:]\s*(\d+)/;
  
  // Parse version play count: "play count of current version：195"
  const versionPlayCountMatch = playCountText.match(playCountRegex);
  if (!versionPlayCountMatch) {
    throw new Error(`Could not parse version play count from: ${playCountText}`);
  }
  const versionPlayCount = parseInt(versionPlayCountMatch[1], 10);
  
  // Parse total play count: "maimaiDX total play count：909"
  const totalPlayCountMatch = playCountText.match(totalPlayCountRegex);
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
    iconBase64: await fetchImageAsBase64(region, iconUrl),
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

async function fetchImageAsBase64(region: "intl" | "jp", imageUrl: string): Promise<string> {
  console.log(`Fetching image for base64 encoding: ${imageUrl}`);
  
  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
    ...(region === "jp" ? { dispatcher: JP_AGENT } : {}),
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
): Promise<string> {
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
    iconUrl: playerData.iconBase64,
    displayName: playerData.displayName,
    title: playerData.title,
  });
  
  console.log(`User snapshot created successfully`);
  return snapshotId;
}

async function insertUserScores(
  snapshotId: string,
  region: "intl" | "jp",
  allScoreData: { [difficulty: number]: ScoreData[] }
): Promise<void> {
  const gameVersion = getCurrentVersion(region);
  
  console.log(`Starting user scores insertion for snapshot ${snapshotId}`);
  
  // Flatten all score data from all difficulties
  const allScores: ScoreData[] = [];
  for (const difficulty of Object.keys(allScoreData)) {
    allScores.push(...allScoreData[parseInt(difficulty)]);
  }
  
  console.log(`Total scores to insert: ${allScores.length}`);
  
  if (allScores.length === 0) {
    console.warn("No scores to insert");
    return;
  }
  
  // Batch query all songs for this region and game version
  console.log(`Batch querying songs for region ${region}, game version ${gameVersion}`);
  const allSongs = await db.query.songs.findMany({
    where: and(
      eq(songs.region, region),
      eq(songs.gameVersion, gameVersion)
    ),
    columns: {
      id: true,
      songName: true,
      difficulty: true,
      type: true,
    }
  });
  
  console.log(`Found ${allSongs.length} songs in database for this region/version`);
  
  // Create lookup map for fast song finding
  const songLookup = new Map<string, string>(); // key: "songName|difficulty|type", value: songId
  for (const song of allSongs) {
    const key = `${song.songName}|${song.difficulty}|${song.type}`;
    songLookup.set(key, song.id);
  }
  
  console.log(`Created song lookup map with ${songLookup.size} entries`);
  
  // Process all scores using the lookup map
  const scoreInserts: any[] = [];
  let foundCount = 0;
  let notFoundCount = 0;
  
  for (const scoreData of allScores) {
    try {
      const lookupKey = `${scoreData.songName}|${scoreData.difficulty}|${scoreData.musicType}`;
      const songId = songLookup.get(lookupKey);

      if (!songId) {
        console.warn(`Could not find song in database: ${scoreData.songName} (${scoreData.difficulty}, ${scoreData.musicType})`);
        notFoundCount++;
        continue;
      }

      // Create user score record
      const userScoreId = randomUUID();
      scoreInserts.push({
        id: userScoreId,
        snapshotId: snapshotId,
        songId: songId,
        achievement: scoreData.achievement,
        dxScore: scoreData.dxScore,
        fc: scoreData.fc,
        fs: scoreData.fs,
      });

      foundCount++;
    } catch (error) {
      console.error(`Error processing score for ${scoreData.songName}:`, error);
      notFoundCount++;
    }
  }
  
  console.log(`Prepared ${foundCount} score inserts, ${notFoundCount} songs not found in database`);
  
  if (scoreInserts.length > 0) {
    console.log(`Batch inserting ${scoreInserts.length} user scores`);
    await db.insert(userScores).values(scoreInserts);
    console.log(`Successfully inserted ${scoreInserts.length} user scores`);
  } else {
    console.warn("No valid scores to insert");
  }
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
    // Mark login state as completed (after token validation)
    appendFetchState(sessionId, FETCH_STATES.LOGIN); // Fire and forget
    
    // Fetch player data HTML using login flow
    const { html: playerDataHtml, cookies } = await fetchPlayerDataWithLogin(region, validation.redirectUrl, validation.cookies || null);
    
    // Extract player data and fetch songs data concurrently
    console.log("Starting player data extraction and songs data fetch...");
    const [playerData, allSongsData] = await Promise.all([
      // Extract player data from HTML and track progress
      extractPlayerData(region, playerDataHtml).then((data) => {
        appendFetchState(sessionId, FETCH_STATES.PLAYER_DATA); // Fire and forget
        return data;
      }),
      // Fetch all songs data using the same cookies
      fetchAllSongsData(cookies, region, sessionId)
    ]);
    console.log("Player data extraction and songs data fetch completed");
    
    // Create user snapshot with real player data
    const snapshotId = await createUserSnapshot(userId, region, playerData);
    
    // Insert user scores into database
    console.log("Starting user scores insertion...");
    await insertUserScores(snapshotId, region, allSongsData);
    console.log("User scores insertion completed");
    
    console.log("Player data processed and snapshot created successfully");
    console.log(`Session ID: ${sessionId}`);
    
  } catch (error) {
    console.error("Error during maimai data fetch:", error);
    throw error;
  }
} 