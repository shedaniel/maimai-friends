import { handleFetchCommand } from './commands/fetch';
import { handleInviteCommand } from './commands/invite';
import { handleProfileCommand } from './commands/profile';
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
  FETCH: {
    name: 'fetch',
    description: 'Refetch and update your latest maimai scores (International region)',
  },
  FETCHJP: {
    name: 'fetchjp', 
    description: 'Refetch and update your latest maimai scores (Japan region)',
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

    case COMMANDS.FETCH.name.toLowerCase():
    case COMMANDS.FETCHJP.name.toLowerCase():
      if (!discordUserId) {
        return createUnknownCommandResponse();
      }
      const fetchRegion = commandName.toLowerCase() === 'fetchjp' ? 'jp' : 'intl';
      return handleFetchCommand({ 
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
