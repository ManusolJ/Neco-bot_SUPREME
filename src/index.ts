import { Client, GatewayIntentBits } from "discord.js";
import { necoClient } from "./db";

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

// const necoService = new NecoService();

await client.login(process.env.BOT_TOKEN);
