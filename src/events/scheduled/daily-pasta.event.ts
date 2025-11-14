import cron from "node-cron";
import { env } from "process";
import { Client, Events } from "discord.js";

import MessageService from "@services/message.service";
import RedditREST from "@interfaces/rest/reddit/reddit-rest.interface";

// Environment variable keys for Discord guild, copypasta source URL, and channel
const GUILD_ID = env.GUILD_ID;
const COPY_URL = env.COPYPASTA_URL;
const COPY_CHANNEL_ID = env.COPYPASTA_CHANNEL;
const REDDIT_USER_AGENT = "Necobot (by u/easytoremember1111)";

// Task Constants
const SCHEDULED_TIME = "0 22 * * *";
const TIMEZONE = "Europe/Madrid";

/**
 * Schedules a daily copypasta post in a Discord guild.
 *
 * @remarks
 * Registers a cron job to run at 22:00 Europe/Madrid time each day.
 * When triggered, it fetches a random copypasta from the configured Reddit URL
 * and posts it to the specified channel.
 *
 * @param client - The Discord.js Client instance used to access guilds and channels.
 */
export default function dailyPasta(client: Client): void {
  client.once(Events.ClientReady, () => {
    cron.schedule(SCHEDULED_TIME, async () => scheduledTask(client), {
      timezone: TIMEZONE,
    });
  });
}

/**
 *
 * @param client - The Discord.js Client instance.
 * @returns A promise that resolves once the task completes.
 * @throws If any environment variable is missing, the guild or channel cannot be found,
 *         or the Reddit fetch or data parsing fails.
 */
async function scheduledTask(client: Client): Promise<void> {
  try {
    if (!GUILD_ID || !COPY_CHANNEL_ID || !COPY_URL) {
      const err = "Missing environment variables for guild, channel or URL";
      throw new Error(err);
    }

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      const err = `Guild with ID ${GUILD_ID} not found`;
      throw new Error(err);
    }

    const channel = guild.channels.cache.get(COPY_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      const err = `Channel with ID ${COPY_CHANNEL_ID} not found or not text-based`;
      throw new Error(err);
    }

    const messageService = new MessageService(channel);

    const headers = {
      "User-Agent": REDDIT_USER_AGENT,
      Accept: "application/json",
    };

    // Fetch Reddit data
    const response = await fetch(COPY_URL, { headers });

    if (response.status === 429) {
      const errorMsg = "NYAHAA! Reddit está bloqueando mis solicitudes! Hora de hacerles DDoS.";
      await messageService.sendError(errorMsg);
      throw new Error("Reddit rate limit exceeded");
    }

    if (!response.ok) {
      const errorMsg = `NYAHAA! Error de Reddit: ${response.status} ${response.statusText}`;
      await messageService.sendError(errorMsg);
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    }

    const data: RedditREST = await response.json();
    if (!data || !data.data || data.data.children.length === 0) {
      const errorMsg = "NYAHAA! Respuesta inválida de Reddit!";
      await messageService.sendError(errorMsg);
      throw new Error("Invalid Reddit response structure");
    }

    // Format and post a random copypasta
    const pasta = getPastaFromData(data);

    if (!pasta) {
      const errorMsg = "NYAHAA! No encontré buena pasta!";
      await messageService.sendError(errorMsg);
      throw new Error("No valid copypasta found");
    }

    await messageService.send(pasta);
  } catch (error) {
    console.error("Error in daily pasta task:", error);
  }
}

/**
 * Extracts a random copypasta string from the Reddit API response.
 *
 * @param data - The raw response conforming to `RedditREST`.
 * @returns The formatted copypasta text, including the post title,
 *          or an empty string if no valid entries are found.
 */
function getPastaFromData(data: RedditREST): string {
  // Filter posts that have non-empty selftext under Discord's character limit
  const validPosts = data.data.children.filter(
    (post) => post.data.selftext?.length > 0 && post.data.selftext.length < 2000,
  );

  if (validPosts.length === 0) {
    return "";
  }

  // Select and clean a random post
  const randomPost = validPosts[Math.floor(Math.random() * validPosts.length)];

  return `**${randomPost.data.title}**\n\n${
    randomPost.data.selftext
      .replace(/\^\(.*?\)\s?/g, "") // Strip Reddit markup
      .substring(0, 1800) // Truncate to safe length
  }`;
}
