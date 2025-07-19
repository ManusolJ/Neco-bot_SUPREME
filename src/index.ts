import { Client, GatewayIntentBits } from "discord.js";
import "dotenv/config";

import loadAllEvents from "@utils/event-loader.util";

// Initialize Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Server information
    GatewayIntentBits.GuildMessages, // Server messages
    GatewayIntentBits.MessageContent, // Message content
    GatewayIntentBits.GuildVoiceStates, // Voice channel interactions
    GatewayIntentBits.GuildMembers, // Server member information
    GatewayIntentBits.GuildPresences, // User presence/status updates
    GatewayIntentBits.DirectMessages, // Private messages
  ],
});

// Load event handlers from filesystem
await loadAllEvents(client);

// Authenticate with Discord using token from .env
await client.login(process.env.BOT_TOKEN);
