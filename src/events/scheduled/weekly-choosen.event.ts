import { Client } from "discord.js";
import cron from "node-cron";

import NecoService from "@services/neco.service";
import MessageService from "@services/message.service";
import Agent from "@interfaces/agent.interface";

// Discord configuration
const GUILD_ID = process.env.GUILD_ID;
const MESSAGE_CHANNEL_ID = process.env.NECO_MESSAGES_CHANNEL;

/**
 * Weekly leaderboard reset event
 * Posts top 5 agents and resets balances every Sunday
 */
export default function weeklyChoosen(client: Client): void {
  client.once("ready", () => {
    // Schedule weekly on Sunday at 3:00 PM Madrid time
    cron.schedule("0 15 * * SUN", async () => scheduledTask(client), {
      timezone: "Europe/Madrid",
    });
  });
}

/**
 * Executes weekly ranking reset
 * - Displays top 5 agents
 * - Resets all balances to zero
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

  // Retrieve all agents
  const agents: Agent[] = (await necoService.getAllAgents()) ?? [];
  if (!agents.length) {
    console.error("No agents found");
    const errorMsg = "NYAHAA!? No encontre ningun agente!";
    await messageService.sendError(errorMsg);
    return;
  }

  // Display ranking
  await messageService.send(getRankingMessage(agents));

  // Reset global balances
  await necoService.resetGlobalChaos();
  await messageService.send("Se ha reiniciado el marcador del caos. ¡A sembrar mas caos!");
  console.log("Weekly chaos reset completed");
}

/** Formats leaderboard message with top 5 agents */
function getRankingMessage(agents: Agent[]): string {
  const topFive = [...agents].sort((a, b) => b.balance - a.balance).slice(0, 5);

  const podium = topFive
    .map((agent, index) => {
      const medals = ["🥇", "🥈", "🥉", "🧨", "💥"];
      return `${medals[index]} <@${agent.id}> — **${agent.balance}** puntos`;
    })
    .join("\n");

  return `📊 **Ranking semanal** 📊\n\n${podium}\n\n¡Seguid sembrando el caos y el desorden! Nyaa~`;
}
