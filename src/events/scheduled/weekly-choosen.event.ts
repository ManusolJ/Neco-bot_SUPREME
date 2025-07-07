import { Client } from "discord.js";
import cron from "node-cron";

import NecoService from "@services/neco.service";
import MessageService from "@services/message.service";

import Agent from "@interfaces/agent.interface";

const GUILD_ID = process.env.GUILD_ID;
const MESSAGE_CHANNEL_ID = process.env.NECO_MESSAGES_CHANNEL;

export default function weeklyChoosen(client: Client): void {
  client.once("ready", () => {
    cron.schedule("0 15 * * SUN", async () => scheduledTask(client), {
      timezone: "Europe/Madrid",
    });
  });
}

async function scheduledTask(client: Client): Promise<void> {
  if (!GUILD_ID || !MESSAGE_CHANNEL_ID) {
    console.error("Hubo un problema intentando recuperar variables de entorno.");
    return;
  }

  const necoService = await NecoService.getInstance();

  const guild = client.guilds.cache.get(GUILD_ID);

  if (!guild) {
    console.error("Hubo un error al intentar conseguir el servidor.");
    return;
  }

  const channel = guild.channels.cache.get(MESSAGE_CHANNEL_ID);

  if (!channel || !channel.isTextBased()) {
    console.error("Hubo un error al intentar conseguir el canal de mensajes neco-arc.");
    return;
  }

  const messageService = new MessageService(channel);

  const agents: Agent[] = (await necoService.getAllAgents()) ?? [];

  if (agents.length === 0) {
    console.error("No se encontraron agentes en la base de datos.");
    const errorMsg = "NYAHAA!? No encontre ningun agente! Skill issue :3";
    await messageService.sendError(errorMsg);
    return;
  }

  const rankingMessage = getRankingMessage(agents);

  await messageService.send(rankingMessage);

  await necoService.resetGlobalChaos();

  const despairMessage = "Se ha reiniciado el marcador del caos. ¡A sembrar mas caos, hehee!";

  await messageService.send(despairMessage);

  console.log("Se ha reiniciado el caos de los agentes.");
}

function getRankingMessage(agents: Agent[]): string {
  const topFive = agents.sort((a, b) => b.balance - a.balance).slice(0, 5);

  const podium = topFive
    .map((agent, index) => {
      const medal = ["🥇", "🥈", "🥉", "🧨", "💥"][index];
      return `${medal} <@${agent.id}> — **${agent.balance}** puntos de caos`;
    })
    .join("\n");

  return `📊 **Ranking semanal de agentes del caos** 📊\n\n${podium}\n\n¡Seguid sembrando el desorden, criaturas turbias! Nyaa~`;
}
