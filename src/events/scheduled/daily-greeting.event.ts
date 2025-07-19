import { Client } from "discord.js";
import { env } from "process";
import cron from "node-cron";

import MessageService from "@services/message.service";
import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import { isUserLocked, lockUser, unlockUser } from "@utils/lock-user.util";

// Time during which reactions are collected
const REACTION_TIME = 1000 * 60 * 60;

// Minimum and maximum reward points to grant per reaction
const MINIMUM_REWARD = 1;
const MAXIMUM_REWARD = 3;

// Environment variable keys for guild and channel identifiers
const GUILD_ID = env.GUILD_ID;
const MESSAGE_CHANNEL_ID = env.NECO_MESSAGES_CHANNEL;

/**
 * Registers a cron job to post a daily greeting message at 12:00 PM Madrid time
 * and reward reactors with random points.
 *
 * @param client - The Discord.js Client instance used to access guilds and channels.
 */
export default function dailyGreeting(client: Client): void {
  client.once("ready", () => {
    // Schedule the task to run every day at 12:00 Europe/Madrid timezone
    cron.schedule("0 12 * * *", async () => scheduledTask(client), { timezone: "Europe/Madrid" });
  });
}

/**
 * Executes the scheduled daily greeting task:
 * 1. Fetches the configured guild and channel.
 * 2. Posts a day-specific greeting message.
 * 3. Sets up a reaction collector for REACTION_TIME milliseconds.
 * 4. Rewards each unique non-bot reactor with random points between MINIMUM_REWARD and MAXIMUM_REWARD.
 *
 * @param client - The Discord.js Client instance.
 * @returns A Promise that resolves once the task completes or errors out.
 */
async function scheduledTask(client: Client): Promise<void> {
  try {
    // Validate required environment variables
    if (!GUILD_ID || !MESSAGE_CHANNEL_ID) {
      throw new Error("Missing environment variables for guild or message channel");
    }

    // Initialize services and fetch guild
    const necoService = await NecoService.getInstance();
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      throw new Error("Guild retrieval failed");
    }

    // Fetch and validate text-based channel
    const channel = guild.channels.cache.get(MESSAGE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      throw new Error("Invalid message channel or not text-based");
    }

    const messageService = new MessageService(channel);

    // Determine today's index and fetch corresponding message
    const dayIndex = new Date().getDay();
    const messageContent = dailyNecoMessages[dayIndex] ?? "";

    if (!messageContent) {
      const errorMsg = "NYAHAAAAA! No pude obtener el mensaje diario!";
      await messageService.sendError(errorMsg);
      throw new Error("No daily message found.");
    }

    // Post the greeting and create a reaction collector
    const message = await messageService.send(messageContent);
    const collector = message.createReactionCollector({ time: REACTION_TIME });

    // Track users already rewarded during this session
    const rewarded = new Set<string>();

    // Handle each collected reaction
    collector.on("collect", async (reaction) => {
      const users = await reaction.users.fetch();

      for (const [userId, user] of users) {
        // Skip bots and users already rewarded
        if (user.bot || rewarded.has(userId)) {
          continue;
        }
        rewarded.add(userId);

        // Lock the user to prevent concurrent reward operations
        if (!isUserLocked(userId)) {
          lockUser(userId);
          try {
            // Ensure the user exists in the database
            const exists = await necoService.checkAgentExists(userId);
            if (!exists) {
              await necoService.createAgent(userId);
            }
            // Fetch agent record and award random points
            const agent = await necoService.getAgent(userId);
            if (agent) {
              const reward = chaosBuilder(MINIMUM_REWARD, MAXIMUM_REWARD);
              const newBalance = agent.balance + reward;
              await necoService.manipulateAgentBalance(userId, newBalance);
              console.log(`Awarded ${reward} points to ${user.tag}`);
            }
          } finally {
            unlockUser(userId);
          }
        }
      }
    });
  } catch (error) {
    console.error("Error in daily greeting task:", error);
  }
}

/**
 * Array of daily greeting messages
 */
const dailyNecoMessages: string[] = [
  "Domingo de Gooning: pierde la noción del tiempo, entrega tu alma al edging eterno, y reza a Ranni o Astolfo Nyaaaa~~",
  "Lunes de pensamientos suicidas y existencialismo barato. ¡Vamos equipo! Solo 6 días más para volver a querer morirte el lunes siguiente. Nyaa~",
  "Martes de adoracion a Astolfo. Hora de cuestionarte cosas y dejar de negar la realidad. Tú decides, yo sólo observo desde las sombras. (=ↀωↀ=)",
  "Feliz Miércoles de racismo a todos. Recuerden insultar al peruano más cercano. La tradición lo exige. Nyaa~",
  "Jueves de maltratar a Víctor: Reparto de ladrillos y pipebombs en la entrada. Recordad que al ser tercermundista, no tiene derechos. (*≧ω≦)",
  "Viernes de Monster: Hora de hacer piedras del riñon bebiendo el brebaje sagrado.",
  "Sábado de chill: toca ver una peli, molestar a Joel o fingir que no existes, pero no salir de casa por supuesto. Eso seria una locura.",
];
