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
    console.log("Token contains non-ASCII characters");
    return {
      isValid: false,
      error: "Invalid token format. Please ensure you copied the JSESSIONID correctly (ASCII characters only).",
    };
  }

  // Check if token is not empty
  if (!sanitizedToken) {
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
        "Cookie": `JSESSIONID=${sanitizedToken}`,
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
  
  // TODO: Implement actual data fetching logic
  // For now, just log that we're ready to fetch
  console.log(`Ready to fetch maimai data for user ${userId} in ${region} region`);
  console.log(`Session ID: ${sessionId}`);
  console.log(`Redirect URL from validation: ${validation.redirectUrl}`);
} 