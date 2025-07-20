/**
 * @file Entry point for the Discord bot.
 *
 * Instantiates the Discord.js client with required intents
 * dynamically loads all event handlers, and logs in to Discord.
 */

import { Client, GatewayIntentBits } from "discord.js";
import "dotenv/config";

import loadAllEvents from "@utils/event-loader.util";

/**
 * The bot’s authentication token, loaded from the BOT_TOKEN environment variable.
 *
 * @constant {string}
 * @throws Will exit the process if BOT_TOKEN is undefined.
 */
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("Missing BOT_TOKEN environment variable");
  process.exit(1);
}

/**
 * The Discord.js client, configured with all gateway intents the bot needs.
 *
 * @constant {Client}
 * @see {@link GatewayIntentBits} for available intents.
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Server metadata
    GatewayIntentBits.GuildMessages, // Reading messages in guilds
    GatewayIntentBits.MessageContent, // Access to message text content
    GatewayIntentBits.GuildVoiceStates, // Voice channel events
    GatewayIntentBits.GuildMembers, // Member join/leave/presence
    GatewayIntentBits.GuildPresences, // User presence/status updates
    GatewayIntentBits.DirectMessages, // Private message events
  ],
});

try {
  // Discovers and loads all event handlers dynamically from /events directory
  await loadAllEvents(client);

  // Authenticate with Discord
  await client.login(BOT_TOKEN);
  console.log("Discord client authenticated successfully.");
} catch (error) {
  console.error("Failed to start Discord client:", error);
  process.exit(1);
}
