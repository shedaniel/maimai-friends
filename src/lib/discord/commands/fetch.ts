import { db } from '@/lib/db';
import { user, userSnapshots, account } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { startFetchServer, getFetchStatusServer, Region } from '@/lib/maimai-server-actions';
import { parseStatusStates, getAllStates } from '@/lib/fetch-states';
import { waitUntil } from '@vercel/functions';
import { 
  createNotRegisteredResponse, 
  createDeferredResponse,
  createErrorResponse,
  getRatingComment,
  getStateFriendlyName,
  editDiscordMessage,
  DISCORD_COLORS,
  DiscordResponse 
} from '../responses';
import { generateAndSendProfileImage } from '../image-utils';

export interface FetchCommandOptions {
  discordUserId: string;
  region: 'intl' | 'jp';
  applicationId: string;
  interactionToken: string;
}

export async function handleFetchCommand({
  discordUserId,
  region,
  applicationId,
  interactionToken
}: FetchCommandOptions): Promise<DiscordResponse> {
  const regionName = region === 'jp' ? 'Japan' : 'International';

  try {
    if (!discordUserId) {
      return createErrorResponse('Unable to identify Discord user. Please try again.');
    }

    // Find user by Discord ID via account table
    const [dbUser] = await db
      .select({
        id: user.id,
        name: user.name,
      })
      .from(user)
      .innerJoin(account, eq(account.userId, user.id))
      .where(and(
        eq(account.accountId, discordUserId),
        eq(account.providerId, 'discord')
      ))
      .limit(1);

    if (!dbUser) {
      return createNotRegisteredResponse();
    }

    // Check current time, if it is within 4AM - 7AM in JST, throw an error
    const now = new Date();
    const jstHour = (now.getUTCHours() + 9) % 24;
    if (jstHour >= 4 && jstHour < 7) {
      return createErrorResponse("Cannot fetch data during maintenance window (4AM - 7AM JST)");
    }

    // Defer the response since fetch can take a while
    const deferredResponse = createDeferredResponse();

    // Start the fetch process in the background using waitUntil to prevent termination
    const backgroundTask = (async () => {
      try {                
        // Start the fetch
        const startResult = await startFetchServer(dbUser.id, region as Region);

        // Send initial message
        await editDiscordMessage(applicationId, interactionToken, {
          embeds: [{
            title: `🔄 Fetching ${regionName} Data`,
            description: `<@${discordUserId}> Starting data fetch from maimai DX NET...`,
            color: DISCORD_COLORS.YELLOW,
            fields: [{
              name: '📊 Status',
              value: 'Initializing...',
              inline: false,
            }],
            footer: {
              text: 'tomomai ともマイ • maimai DX score tracker',
            },
            timestamp: new Date().toISOString(),
          }],
        });

        // Poll for status updates
        await pollForUpdates(dbUser.id, dbUser.name, region, regionName, discordUserId, startResult.sessionId, applicationId, interactionToken);
      } catch (error) {
        console.error('Error in fetch process:', error);
        // Edit message with error
        await editDiscordMessage(applicationId, interactionToken, {
          embeds: [{
            title: '❌ Fetch Error',
            description: `<@${discordUserId}> An error occurred while fetching your data: ${error instanceof Error ? error.message : 'Unknown error'}`,
            color: DISCORD_COLORS.RED,
            footer: {
              text: 'tomomai ともマイ • maimai DX score tracker',
            },
            timestamp: new Date().toISOString(),
          }],
        });
       }
     })();

     // Use waitUntil to ensure the background task continues after response
     waitUntil(backgroundTask);

     return deferredResponse;
  } catch (error) {
    console.error('Error starting fetch:', error);
    return createErrorResponse('An error occurred while starting the fetch. Please try again later.');
  }
}

