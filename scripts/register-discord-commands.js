const fetch = require('undici').fetch;
const { config } = require('dotenv');

config({ path: ".env.local" });

// Discord bot configuration
const APPLICATION_ID = process.env.NEXT_PUBLIC_DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Define the commands to register
const commands = [
  {
    name: 'invite',
    description: 'Get an invite link to add tomomai ともマイ bot to your server',
  },
  {
    name: 'profile',
    description: 'Show your latest maimai rating (International region)',
  },
  {
    name: 'profilejp',
    description: 'Show your latest maimai rating (Japan region)',
  },
  {
    name: 'top',
    description: 'Fetch and update your latest maimai scores (International region)',
  },
  {
    name: 'topjp',
    description: 'Fetch and update your latest maimai scores (Japan region)',
  },
];

async function registerCommands() {
  if (!APPLICATION_ID || !BOT_TOKEN) {
    console.error('❌ Missing Discord environment variables');
    console.error('Please set NEXT_PUBLIC_DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in your .env file');
    process.exit(1);
  }

  try {
    console.log('🔄 Registering Discord slash commands...');

    const response = await fetch(
      `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${BOT_TOKEN}`,
        },
        body: JSON.stringify(commands),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Successfully registered commands:');
      data.forEach(command => {
        console.log(`   • /${command.name} - ${command.description}`);
      });
    } else {
      const errorText = await response.text();
      console.error('❌ Error registering commands:', response.status, errorText);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to register commands:', error.message);
    process.exit(1);
  }
}

registerCommands(); 