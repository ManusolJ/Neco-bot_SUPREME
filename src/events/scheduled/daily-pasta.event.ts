import { Client } from "discord.js";
import { env } from "process";
import cron from "node-cron";

import MessageService from "@services/message.service";
import RedditREST from "@interfaces/reddit-rest.interface";

// API and Discord configuration
const COPY_URL = env.COPYPASTA_URL;
const GUILD_ID = env.GUILD_ID;
const COPY_CHANNEL_ID = env.COPYPASTA_CHANNEL;

/**
 * Daily copypasta event
 * Fetches random post from Reddit and posts to channel
 */
export default function dailyPasta(client: Client): void {
  client.once("ready", () => {
    // Schedule daily at 10:00 PM Madrid time
    cron.schedule("0 22 * * *", async () => scheduledTask(client), {
      timezone: "Europe/Madrid",
    });
  });
}

/**
 * Fetches and posts random copypasta from Reddit
 */
async function scheduledTask(client: Client): Promise<void> {
  if (!GUILD_ID || !COPY_CHANNEL_ID || !COPY_URL) {
    console.error("Missing environment variables");
    return;
  }

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.error("Guild retrieval failed");
    return;
  }

  const channel = guild.channels.cache.get(COPY_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    console.error("Invalid copypasta channel");
    return;
  }

  const messageService = new MessageService(channel);

  // Fetch Reddit data
  const response = await fetch(COPY_URL, {
    headers: { "User-Agent": "Necobot by u/easytoremember1111" },
  });

  if (!response.ok) {
    console.error("Reddit API error");
    const errorMsg = "NYAHAA! No he podido conseguir nada de reddit! Basura de pagina.";
    await messageService.sendError(errorMsg);
    return;
  }

  const data: RedditREST = await response.json();
  if (!data) {
    console.error("Invalid Reddit response");
    const errorMsg = "NYAHAA! Respuesta vacía de reddit!";
    await messageService.sendError(errorMsg);
    return;
  }

  // Format and post pasta
  const pasta = getPastaFromData(data);
  if (!pasta) {
    console.error("No valid pasta found");
    const errorMsg = "NYAHAA! No encontré buena pasta!";
    await messageService.sendError(errorMsg);
    return;
  }

  await messageService.send(pasta);
}

/** Extracts random copypasta from Reddit response */
function getPastaFromData(data: RedditREST): string {
  // Filter valid posts (non-empty, under 2000 chars)
  const validPosts = data.data.children.filter(
    (post) => post.data.selftext?.length > 0 && post.data.selftext.length < 2000
  );

  if (!validPosts.length) return "";

  // Select random valid post
  const randomPost = validPosts[Math.floor(Math.random() * validPosts.length)];

  // Clean formatting and truncate
  return `**${randomPost.data.title}**\n\n${
    randomPost.data.selftext
      .replace(/\^\(.*?\)\s?/g, "") // Remove Reddit formatting
      .substring(0, 1800) // Ensure under Discord limit
  }`;
}
