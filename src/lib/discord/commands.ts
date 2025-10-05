import { handleProfileCommand } from './commands/profile';
import { handleTopCommand } from './commands/top';
import { handleInviteCommand } from './commands/invite';
import { createUnknownCommandResponse, DiscordResponse } from './responses';

// Command definitions
export const COMMANDS = {
  INVITE: {
    name: 'invite',
    description: 'Get an invite link to add tomomai ともマイ bot to your server',
  },
  PROFILE: {
    name: 'profile',
    description: 'Show your latest maimai rating (International region)',
  },
  PROFILEJP: {
    name: 'profilejp', 
    description: 'Show your latest maimai rating (Japan region)',
  },
  TOP: {
    name: 'top',
    description: 'Fetch and update your latest maimai scores (International region)',
  },
  TOPJP: {
    name: 'topjp', 
    description: 'Fetch and update your latest maimai scores (Japan region)',
  },
} as const;

export interface CommandContext {
  commandName: string;
  discordUserId?: string;
  applicationId: string;
  interactionToken: string;
}

export async function handleCommand(context: CommandContext): Promise<DiscordResponse> {
  const { commandName, discordUserId, applicationId, interactionToken } = context;

  switch (commandName.toLowerCase()) {
    case COMMANDS.PROFILE.name.toLowerCase():
    case COMMANDS.PROFILEJP.name.toLowerCase():
      if (!discordUserId) {
        return createUnknownCommandResponse();
      }
      const region = commandName.toLowerCase() === 'profilejp' ? 'jp' : 'intl';
      return handleProfileCommand({ 
        discordUserId, 
        region, 
        applicationId, 
        interactionToken 
      });

    case COMMANDS.TOP.name.toLowerCase():
    case COMMANDS.TOPJP.name.toLowerCase():
      if (!discordUserId) {
        return createUnknownCommandResponse();
      }
      const fetchRegion = commandName.toLowerCase() === 'topjp' ? 'jp' : 'intl';
      return handleTopCommand({ 
        discordUserId, 
        region: fetchRegion, 
        applicationId, 
        interactionToken 
      });

    case COMMANDS.INVITE.name.toLowerCase():
      return handleInviteCommand({ applicationId });

    default:
      return createUnknownCommandResponse();
  }
}
