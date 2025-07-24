import { NextRequest } from 'next/server';
import { 
  InteractionType, 
  InteractionResponseType, 
  verifyKey,
  InteractionResponseFlags,
} from 'discord-interactions';
import { db } from '@/lib/db';
import { user, userSnapshots, account } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { startFetchServer, getFetchStatusServer, Region } from '@/lib/maimai-server-actions';
import { parseStatusStates, getAllStates, FETCH_STATES } from '@/lib/fetch-states';

// Discord bot configuration
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!;
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID!;

// Helper function to get user-friendly labels for fetch states
function getStateFriendlyName(state: string): string {
  switch (state) {
    case FETCH_STATES.LOGIN:
      return 'Logging in to maimai DX NET';
    case FETCH_STATES.PLAYER_DATA:
      return 'Fetching player profile';
    case FETCH_STATES.SONG_DATA_EASY:
      return 'Loading Easy scores';
    case FETCH_STATES.SONG_DATA_ADVANCED:
      return 'Loading Advanced scores';
    case FETCH_STATES.SONG_DATA_EXPERT:
      return 'Loading Expert scores';
    case FETCH_STATES.SONG_DATA_MASTER:
      return 'Loading Master scores';
    case FETCH_STATES.SONG_DATA_REMASTER:
      return 'Loading Re:MASTER scores';
    default:
      return state;
  }
}

// Define the commands
const INVITE_COMMAND = {
  name: 'invite',
  description: 'Get an invite link to add maimai friends bot to your server',
};

const PROFILE_COMMAND = {
  name: 'profile',
  description: 'Show your latest maimai rating (International region)',
};

const PROFILEJP_COMMAND = {
  name: 'profilejp', 
  description: 'Show your latest maimai rating (Japan region)',
};

const TOP_COMMAND = {
  name: 'top',
  description: 'Fetch and update your latest maimai scores (International region)',
};

