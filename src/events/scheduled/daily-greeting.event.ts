import { Client } from "discord.js";
import { env } from "process";
import cron from "node-cron";

import MessageService from "@services/message.service";
import NecoService from "@services/neco.service";

import chaosBuilder from "@utils/build-chaos.util";
import { isUserLocked, lockUser, unlockUser } from "@utils/lock-user.util";

const HOUR = 3600000;
const MINIMUM_REWARD = 1;
const MAXIMUM_REWARD = 3;

const GUILD_ID = env.GUILD_ID;
const MESSAGE_CHANNEL_ID = env.NECO_MESSAGES_CHANNEL;

export default function dailyGreeting(client: Client): void {
  client.once("ready", () => {
    cron.schedule("0 12 * * *", async () => scheduledTask(client), {
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

  const date = new Date();
  const day = date.getDay();
  const messageContent = dailyNecoMessages[day] ?? "";

  if (!messageContent) {
    console.error("Error al intentar conseguir el mensaje de saludo diario.");
    const errorMsg = "NYAHAAAAA! No pude obtener el mensaje diario!";
    await messageService.sendError(errorMsg);
    return;
  }

  const message = await messageService.send(messageContent);

  const collector = message.createReactionCollector({ time: HOUR });

  const rewarded = new Set<string>();

  collector.on("collect", async (reaction) => {
    const users = await reaction.users.fetch();

    for (const [userId, user] of users) {
      if (user.bot || rewarded.has(user.id)) return;

      rewarded.add(user.id);

      if (!isUserLocked(userId)) {
        lockUser(userId);
        try {
          const agentExists = await necoService.checkAgentExists(userId);
          if (!agentExists) {
            await necoService.createAgent(userId);
          }

          const agent = await necoService.getAgent(userId);

          if (agent) {
            const awardedCoins = chaosBuilder(MINIMUM_REWARD, MAXIMUM_REWARD);
            const newBalance = agent.balance + awardedCoins;
            await necoService.manipulateAgentBalance(userId, newBalance);
            console.log(`Awarded ${awardedCoins} coins to ${user.tag} (${user.id})`);
          }
        } finally {
          unlockUser(userId);
        }
      }
    }
  });
}

const dailyNecoMessages: string[] = [
  "Domingo de Gooning: pierde la noción del tiempo, entrega tu alma al edging eterno, y reza a Ranni o Astolfo Nyaaaa~~",
  "Lunes de pensamientos suicidas y existencialismo barato. ¡Vamos equipo! Solo 6 días más para volver a querer morirte el lunes siguiente. Nyaa~",
  "Martes de adoracion a Astolfo. Hora de cuestionarte cosas y dejar de negar la realidad. Tú decides, yo sólo observo desde las sombras. (=ↀωↀ=)",
  "Feliz Miércoles de racismo a todos. Recuerden insultar al peruano más cercano. La tradición lo exige. Nyaa~",
  "Jueves de maltratar a Víctor: Reparto de ladrillos y pipebombs en la entrada. Recordad que al ser tercermundista, no tiene derechos. (*≧ω≦)",
  "Viernes de Monster: Hora de hacer piedras del riñon bebiendo el brebaje sagrado.",
  "Sábado de chill: toca ver una peli, molestar a Joel o fingir que no existes, pero no salir de casa por supuesto. Eso seria una locura.",
];
