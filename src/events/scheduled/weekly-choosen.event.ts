import { Client } from "discord.js";
import cron from "node-cron";

import NecoService from "@services/neco.service";
import MessageService from "@services/message.service";
import Agent from "@interfaces/agent.interface";

// Environment variable for the target Discord guild ID
const GUILD_ID = process.env.GUILD_ID;
// Environment variable for the target channel ID where messages are posted
const MESSAGE_CHANNEL_ID = process.env.NECO_MESSAGES_CHANNEL;

/**
 * Registers a weekly cron job to post the top 5 agents and reset their balances.
 *
 * This function sets up a task that runs every Sunday at 15:00 (3 PM)
 * Europe/Madrid time once the client is ready.
 *
 * @param client - The Discord.js Client instance used to access guilds and channels.
 */
export default function weeklyChoosen(client: Client): void {
  client.once("ready", () => {
    cron.schedule("0 15 * * SUN", async () => scheduledTask(client), {
      timezone: "Europe/Madrid",
    });
  });
}

/**
 * Performs the weekly leaderboard posting and balance reset.
 *
 * @param client - The Discord.js Client instance.
 */
async function scheduledTask(client: Client): Promise<void> {
  try {
    if (!GUILD_ID || !MESSAGE_CHANNEL_ID) {
      throw new Error("Missing environment variables.");
    }

    const necoService = await NecoService.getInstance();
    // Fetch and validate guild
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      throw new Error("Guild not found.");
    }

    const channel = guild.channels.cache.get(MESSAGE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      throw new Error("Channel not found or not text-based.");
    }

    const messageService = new MessageService(channel);

    // Retrieve all agents; if none exist, report an error and exit
    const agents: Agent[] = (await necoService.getAllAgents()) ?? [];
    if (agents.length === 0) {
      const errorMsg = "NYAHAA!? No encontre ningun agente!";
      await messageService.sendError(errorMsg);
      throw new Error("No agents found.");
    }

    // Post the weekly ranking and then reset balances
    await messageService.send(getRankingMessage(agents));
    await necoService.resetAllBalances();
    await necoService.resetAllBeggedStates();
    const resetMessage =
      "¡Se ha reiniciado el marcador del caos! ¡A sembrar más caos!";
    await messageService.send(resetMessage);
    console.log("Weekly chaos reset completed.");
  } catch (error) {
    console.error("Error in weeklyChoosen scheduled task:", error);
  }
}

/**
 * Constructs a leaderboard message for the top five agents by balance.
 *
 * @param agents - Array of all agents with `id` and `balance` properties.
 * @returns A formatted string listing the top five agents with medal emojis.
 */
function getRankingMessage(agents: Agent[]): string {
  // Sort agents descending by balance and take the top five
  const topFive = [...agents].sort((a, b) => b.balance - a.balance).slice(0, 5);

  // Map each agent to a line with a medal and mention
  const podium = topFive
    .map((agent, index) => {
      const medals = ["🥇", "🥈", "🥉", "🧨", "💥"];
      return `${medals[index]} <@${agent.id}> — **${agent.balance}** puntos`;
    })
    .join("\n");

  return `📊 **Ranking semanal** 📊\n\n${podium}\n\n¡Seguid sembrando el caos y el desorden! Nyaa~`;
}
