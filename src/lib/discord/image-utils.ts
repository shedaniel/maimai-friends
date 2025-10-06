import { 
  editDiscordMessage, 
  editDiscordMessageWithImage, 
  getRatingComment, 
  DISCORD_COLORS 
} from './responses';

export interface SnapshotData {
  id: string;
  rating: number;
  stars: number;
  totalPlayCount: number;
  fetchedAt: Date;
}

export interface ImageGenerationOptions {
  snapshot: SnapshotData;
  discordUserId: string;
  regionName: string;
  applicationId: string;
  interactionToken: string;
  title: string;
  username: string;
  showGeneratingStatus?: boolean;
}

export async function generateAndSendProfileImage({
  snapshot,
  discordUserId,
  regionName,
  applicationId,
  interactionToken,
  title,
  username,
  showGeneratingStatus = false,
}: ImageGenerationOptions): Promise<void> {
  const rating = snapshot.rating;
  const comment = getRatingComment(rating);

  // Show image generation status if requested
  if (showGeneratingStatus) {
    await editDiscordMessage(applicationId, interactionToken, {
      embeds: [{
        title: `🔄 Fetching ${regionName} Data`,
        description: `<@${discordUserId}> Data fetch completed, generating profile image...`,
        color: DISCORD_COLORS.YELLOW,
        fields: [{
          name: '📊 Status',
          value: '⏳ Generating Profile Image',
          inline: false,
        }],
        footer: {
          text: 'tomomai ともマイ • maimai DX score tracker',
        },
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // Generate profile URL
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
    : 'http://localhost:3000';
  const profileUrl = `${baseUrl}/profile/${username}/`;

  const embedData = {
    title,
    description: `<@${discordUserId}> ${comment}, you only have **${rating}** rating! 😤`,
    color: DISCORD_COLORS.GREEN,
    fields: [
      {
        name: '⭐ Stars',
        value: snapshot.stars.toString(),
        inline: true,
      },
      {
        name: '🎮 Total Plays',
        value: snapshot.totalPlayCount.toString(),
        inline: true,
      },
      {
        name: '📅 Updated',
        value: `<t:${Math.floor(snapshot.fetchedAt.getTime() / 1000)}:R>`,
        inline: true,
      },
    ],
    footer: {
      text: 'tomomai ともマイ • maimai DX score tracker',
    },
    timestamp: new Date().toISOString(),
  };

  const components = [
    {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 5, // Link style
          label: '🔗 View Full Profile',
          url: profileUrl,
        },
      ],
    },
  ];

  try {
    // Generate the image
    const imageResponse = await fetch(`${baseUrl}/api/export-image?snapshotId=${snapshot.id}`, {
      method: 'GET',
    });

    if (imageResponse.ok) {
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      await editDiscordMessageWithImage(applicationId, interactionToken, embedData, imageBuffer, components);
    } else {
      // Fallback to regular message if image generation fails
      console.error('Failed to generate image:', await imageResponse.text());
      await editDiscordMessage(applicationId, interactionToken, { embeds: [embedData], components });
    }
  } catch (imageError) {
    // Fallback to regular message if image generation fails
    console.error('Error generating image:', imageError);
    await editDiscordMessage(applicationId, interactionToken, { embeds: [embedData], components });
  }
}

export async function sendProfileImageResponse({
  snapshot,
  discordUserId,
  regionName,
  title,
  username,
}: {
  snapshot: SnapshotData;
  discordUserId: string;
  regionName: string;
  title: string;
  username: string;
}): Promise<{ embeds: any[], files?: any[], components?: any[] }> {
  const rating = snapshot.rating;
  const comment = getRatingComment(rating);

  // Generate profile URL
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
    : 'http://localhost:3000';
  const profileUrl = `${baseUrl}/profile/${username}/`;

  const components = [
    {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 5, // Link style
          label: '🔗 View Full Profile',
          url: profileUrl,
        },
      ],
    },
  ];

  const embedData = {
    title,
    description: `<@${discordUserId}> ${comment}, you only have **${rating}** rating! 😤`,
    color: DISCORD_COLORS.BLURPLE,
    fields: [
      {
        name: '⭐ Stars',
        value: snapshot.stars.toString(),
        inline: true,
      },
      {
        name: '🎮 Total Plays',
        value: snapshot.totalPlayCount.toString(),
        inline: true,
      },
      {
        name: '📅 Last Updated',
        value: `<t:${Math.floor(snapshot.fetchedAt.getTime() / 1000)}:R>`,
        inline: true,
      },
    ],
    footer: {
      text: 'tomomai ともマイ • maimai DX score tracker',
    },
    timestamp: new Date().toISOString(),
  };

  try {
    // Generate the image
    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
      : 'http://localhost:3000';
    const imageResponse = await fetch(`${baseUrl}/api/export-image?snapshotId=${snapshot.id}`, {
      method: 'GET',
    });

    if (imageResponse.ok) {
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      // For direct responses, we need to return the image data differently
      // This will be handled in the calling code
      return { 
        embeds: [embedData], 
        components,
        imageBuffer 
      } as any;
    } else {
      // Fallback to regular message if image generation fails
      console.error('Failed to generate image:', await imageResponse.text());
      return { embeds: [embedData], components };
    }
  } catch (imageError) {
    // Fallback to regular message if image generation fails
    console.error('Error generating image:', imageError);
    return { embeds: [embedData], components };
  }
}
