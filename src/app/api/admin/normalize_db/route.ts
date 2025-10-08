import { db } from "@/lib/db";
import { getCurrentVersion } from "@/lib/metadata";
import { normalizeName } from "@/lib/name-utils";
import { detailedScores, songs, userScores } from "@/lib/schema";
import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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
    const region = searchParams.get('region') as "intl" | "jp";

    if (!region || (region !== "intl" && region !== "jp")) {
      return NextResponse.json(
        { error: "Missing or invalid 'region' query parameter. Must be 'intl' or 'jp'" },
        { status: 400 }
      );
    }

    console.log(`Admin update requested: updating database for region ${region}`);

    // We should get all songs, then try to normalize their names, then compare to the database
    // If there are duplicates, we must first merge the data to prevent data loss
    // Then we should update the database with the new data
    const currentVersion = getCurrentVersion(region);
    const allSongs = await db.select().from(songs).where(and(eq(songs.region, region), eq(songs.gameVersion, currentVersion)));
    const songsGrouped: Record<string, typeof allSongs | undefined> = Object.groupBy(allSongs, song => `${normalizeName(song.songName)}@${song.difficulty}@${song.type}` as string);
    const filteredSongsGrouped: Record<string, typeof allSongs> = Object.fromEntries(Object.entries(songsGrouped).filter(([_, value]) => value && value.length > 1).map(([key, value]) => [key, value!]));
    
    console.log("--- Starting Duplicate Song Merge Process ---");

    let index = 0;
    let totalDuplicatesMerged = 0;
    let totalMasterNamesNormalized = 0;
  
    for (const [groupKey, duplicateSongRecords] of Object.entries(filteredSongsGrouped)) {
      console.log(`\nFound duplicates for key: "${groupKey}" (${index + 1}/${Object.entries(filteredSongsGrouped).length})`);
      index++;
      const masterSong = duplicateSongRecords[0]; // Choose the first record as the master
      const normalizedSongName = normalizeName(masterSong.songName);
  
      // Filter out the master song from the list of IDs to be considered for deletion
      const duplicateIdsToCleanUp = duplicateSongRecords
        .slice(1) // All but the first are actual duplicates
        .map((s) => s.id);
  
      // Check if the master song's name needs normalization
      const shouldUpdateMasterName = masterSong.songName !== normalizedSongName;
  
      if (duplicateIdsToCleanUp.length === 0 && !shouldUpdateMasterName) {
        console.log("  No actual duplicates to delete and master name already normalized. Skipping group.");
        continue;
      }
  
      console.log(`  Master Song ID: ${masterSong.id} (Original Name: "${masterSong.songName}")`);
      if (duplicateIdsToCleanUp.length > 0) {
        console.log(`  Duplicate Song IDs to merge/delete: ${duplicateIdsToCleanUp.join(", ")}`);
      }
  
      await db.transaction(async (tx) => {
        try {
          // --- Phase 1: Relink children and delete actual duplicate song records ---
          if (duplicateIdsToCleanUp.length > 0) {
            // Update userScores
            console.log(`  Updating userScores and detailedScores referencing ${duplicateIdsToCleanUp.join(", ")} to ${masterSong.id}...`);
            const [userScoresUpdateResult, detailedScoresUpdateResult] = await Promise.all([
              tx
                .update(userScores)
                .set({ songId: masterSong.id })
                .where(inArray(userScores.songId, duplicateIdsToCleanUp)),
              tx
                .update(detailedScores)
                .set({ songId: masterSong.id })
                .where(inArray(detailedScores.songId, duplicateIdsToCleanUp))
            ]);
            console.log(`    Updated ${userScoresUpdateResult.rowsAffected} userScores and ${detailedScoresUpdateResult.rowsAffected} detailedScores records.`);
  
            // Delete the duplicate songs records
            console.log(`  Deleting duplicate song records ${duplicateIdsToCleanUp.join(", ")} from 'songs' table...`);
            const deleteSongsResult = await tx
              .delete(songs)
              .where(inArray(songs.id, duplicateIdsToCleanUp));
            console.log(`    Deleted ${deleteSongsResult.rowsAffected} duplicate song records.`);
  
            totalDuplicatesMerged += duplicateIdsToCleanUp.length;
          }
  
          // --- Phase 2: Normalize master song's name (after duplicates are gone) ---
          if (shouldUpdateMasterName) {
            console.log(`  Normalizing master song's name from "${masterSong.songName}" to "${normalizedSongName}" (ID: ${masterSong.id})...`);
            const masterNameUpdateResult = await tx
              .update(songs)
              .set({ songName: normalizedSongName })
              .where(eq(songs.id, masterSong.id));
            console.log(`    Updated ${masterNameUpdateResult.rowsAffected} master song name record.`);
            totalMasterNamesNormalized++;
          }
  
          console.log(`  Successfully processed group for key: "${groupKey}"`);
        } catch (error) {
          console.error(`  Error processing group "${groupKey}":`, error);
          throw error; // Re-throw to ensure transaction is rolled back
        }
      });
    }
  
    console.log(`\n--- Duplicate Song Merge Process Complete ---`);
    console.log(`Total duplicate song records merged/deleted: ${totalDuplicatesMerged}`);
    console.log(`Total master song names normalized: ${totalMasterNamesNormalized}`);

    return NextResponse.json({
      success: true,
      message: "Song data normalization completed",
      statistics: {
        totalDuplicatesMerged,
        totalMasterNamesNormalized,
      },
    });
  } catch (error) {
    console.error("Error in admin normalize_db route:", error);
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