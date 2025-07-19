/**
 * Entry point for the Discord bot. Initializes the client,
 * loads event handlers, and authenticates with Discord.
 */

import { Client, GatewayIntentBits } from "discord.js";
import "dotenv/config";

import loadAllEvents from "@utils/event-loader.util";

/**
 * Instantiate the Discord client with the necessary gateway intents.
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Server metadata
    GatewayIntentBits.GuildMessages, // Reading messages in guilds
    GatewayIntentBits.MessageContent, // Access to message text content
    GatewayIntentBits.GuildVoiceStates, // Voice channel events
    GatewayIntentBits.GuildMembers, // Guild member join/leave/presence
    GatewayIntentBits.GuildPresences, // User presence/status updates
    GatewayIntentBits.DirectMessages, // Private message events
  ],
});

try {
  // Dynamically load all event handlers from the filesystem
  await loadAllEvents(client);

  // Log in to Discord using the bot token from environment variables
  await client.login(process.env.BOT_TOKEN);
  console.log("Discord client authenticated successfully.");
} catch (error) {
  console.error("Failed to start Discord client:", error);
  process.exit(1);
}
