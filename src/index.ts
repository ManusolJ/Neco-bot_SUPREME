import { Client, GatewayIntentBits } from "discord.js";
import connectToDB from "./db";

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

await connectToDB();
// const necoService = new NecoService();

await client.login(process.env.CONFIG.BOT_TOKEN);
