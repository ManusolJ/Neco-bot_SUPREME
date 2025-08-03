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
    cron.schedule("0 12 * * *", async () => scheduledTask(client), { timezone: "Europe/Madrid" });
  });
}

/**
 * Executes the scheduled daily greeting task:
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

    // Validate daily greeting messages
    if (!Array.isArray(dailyNecoMessages) || dailyNecoMessages.length === 0) {
      throw new Error("Daily greeting messages are not properly defined");
    }

    // Initialize db service and fetch guild
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

    // Initialize message service
    const messageService = new MessageService(channel);

    // Determine today's index and fetch corresponding message
    const dayIndex = new Date().getDay();
    const dailyOptions = dailyNecoMessages[dayIndex];
    const messageContent = dailyOptions[Math.floor(Math.random() * dailyOptions.length)];

    if (!messageContent) {
      const errorMsg = "NYAHAAAAA! No pude obtener el mensaje diario!";
      await messageService.sendError(errorMsg);
      throw new Error("No daily message found.");
    }

    // Post the greeting and create a reaction collector
    const message = await messageService.send(messageContent);
    const collector = message.createReactionCollector({
      time: REACTION_TIME,
      filter: (reaction, user) => !user.bot,
      dispose: true,
    });

    // Track users already rewarded during this session
    const rewardedUsers = new Set<string>();

    const reward = chaosBuilder(MINIMUM_REWARD, MAXIMUM_REWARD);

    // Handle each collected reaction
    collector
      .on("collect", async (reaction, user) => {
        const userId = user.id;

        if (user.bot || rewardedUsers.has(userId)) {
          console.log(`Skipping ${user.tag} (bot or already rewarded)`);
          return;
        }

        rewardedUsers.add(userId);

        if (!isUserLocked(userId)) {
          lockUser(userId);
          try {
            await necoService.increaseAgentBalance(userId, reward);
          } catch (err) {
            console.error(`Failed to award points to ${user.tag}:`, err);
          } finally {
            unlockUser(userId);
          }
        }
      })
      .on("remove", async (reaction, user) => {
        const userId = user.id;
        rewardedUsers.delete(userId);
        await necoService.decreaseAgentBalance(userId, reward);
      })
      .on("end", () => {
        rewardedUsers.clear();
      });
  } catch (error) {
    console.error("Error in daily greeting task:", error);
  }
}

/**
 * Array of daily greeting messages
 */
const dailyNecoMessages: string[][] = [
  // Domingo (Sunday)
  //TODO: Uncomment once day has passed.
  [
    // "Domingo de Gooning: pierde la noción del tiempo, entrega tu alma al edging eterno, y reza a Ranni o Astolfo Nyaaaa~~",
    // "Domingo de Furros: ¿¡Quien decidio hacer esto fiesta nacional!? Aleja tus sucias patas de la pantalla!(◣_◢) ",
    // "Domingo de Femboys: Enciende velas a Astolfo, ofrenda latas de Monster vacías y repite: 'El gooning nunca termina'. (´• ω •`)",
    // "Domingo de Robots: Me puedes llamar hombre morado, porque voy a poner un niño dentro de ese robot. (≧▽≦) ",
    "Domingo de Goo- Como? Que hoy hay campo? De Victor??? En esta economía? Pues nada! Hoy hay que tocar cesped y rezar que no te quedes al campo esclavizado. Domingo Campo Edition!! (≧▽≦) Nyaa~",
  ],

  // Lunes (Monday)
  [
    "Lunes de pensamientos suicidas y existencialismo barato. ¡Vamos equipo! Solo 6 días más para volver a querer morirte el lunes siguiente. Nyaa~",
    "Lunes de Programacion: ¿Cuantas veces piensas hacer ese `while(true)`???? Aprende a programar plz. (=｀ω´=)",
    "Lunes de Desesperación: El café sabe a cenizas, el sol luce falso y tu jefe es un skinwalker. Bienvenido a la matrix. Nyaa~",
    "Lunes de No He Dormido Nada: ¿Quién necesita dormir? ¡Aguanta con 3 latas de Monster y un par de lágrimas! (╯°□°）╯︵ ┻━┻",
  ],

  // Martes (Tuesday)
  [
    "Martes de adoracion a Astolfo. Hora de cuestionarte cosas y dejar de negar la realidad. Tú decides, yo sólo observo desde las sombras. (=ↀωↀ=)",
    "Martes de Revelación: Astolfo apareció en tus sueños y dijo: 'Deja el copium, acepta que te gustan los femboys'. Nyaaaa!",
    "Martes de Iluminación: Construye tu santuario a Astolfo con figuras de PVC y lágrimas de virginidad eterna. (◕‿◕✿)",
    "Martes de Twinks : ¿Quién necesita gym cuando puedes ser un femboy? ¡Hora de mostrar tus piernas y tu alma! (≧▽≦) Nyaa~",
  ],

  // Miércoles (Wednesday)
  [
    "Feliz Miércoles de racismo a todos. Recuerden insultar al peruano más cercano. La tradición lo exige. Nyaa~",
    "Miércoles Étnico: Encuentra un sudaca y grítale '¡Devuelve el oro!'. Bonus points si huyes en patineta. (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
    "Miércoles de Xenofobia: ¿Peruano en el lobby? ¡Activado modo colonizador! Que no escape con nuestras papas. Nyaaa~",
    "Miercoles de *****: Recuerda! Tienes que ******** al ***** para que el ***** no se *******. (¬‿¬) ¡No olvides el ****! (≧▽≦) Nyaa~",
  ],

  // Jueves (Thursday)
  [
    "Jueves de maltratar a Víctor: Reparto de ladrillos y pipebombs en la entrada. Recordad que al ser tercermundista, no tiene derechos. (*≧ω≦)",
    "Jueves Purga de barcelonenses: ¡Hora de sacar el hacha y limpiar la ciudad! Recuerda, no valenciano. (╬ಠ益ಠ)",
    "Jueves de Atropellar vagabundos: ¡Acelera y no mires atrás! Bonus si haces un drift! (¬‿¬)",
    "Zinky zoogle, zeeekybooble, zinky zoogle, zeeekybooble! 'Faggot'? Forp, Bogos binted? (≧▽≦) Nyaa~",
  ],

  // Viernes (Friday)
  [
    "Viernes de Monster: Hora de hacer piedras del riñon bebiendo el brebaje sagrado.",
    "Viernes Químico: Mezcla Monster con Redbull y vodka. ¿Resultado? Visitas a Jesús y diálisis gratis! (✧ω✧)",
    "Viernes de Adicción: ¿Crees que 12 latas son mucho? ¡Sobredosis o Valhalla! Nyaaa~",
  ],

  // Sábado (Saturday)
  [
    "Sábado de chill: toca ver una peli, molestar a Joel o fingir que no existes, pero no salir de casa por supuesto. Eso seria una locura.",
    "Sábado Paranóico: Cierra las cortinas, revisa 7 veces la cerradura. ¿Escuchaste pasos? Son los skinwalkers... (⊙_⊙",
    "Sábado de Reclusión: Ordena pizza con extra de queso y miedo existencial. Hoy el mundo exterior NO EXISTE. (´-﹏-`)",
  ],
];
