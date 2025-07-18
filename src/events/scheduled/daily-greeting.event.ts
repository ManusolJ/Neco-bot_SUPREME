import { Client } from "discord.js";
import { env } from "process";
import cron from "node-cron";

import MessageService from "@services/message.service";
import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import { isUserLocked, lockUser, unlockUser } from "@utils/lock-user.util";

// Configuration
const REACTION_TIME = 1000 * 60 * 60; // 1 hour reaction window
const MINIMUM_REWARD = 1;
const MAXIMUM_REWARD = 3;
const GUILD_ID = env.GUILD_ID;
const MESSAGE_CHANNEL_ID = env.NECO_MESSAGES_CHANNEL;

/**
 * Daily greeting with reaction rewards
 * Posts day-specific message and rewards reactors
 */
export default function dailyGreeting(client: Client): void {
  client.once("ready", () => {
    // Schedule daily at 12:00 PM Madrid time
    cron.schedule("0 12 * * *", async () => scheduledTask(client), {
      timezone: "Europe/Madrid",
    });
  });
}

/**
 * Posts daily message and collects reactions
 * Rewards users who react within time window
 */
async function scheduledTask(client: Client): Promise<void> {
  if (!GUILD_ID || !MESSAGE_CHANNEL_ID) {
    console.error("Missing environment variables");
    return;
  }

  const necoService = await NecoService.getInstance();
  const guild = client.guilds.cache.get(GUILD_ID);

  if (!guild) {
    console.error("Guild retrieval failed");
    return;
  }

  const channel = guild.channels.cache.get(MESSAGE_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    console.error("Invalid message channel");
    return;
  }

  const messageService = new MessageService(channel);

  // Get day-specific message
  const dayIndex = new Date().getDay();
  const messageContent = dailyNecoMessages[dayIndex] ?? "";

  if (!messageContent) {
    console.error("Daily message missing");
    const errorMsg = "NYAHAAAAA! No pude obtener el mensaje diario!";
    await messageService.sendError(errorMsg);
    return;
  }

  // Post message and setup reaction collector
  const message = await messageService.send(messageContent);
  const collector = message.createReactionCollector({ time: REACTION_TIME });
  const rewarded = new Set<string>(); // Track rewarded users

  collector.on("collect", async (reaction) => {
    const users = await reaction.users.fetch();

    for (const [userId, user] of users) {
      // Skip bots and already rewarded users
      if (user.bot || rewarded.has(userId)) continue;

      rewarded.add(userId);

      // Apply lock to prevent duplicate rewards
      if (!isUserLocked(userId)) {
        lockUser(userId);
        try {
          // Ensure user exists in database
          if (!(await necoService.checkAgentExists(userId))) {
            await necoService.createAgent(userId);
          }

          // Award random points
          const agent = await necoService.getAgent(userId);
          if (agent) {
            const reward = chaosBuilder(MINIMUM_REWARD, MAXIMUM_REWARD);
            await necoService.manipulateAgentBalance(userId, agent.balance + reward);
            console.log(`Awarded ${reward} points to ${user.tag}`);
          }
        } finally {
          unlockUser(userId);
        }
      }
    }
  });
}

/** Day-specific greeting messages */
const dailyNecoMessages: string[] = [
  "Domingo de Gooning...",
  "Lunes de pensamientos suicidas...",
  "Martes de adoracion a Astolfo...",
  "Feliz Miércoles de racismo a todos...",
  "Jueves de maltratar a Víctor...",
  "Viernes de Monster...",
  "Sábado de chill...",
];
