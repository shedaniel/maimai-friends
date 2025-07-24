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

// Discord bot configuration
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!;
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID!;

// Define the commands
const INVITE_COMMAND = {
  name: 'invite',
  description: 'Get an invite link to add maimai friends bot to your server',
};

const TOP_COMMAND = {
  name: 'top',
  description: 'Show your latest maimai rating (International region)',
};

const TOPJP_COMMAND = {
  name: 'topjp', 
  description: 'Show your latest maimai rating (Japan region)',
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
        case TOP_COMMAND.name.toLowerCase():
        case TOPJP_COMMAND.name.toLowerCase():
          const region = data.name.toLowerCase() === 'topjp' ? 'jp' : 'intl';
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