const TOPJP_COMMAND = {
  name: 'topjp', 
  description: 'Fetch and update your latest maimai scores (Japan region)',
};

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const bytes = await request.bytes();
    const signature = request.headers.get('X-Signature-Ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp');

    // Verify the request is from Discord
    if (!signature || !timestamp) {
      return new Response('Missing signature headers', { status: 401 });
    }

    const isValidRequest = await verifyKey(bytes, signature, timestamp, DISCORD_PUBLIC_KEY);
    if (!isValidRequest) {
      return new Response('Invalid request signature', { status: 401 });
    }

    // Parse the interaction
    const interaction = JSON.parse(new TextDecoder().decode(bytes));

    console.log(interaction);

    // Handle PING interactions (Discord verification)
    if (interaction.type === InteractionType.PING) {
      return Response.json({
        type: InteractionResponseType.PONG,
      });
    }

    // Handle application commands (slash commands)
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { data, member } = interaction;
      const discordUserId = member?.user?.id;

      switch (data.name.toLowerCase()) {
        case PROFILE_COMMAND.name.toLowerCase():
        case PROFILEJP_COMMAND.name.toLowerCase():
          const region = data.name.toLowerCase() === 'profilejp' ? 'jp' : 'intl';
          const regionName = region === 'jp' ? 'Japan' : 'International';
          
          try {
            if (!discordUserId) {
              return Response.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: 'Unable to identify Discord user. Please try again.',
                  flags: InteractionResponseFlags.EPHEMERAL,
                },
              });
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
              return Response.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  embeds: [{
                    title: '❌ Not Registered',
                    description: `You haven't linked your Discord account to maimai friends yet!`,
                    color: 0xED4245, // Discord red
                    fields: [{
                      name: '🔗 Get Started',
                      value: '[Visit maimai friends](https://maifriends.shedaniel.moe/) to sign in with Discord and start tracking your scores!',
                      inline: false,
                    }],
                    footer: {
                      text: 'maimai friends • maimai DX score tracker',
                    },
                  }],
                  flags: InteractionResponseFlags.EPHEMERAL,
                },
              });
            }

            // Get latest snapshot for the region
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
                eq(userSnapshots.userId, dbUser.id),
                eq(userSnapshots.region, region)
              ))
              .orderBy(desc(userSnapshots.fetchedAt))
              .limit(1);

            if (!latestSnapshot) {
              return Response.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  embeds: [{
                    title: '📊 No Data Found',
                    description: `You don't have any ${regionName} region data yet!`,
                    color: 0xFEE75C, // Discord yellow
                    fields: [{
                      name: '🎯 Import Your Scores',
                      value: `[Visit maimai friends](https://maifriends.shedaniel.moe/) to import your ${regionName} maimai DX scores!`,
                      inline: false,
                    }],
                    footer: {
                      text: 'maimai friends • maimai DX score tracker',
                    },
                  }],
                  flags: InteractionResponseFlags.EPHEMERAL,
                },
              });
            }

            const rating = latestSnapshot.rating;

            // Playful rating comments based on rating ranges
            let comment = "you suck";
            if (rating >= 15000) comment = "not terrible I guess";
            else if (rating >= 14000) comment = "getting there, but you can do better";
            else if (rating >= 13000) comment = "decent effort, at least you're trying";
            else if (rating >= 12000) comment = "respectable, git good";
            else if (rating >= 11000) comment = "pretty good, for now";
            else if (rating >= 10000) comment = "impressive, as a beginner";
            else comment = "you REALLY suck";

            return Response.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                                 embeds: [{
                   title: `🎯 ${regionName} Region Rating`,
                   description: `<@${discordUserId}> ${comment}, you only have **${rating}** rating! 😤`,
                  color: 0x5865F2, // Discord blurple
                  fields: [
                    {
                      name: '⭐ Stars',
                      value: latestSnapshot.stars.toString(),
                      inline: true,
                    },
                    {
                      name: '🎮 Total Plays',
                      value: latestSnapshot.totalPlayCount.toString(),
                      inline: true,
                    },
                    {
                      name: '📅 Last Updated',
                      value: `<t:${Math.floor(latestSnapshot.fetchedAt.getTime() / 1000)}:R>`,
                      inline: true,
                    },
                  ],
                  footer: {
                    text: 'maimai friends • maimai DX score tracker',
                  },
                  timestamp: new Date().toISOString(),
                }],
              },
            });
          } catch (error) {
            console.error('Error fetching user rating:', error);
            return Response.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: 'An error occurred while fetching your rating. Please try again later.',
                flags: InteractionResponseFlags.EPHEMERAL,
              },
            });
          }
          
        case TOP_COMMAND.name.toLowerCase():
        case TOPJP_COMMAND.name.toLowerCase():
          const fetchRegion = data.name.toLowerCase() === 'topjp' ? 'jp' : 'intl';
          const fetchRegionName = fetchRegion === 'jp' ? 'Japan' : 'International';
          
          try {
            if (!discordUserId) {
              return Response.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: 'Unable to identify Discord user. Please try again.',
                  flags: InteractionResponseFlags.EPHEMERAL,
                },
              });
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
              return Response.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  embeds: [{
                    title: '❌ Not Registered',
                    description: `You haven't linked your Discord account to maimai friends yet!`,
                    color: 0xED4245, // Discord red
                    fields: [{
                      name: '🔗 Get Started',
                      value: '[Visit maimai friends](https://maifriends.shedaniel.moe/) to sign in with Discord and start tracking your scores!',
                      inline: false,
                    }],
                    footer: {
                      text: 'maimai friends • maimai DX score tracker',
                    },
                  }],
                  flags: InteractionResponseFlags.EPHEMERAL,
                },
              });
            }

            // Defer the response since fetch can take a while
            const deferredResponse = Response.json({
              type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            });

            // Start the fetch process in the background
            (async () => {
              try {                
                // Start the fetch
                const startResult = await startFetchServer(dbUser.id, fetchRegion as Region);

                // Function to edit the Discord message
                const editMessage = async (content: any) => {
                  await fetch(
                    `https://discord.com/api/v10/webhooks/${APPLICATION_ID}/${interaction.token}/messages/@original`,
                    {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(content),
                    }
                  );
                };

                // Send initial message
                await editMessage({
                  embeds: [{
                    title: `🔄 Fetching ${fetchRegionName} Data`,
                    description: `<@${discordUserId}> Starting data fetch from maimai DX NET...`,
                    color: 0xFEE75C, // Discord yellow
                    fields: [{
                      name: '📊 Status',
                      value: 'Initializing...',
                      inline: false,
                    }],
                    footer: {
                      text: 'maimai friends • maimai DX score tracker',
                    },
                    timestamp: new Date().toISOString(),
                  }],
                });

                // Poll for status updates
                const pollForUpdates = async () => {
                  const maxAttempts = 600; // 5 minutes max
                  let attempts = 0;

                  while (attempts < maxAttempts) {
                    try {
                      const status = await getFetchStatusServer(dbUser.id, fetchRegion as Region);

                      if (status && status.id === startResult.sessionId) {
                        if (status.status === "completed") {
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
                              eq(userSnapshots.userId, dbUser.id),
                              eq(userSnapshots.region, fetchRegion)
                            ))
                            .orderBy(desc(userSnapshots.fetchedAt))
                            .limit(1);

                          if (latestSnapshot) {
                            const rating = latestSnapshot.rating;
                            let comment = "you suck";
                            if (rating >= 15000) comment = "not terrible I guess";
                            else if (rating >= 14000) comment = "getting there, but you can do better";
                            else if (rating >= 13000) comment = "decent effort, at least you're trying";
                            else if (rating >= 12000) comment = "respectable, git good";
                            else if (rating >= 11000) comment = "pretty good, for now";
                            else if (rating >= 10000) comment = "impressive, as a beginner";
                            else comment = "you REALLY suck";

                            await editMessage({
                              embeds: [{
                                title: `✅ ${fetchRegionName} Data Updated`,
                                description: `<@${discordUserId}> ${comment}, you only have **${rating}** rating! 😤`,
                                color: 0x57F287, // Discord green
                                fields: [
                                  {
                                    name: '⭐ Stars',
                                    value: latestSnapshot.stars.toString(),
                                    inline: true,
                                  },
                                  {
                                    name: '🎮 Total Plays',
                                    value: latestSnapshot.totalPlayCount.toString(),
                                    inline: true,
                                  },
                                  {
                                    name: '📅 Updated',
                                    value: `<t:${Math.floor(latestSnapshot.fetchedAt.getTime() / 1000)}:R>`,
                                    inline: true,
                                  },
                                ],
                                footer: {
                                  text: 'maimai friends • maimai DX score tracker',
                                },
                                timestamp: new Date().toISOString(),
                              }],
                            });
                          } else {
                            await editMessage({
                              embeds: [{
                                title: '✅ Fetch Complete',
                                description: `<@${discordUserId}> Data fetch completed successfully!`,
                                color: 0x57F287, // Discord green
                                footer: {
                                  text: 'maimai friends • maimai DX score tracker',
                                },
                                timestamp: new Date().toISOString(),
                              }],
                            });
                          }
                          return;
                        } else if (status.status === "failed") {
                          await editMessage({
                            embeds: [{
                              title: '❌ Fetch Failed',
                              description: `<@${discordUserId}> Failed to fetch ${fetchRegionName} data: ${status.errorMessage || 'Unknown error'}`,
                              color: 0xED4245, // Discord red
                              footer: {
                                text: 'maimai friends • maimai DX score tracker',
                              },
                              timestamp: new Date().toISOString(),
                            }],
                          });
                          return;
                        } else {
                          // Still pending, update with progress
                          const allStates = getAllStates();
                          const completedStates = parseStatusStates(status.statusStates);
                          
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

                          await editMessage({
                            embeds: [{
                              title: `🔄 Fetching ${fetchRegionName} Data`,
                              description: `<@${discordUserId}> Fetching data from maimai DX NET...`,
                              color: 0xFEE75C, // Discord yellow
                              fields: [{
                                name: '📊 Status',
                                value: statusText,
                                inline: false,
                              }],
                              footer: {
                                text: 'maimai friends • maimai DX score tracker',
                              },
                              timestamp: new Date().toISOString(),
                            }],
                          });
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
                  await editMessage({
                    embeds: [{
                      title: '⏰ Fetch Timeout',
                      description: `<@${discordUserId}> The fetch is taking longer than expected. Please check your data on the website.`,
                      color: 0xFEE75C, // Discord yellow
                      fields: [{
                        name: '🌐 Check Status',
                        value: '[Visit maimai friends](https://maifriends.shedaniel.moe/) to see your latest data!',
                        inline: false,
                      }],
                      footer: {
                        text: 'maimai friends • maimai DX score tracker',
                      },
                      timestamp: new Date().toISOString(),
                    }],
                  });
                };

                await pollForUpdates();
              } catch (error) {
                console.error('Error in fetch process:', error);
                // Edit message with error
                await fetch(
                  `https://discord.com/api/v10/webhooks/${APPLICATION_ID}/${interaction.token}/messages/@original`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      embeds: [{
                        title: '❌ Fetch Error',
                        description: `<@${discordUserId}> An error occurred while fetching your data: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        color: 0xED4245, // Discord red
                        footer: {
                          text: 'maimai friends • maimai DX score tracker',
                        },
                        timestamp: new Date().toISOString(),
                      }],
                    }),
                  }
                );
              }
            })();

            return deferredResponse;
          } catch (error) {
            console.error('Error starting fetch:', error);
            return Response.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: 'An error occurred while starting the fetch. Please try again later.',
                flags: InteractionResponseFlags.EPHEMERAL,
              },
            });
          }

        case INVITE_COMMAND.name.toLowerCase():
          const botInviteUrl = `https://discord.com/oauth2/authorize?client_id=${APPLICATION_ID}&scope=applications.commands`;

          return Response.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [
                {
                  title: '🎯 Invite maimai friends',
                  description: 'Add maimai friends bot to your Discord server to track and share maimai DX scores!',
                  color: 0x5865F2, // Discord blurple
                  fields: [
                    {
                      name: '✨ Features',
                      value: '• Track scores across International and Japan regions\n• Import data directly from maimai DX NET\n• View historical progress with snapshots\n• Beautiful score analysis and rating calculations',
                      inline: false,
                    },
                    {
                      name: '🔗 Add to Server',
                      value: `[Click here to invite the bot](${botInviteUrl})`,
                      inline: false,
                    },
                    {
                      name: '🌐 Website',
                      value: 'https://maifriends.shedaniel.moe/',
                      inline: false,
                    }
                  ],
                  footer: {
                    text: 'maimai friends • maimai DX score tracker',
                  },
                  timestamp: new Date().toISOString(),
                },
              ],
              flags: 0,
            },
          });

        default:
          return Response.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unknown command',
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
      }
    }

    return new Response('Unknown interaction type', { status: 400 });
  } catch (error) {
    console.error('Error handling Discord interaction:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 