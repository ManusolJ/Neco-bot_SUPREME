import { Client, GatewayIntentBits } from "discord.js";
import "dotenv/config";
import loadAllEvents from "@utils/event-loader.util";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
  ],
});

await loadAllEvents(client);

await client.login(process.env.BOT_TOKEN);
