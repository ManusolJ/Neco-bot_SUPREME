import { Client } from "discord.js";
import { env } from "process";
import cron from "node-cron";

import MessageService from "@services/message.service";

import RedditREST from "@interfaces/reddit-rest.interface";

const COPY_URL = env.COPYPASTA_URL;

const GUILD_ID = env.GUILD_ID;
const COPY_CHANNEL_ID = env.COPYPASTA_CHANNEL;

export default function dailyPasta(client: Client): void {
  client.once("ready", () => {
    cron.schedule("0 22 * * *", async () => scheduledTask(client), {
      timezone: "Europe/Madrid",
    });
  });
}

async function scheduledTask(client: Client): Promise<void> {
  if (!GUILD_ID || !COPY_CHANNEL_ID) {
    console.error("Hubo un problema intentando recuperar variables de entorno.");
    return;
  }

  const guild = client.guilds.cache.get(GUILD_ID);

  if (!guild) {
    console.error("Hubo un error al intentar conseguir el servidor.");
    return;
  }

  const channel = guild.channels.cache.get(COPY_CHANNEL_ID);

  if (!channel || !channel.isTextBased()) {
    console.error("Hubo un error al intentar conseguir el canal de copypasta.");
    return;
  }

  const messageService = new MessageService(channel);

  const response = await fetch(COPY_URL, {
    headers: {
      "User-Agent": "Necobot by u/easytoremember1111",
    },
  });

  if (!response.ok) {
    console.error("Hubo un error al intentar conseguir la respuesta de reddit.");
    const errorMsg = "NYAHAA! No he podido conseguir nada de reddit! Basura de pagina.";
    messageService.sendError(errorMsg);
    return;
  }

  const data: RedditREST = await response.json();

  if (!data) {
    console.error("Hubo un error al intentar conseguir la respuesta de reddit.");
    const errorMsg = "NYAHAA! No he podido conseguir nada de reddit! Basura de pagina.";
    messageService.sendError(errorMsg);
    return;
  }

  const pasta = getPastaFromData(data);

  if (!pasta) {
    console.error("Hubo un error al intentar conseguir una pasta de la respuesta REST.");
    const errorMsg = "NYAHAA! No he podido conseguir una buena pasta de la informacion de reddit! Basura de codigo.";
    messageService.sendError(errorMsg);
    return;
  }

  await messageService.send(pasta);
}

function getPastaFromData(data: RedditREST): string {
  const validPosts = data.data.children;

  if (!validPosts.length) return "";

  let randomPost = validPosts[Math.floor(Math.random() * validPosts.length)];

  while (randomPost && randomPost.data.selftext.length >= 2000) {
    randomPost = validPosts[Math.floor(Math.random() * validPosts.length)];
  }

  if (!randomPost) return "";

  return `**${randomPost.data.title}**\n\n${randomPost.data.selftext.replace(/\^\(.*?\)\s?/g, "").substring(0, 1800)}`;
}
