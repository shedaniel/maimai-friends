import { db } from "./db";
import { userTokens } from "./schema";
import { eq, and } from "drizzle-orm";

export interface TokenValidationResult {
  isValid: boolean;
  redirectUrl?: string;
  error?: string;
}

export async function validateMaimaiToken(
  userId: string, 
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
    await db
      .delete(userTokens)
      .where(
        and(
          eq(userTokens.userId, userId),
          eq(userTokens.region, region)
        )
      );
    
    return {
      isValid: false,
      error: "Invalid token format. Please ensure you copied the clal cookie correctly (ASCII characters only).",
    };
  }

  // Check if token is not empty
  if (!sanitizedToken) {
    console.log("Empty token provided, removing from database");
    
    // Remove empty token from database
    await db
      .delete(userTokens)
      .where(
        and(
          eq(userTokens.userId, userId),
          eq(userTokens.region, region)
        )
      );
    
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
      
      await db
        .delete(userTokens)
        .where(
          and(
            eq(userTokens.userId, userId),
            eq(userTokens.region, region)
          )
        );

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

async function fetchPlayerDataWithLogin(redirectUrl: string): Promise<string> {
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

  return playerDataHtml;
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
  const validation = await validateMaimaiToken(userId, region, tokenRecord.token);
  
  if (!validation.isValid) {
    throw new Error(validation.error || "Token validation failed");
  }

  console.log("Token validation passed, proceeding with data fetch...");
  
  if (!validation.redirectUrl) {
    throw new Error("No redirect URL received from token validation");
  }

  try {
    // Fetch player data HTML using login flow
    const playerDataHtml = await fetchPlayerDataWithLogin(validation.redirectUrl);
    
    // TODO: Parse player data HTML and save to database
    console.log("Player data fetched successfully - parsing will be implemented next");
    console.log(`Session ID: ${sessionId}`);
    
  } catch (error) {
    console.error("Error during maimai data fetch:", error);
    throw error;
  }
} 