async function pollForUpdates(
  userId: string,
  username: string,
  region: 'intl' | 'jp',
  regionName: string,
  discordUserId: string,
  sessionId: string,
  applicationId: string,
  interactionToken: string
): Promise<void> {
  const maxAttempts = 600; // 5 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const status = await getFetchStatusServer(userId, region as Region);

      if (status && status.id === sessionId) {
        if (status.status === "completed") {
          await handleFetchCompleted(userId, username, region, regionName, discordUserId, applicationId, interactionToken);
          return;
        } else if (status.status === "failed") {
          await editDiscordMessage(applicationId, interactionToken, {
            embeds: [{
              title: '❌ Fetch Failed',
              description: `<@${discordUserId}> Failed to fetch ${regionName} data: ${status.errorMessage || 'Unknown error'}`,
              color: DISCORD_COLORS.RED,
              footer: {
                text: 'tomomai ともマイ • maimai DX score tracker',
              },
              timestamp: new Date().toISOString(),
            }],
          });
          return;
        } else {
          // Still pending, update with progress
          await updateFetchProgress(status.statusStates || '', regionName, discordUserId, applicationId, interactionToken);
        }
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 0.5 seconds
    } catch (error) {
      console.error('Error polling fetch status:', error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Timeout
  await editDiscordMessage(applicationId, interactionToken, {
    embeds: [{
      title: '⏰ Fetch Timeout',
      description: `<@${discordUserId}> The fetch is taking longer than expected. Please check your data on the website.`,
      color: DISCORD_COLORS.YELLOW,
      fields: [{
        name: '🌐 Check Status',
        value: '[Visit tomomai ともマイ](https://tomomai.lol/) to see your latest data!',
        inline: false,
      }],
      footer: {
        text: 'tomomai ともマイ • maimai DX score tracker',
      },
      timestamp: new Date().toISOString(),
    }],
  });
}

async function handleFetchCompleted(
  userId: string,
  username: string,
  region: 'intl' | 'jp',
  regionName: string,
  discordUserId: string,
  applicationId: string,
  interactionToken: string
): Promise<void> {
  // Get the updated snapshot data
  const [latestSnapshot] = await db
    .select({
      id: userSnapshots.id,
      rating: userSnapshots.rating,
      stars: userSnapshots.stars,
      totalPlayCount: userSnapshots.totalPlayCount,
      fetchedAt: userSnapshots.fetchedAt,
    })
    .from(userSnapshots)
    .where(and(
      eq(userSnapshots.userId, userId),
      eq(userSnapshots.region, region)
    ))
    .orderBy(desc(userSnapshots.fetchedAt))
    .limit(1);

  if (latestSnapshot) {
    // Generate and send the profile image using the shared utility
    await new Promise(resolve => setTimeout(resolve, 500));
    await generateAndSendProfileImage({
      snapshot: latestSnapshot,
      discordUserId,
      regionName,
      applicationId,
      interactionToken,
      title: `✅ ${regionName} Data Updated`,
      username,
      showGeneratingStatus: true,
    });
  } else {
    await editDiscordMessage(applicationId, interactionToken, {
      embeds: [{
        title: '✅ Fetch Complete',
        description: `<@${discordUserId}> Data fetch completed successfully!`,
        color: DISCORD_COLORS.GREEN,
        footer: {
          text: 'tomomai ともマイ • maimai DX score tracker',
        },
        timestamp: new Date().toISOString(),
      }],
    });
  }
}

async function updateFetchProgress(
  statusStates: string,
  regionName: string,
  discordUserId: string,
  applicationId: string,
  interactionToken: string
): Promise<void> {
  const allStates = getAllStates();
  const completedStates = parseStatusStates(statusStates);
  
  // Format all states with appropriate emojis
  const formattedStates = allStates.map(state => {
    const friendlyName = getStateFriendlyName(state);
    let emoji;
    
    if (completedStates.includes(state)) {
      emoji = '✅';
    } else {
      emoji = '⏳';
    }
    
    return `${emoji} ${friendlyName}`;
  });
  
  const statusText = formattedStates.join('\n');

  await editDiscordMessage(applicationId, interactionToken, {
    embeds: [{
      title: `🔄 Fetching ${regionName} Data`,
      description: `<@${discordUserId}> Fetching data from maimai DX NET...`,
      color: DISCORD_COLORS.YELLOW,
      fields: [{
        name: '📊 Status',
        value: statusText,
        inline: false,
      }],
      footer: {
        text: 'tomomai ともマイ • maimai DX score tracker',
      },
      timestamp: new Date().toISOString(),
    }],
  });
}
