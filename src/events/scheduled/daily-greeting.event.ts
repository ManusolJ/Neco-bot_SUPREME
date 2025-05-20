// TODO: IMPLEMENT...
import MessageService from "@services/message.service";
import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import { isUserLocked, lockUser, unlockUser } from "@utils/lock-user.util";
import type { Client } from "discord.js";
import cron from "node-cron";

const HOUR = 3600000;
const MINIMUM_REWARD = 1;
const MAXIMUM_REWARD = 3;

let cronScheduled = false;

export default function dailyGreeting(client: Client): void {
  client.on("ready", () => {
    if (cronScheduled) return;
    cronScheduled = true;
    cron.schedule(
      "0 12 * * *",
      async () => {
        const necoService = await NecoService.getInstance();
        const messageChannelId = process.env.NECO_MESSAGES_CHANNEL;
        const guildId = process.env.GUILD_ID;

        if (!messageChannelId || !guildId) {
          console.error("Hubo un error consiguiendo la informacion del canal o servidor del entorno!");
          return;
        }

        const guild = client.guilds.cache.get(guildId);

        if (!guild) return;

        const messageChannel = guild.channels.cache.get(messageChannelId);

        if (!messageChannel || !messageChannel.isTextBased()) {
          console.error("NYAHAAAAA! No pude obtener el canal!");
          return;
        }

        const messageService = new MessageService(messageChannel);

        const date = new Date();
        const day = date.getDay();
        const messageContent = necoMessages[day] ?? "";

        if (!messageContent) {
          console.error("NYAHAAAAA! No pude obtener el mensaje diario!");
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
                  await necoService.manipulateAgentNecoins(userId, agent.necoins + awardedCoins);
                  console.log(`Awarded ${awardedCoins} coins to ${user.tag} (${user.id})`);
                }
              } finally {
                unlockUser(userId);
              }
            }
          }
        });
      },
      {
        timezone: "Europe/Madrid",
      }
    );
  });
}

const necoMessages: string[] = [
  // 0 - Domingo
  "Domingo de Gooning: pierde la noción del tiempo, entrega tu alma al edging eterno, y reza a Ranni o Astolfo Nyaaaa~~",
  // 1 - Lunes
  "Lunes de pensamientos suicidas y existencialismo barato. ¡Vamos equipo! Solo 6 días más para volver a querer morirte el lunes siguiente. Nyaa~",
  // 2 - Martes
  "Martes de adoracion a Astolfo. Hora de cuestionarte cosas y dejar de negar la realidad. Tú decides, yo sólo observo desde las sombras. (=ↀωↀ=)",
  // 3 - Miércoles
  "Feliz Miércoles de racismo a todos. Recuerden insultar al peruano más cercano. La tradición lo exige. Nyaa~",
  // 4 - Jueves
  "Jueves de maltratar a Víctor: Reparto de ladrillos y pipebombs en la entrada. Recordad que al ser tercermundista, no tiene derechos. (*≧ω≦)",
  // 5 - Viernes
  "Viernes de Monster: Hora de hacer piedras del riñon bebiendo el brebaje sagrado.",
  // 6 - Sábado
  "Sábado de chill: toca ver una peli, molestar a Joel o fingir que no existes, pero no salir de casa por supuesto. Eso seria una locura.",
];
