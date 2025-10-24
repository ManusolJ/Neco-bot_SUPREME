import cron from "node-cron";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  ComponentType,
  EmbedBuilder,
  Guild,
  MessageFlags,
} from "discord.js";
import NecoService from "../../services/neco.service";
import MessageService from "@services/message.service";
import path from "path";
import RedditREST from "@interfaces/reddit-rest.interface";

// ───────────────────────────────────────────────────────────────────────────────
// Config
// ───────────────────────────────────────────────────────────────────────────────
const GUILD_ID = process.env.GUILD_ID;
const CITY_POST_URL = process.env.LOSERCITY_URL;
const HELL_POST_URL = process.env.LOSERHELL_URL;
const PRISON_POST_URL = process.env.LOSERPRISON_URL;
const REDDIT_USER_AGENT = "Necobot (by u/easytoremember1111)";
const MESSAGE_CHANNEL_ID = process.env.NECO_MESSAGES_CHANNEL;

const IMAGE_PATH = "public/img/";
const SUCCESS_IMAGE = path.join(IMAGE_PATH, "thumbs-up.jpg");
const FAILURE_IMAGE = path.join(IMAGE_PATH, "cursed-image.jpg");

// Duration the lottery stays open (ms)
const LOTTERY_DURATION_MS = 15 * 60 * 1000; // 15 min

// Win odds per multiplier
const WIN_ODDS: Record<"x2" | "x3" | "x5", number> = {
  x2: 0.7,
  x3: 0.5,
  x5: 0.2,
};

// Multiplier numeric values
const MULTI_VAL: Record<"x2" | "x3" | "x5", number> = {
  x2: 2,
  x3: 3,
  x5: 5,
};

// Themed loser posts per multiplier
const LOSER_POST: Record<"x2" | "x3" | "x5", string> = {
  x2: "Losercity",
  x3: "Loserprison",
  x5: "Loserhell",
};

// ───────────────────────────────────────────────────────────────────────────────
// Scheduler entry
// ───────────────────────────────────────────────────────────────────────────────
export default function weeklyLottery(client: Client): void {
  client.once("ready", () => {
    // Every Friday at 23:00 PM Europe/Madrid
    cron.schedule("03 23 * * FRI", async () => scheduledTask(client), {
      timezone: "Europe/Madrid",
    });
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// Main task
// ───────────────────────────────────────────────────────────────────────────────
export async function scheduledTask(client: Client): Promise<void> {
  try {
    if (!GUILD_ID || !MESSAGE_CHANNEL_ID) {
      throw new Error("Missing environment variables.");
    }

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) throw new Error("Guild not found.");

    const channel = guild.channels.cache.get(MESSAGE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      throw new Error("Channel not found or not text-based.");
    }

    const messageService = new MessageService(channel);

    // Intro & rules
    const initialMsg =
      "💥 ¡Comienza la lotería semanal! 💥\nHoy los dioses del caos decidirán vuestro destino. ¿Gloria eterna o humillación pública? ¡Hagan sus apuestas!";
    await messageService.send(initialMsg);

    const lotteryMsg =
      "Elige tu multiplicador: **x2**, **x3** o **x5**.\n" +
      "Si ganas, ¡te llevarás una fortuna multiplicada!\n" +
      "Si pierdes... tendrás un destino peor que la ruina: un post directo desde **Losercity**, **Loserprison** o **Loserhell**.\n" +
      "La ventanilla de apuestas estará abierta durante **15 minutos**.";
    await messageService.send(lotteryMsg);

    // Buttons
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("lottery_x2")
        .setLabel("x2")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("lottery_x3")
        .setLabel("x3")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("lottery_x5")
        .setLabel("x5")
        .setStyle(ButtonStyle.Danger)
    );

    const choiceMsg = await messageService.send({
      content: "Elige tu multiplicador:",
      components: [row],
    });

    // Track user picks: userId -> "x2"|"x3"|"x5"
    const picks = new Map<string, "x2" | "x3" | "x5">();

    const collector = choiceMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: LOTTERY_DURATION_MS,
    });

    collector.on("collect", async (i: ButtonInteraction) => {
      try {
        const userId = i.user.id;
        const customId = i.customId as
          | "lottery_x2"
          | "lottery_x3"
          | "lottery_x5";
        const multiplier = customId.replace("lottery_", "") as
          | "x2"
          | "x3"
          | "x5";

        // Prevent multiple selections
        if (picks.has(userId)) {
          await i.reply({
            content: "Ya has elegido un multiplicador, bobo!",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // Optional: reject bots
        if (i.user.bot) {
          await i.reply({
            content: "Solo usuarios humanos pueden participar.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // Record selection
        picks.set(userId, multiplier);

        // Acknowledge
        await i.reply({
          content: `Has elegido **${multiplier.toUpperCase()}**. ¡Suerte!`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        console.error("Error handling button click:", err);
        if (!i.replied && !i.deferred) {
          await i.reply({
            content: "Algo fue mal!! Inténtalo de nuevo más tarde.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    });

    collector.on("end", async () => {
      // Disable buttons
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("lottery_x2")
          .setLabel("x2")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("lottery_x3")
          .setLabel("x3")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("lottery_x5")
          .setLabel("x5")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true)
      );

      try {
        await choiceMsg.edit({ components: [disabledRow] });
      } catch (e) {
        throw new Error("Failed to disable buttons: " + e);
      }

      // No participants case
      if (picks.size === 0) {
        await messageService.send(
          "No hubo participantes esta semana... Vaya panda de cobardes. En fin, Krill issue."
        );
        return;
      }

      // Resolve outcomes
      const winners: Array<{ userId: string; multiplier: "x2" | "x3" | "x5" }> =
        [];
      const losers: Array<{ userId: string; multiplier: "x2" | "x3" | "x5" }> =
        [];

      for (const [userId, mult] of picks.entries()) {
        const won = Math.random() < WIN_ODDS[mult];
        if (won) winners.push({ userId, multiplier: mult });
        else losers.push({ userId, multiplier: mult });
      }

      // Apply effects
      await applyResults(guild, messageService, winners, losers);

      // Summary embed
      const summary = new EmbedBuilder()
        .setTitle("📜 Resultados de la Lotería Semanal")
        .setDescription(`Participantes: **${picks.size}**`)
        .addFields(
          {
            name: "🏆 Ganadores",
            value:
              winners.length > 0
                ? winners
                    .map(
                      (w) =>
                        `<@${w.userId}> — **${w.multiplier.toUpperCase()}** (x${
                          MULTI_VAL[w.multiplier]
                        })`
                    )
                    .join("\n")
                : "Nadie sobrevivió a la tirada...",
            inline: false,
          },
          {
            name: "💀 Perdedores",
            value:
              losers.length > 0
                ? losers
                    .map(
                      (l) =>
                        `<@${l.userId}> — **${l.multiplier.toUpperCase()}** → ${
                          LOSER_POST[l.multiplier]
                        }`
                    )
                    .join("\n")
                : "Nadie cayó en desgracia esta vez.",
            inline: false,
          }
        )
        .setTimestamp(new Date())
        .setColor(0xcc0000);

      await messageService.sendEmbed(summary);
    });
  } catch (error) {
    console.error("Error in weekly lottery scheduled task:", error);
  }
}

async function applyResults(
  guild: Guild,
  messageService: MessageService,
  winners: Array<{ userId: string; multiplier: "x2" | "x3" | "x5" }>,
  losers: Array<{ userId: string; multiplier: "x2" | "x3" | "x5" }>
) {
  // Apply winnings
  for (const w of winners) {
    try {
      await applyWinnings(guild, w.userId, MULTI_VAL[w.multiplier]);

      await messageService.send(
        `🏆 <@${
          w.userId
        }> ha ganado con **${w.multiplier.toUpperCase()}**. ¡Puntos multiplicados x${
          MULTI_VAL[w.multiplier]
        }!`
      );
    } catch (e) {
      console.error("Error applying winnings:", e);
    }
  }

  // Post loser consequences
  for (const l of losers) {
    try {
      await applyLoser(guild, l.userId, LOSER_POST[l.multiplier]);

      await messageService.send(
        `💀 <@${
          l.userId
        }> perdió con **${l.multiplier.toUpperCase()}**. Destino: **${
          LOSER_POST[l.multiplier]
        }**.`
      );
    } catch (e) {
      console.error("Error posting loser effect:", e);
    }
  }
}

async function applyWinnings(guild: Guild, userId: string, multiplier: number) {
  const dbService = await NecoService.getInstance();
  const user = await guild.members.fetch(userId);
  if (!user) {
    throw new Error("User not found in guild.");
  }
  const actualBalance = await dbService
    .getAgent(userId)
    .then((agent) => (agent ? agent.balance : 0));
  let newBalance: number = 0;
  if (
    actualBalance === null ||
    actualBalance === undefined ||
    actualBalance <= 0
  ) {
    newBalance = multiplier;
  } else {
    newBalance = actualBalance * multiplier;
  }

  await dbService.setAgentBalance(userId, newBalance);
  await user.send({
    content: `🎉 ¡Felicidades, ${user.displayName}! Has ganado la lotería semanal. Tu nuevo balance es de **${newBalance} puntos**.`,
    files: [SUCCESS_IMAGE],
  });
}

async function applyLoser(guild: Guild, userId: string, label: string) {
  const user = await guild.members.fetch(userId);
  if (!user) {
    throw new Error("User not found in guild.");
  }
  const image = await fetchLoserPost(label);
  await user.send({
    content: `Lo siento, ${user.displayName}. Has perdido en la lotería semanal y tu destino es un post directo desde **${label}**. Mejor suerte la próxima vez. Ugh...`,
    files: [image],
  });
}

async function fetchLoserPost(label: string): Promise<string> {
  let POST_URL = "";
  switch (label) {
    case "Losercity":
      POST_URL = CITY_POST_URL;
      break;
    case "Loserprison":
      POST_URL = PRISON_POST_URL;
      break;
    case "Loserhell":
      POST_URL = HELL_POST_URL;
      break;
    default:
      throw new Error("Invalid loser post label.");
  }

  const headers = {
    "User-Agent": REDDIT_USER_AGENT,
    Accept: "application/json",
  };

  try {
    const res = await fetch(POST_URL, { headers });

    if (res.status === 429) return FAILURE_IMAGE;
    if (!res.ok) return FAILURE_IMAGE;

    const data: RedditREST = await res.json();
    if (!data?.data?.children?.length) return FAILURE_IMAGE;

    const img = extractImageUrlFromRedditData(data);
    return img || FAILURE_IMAGE;
  } catch (e) {
    console.error("fetchLoserPost error:", e);
    return FAILURE_IMAGE;
  }
}

function extractImageUrlFromRedditData(payload: RedditREST): string {
  // Base filtering: usable, not stickied, not video.
  const posts = payload.data.children
    .map((c) => c?.data)
    .filter(Boolean)
    .filter((p) => !p.stickied && !p.is_video);

  if (!posts.length) return "";

  // 1) Direct image posts
  const direct = shuffle(posts).find((p) => {
    const url = p.url;
    return (
      (p.post_hint === "image" && isImageUrl(url)) ||
      isIreddIt(url) ||
      isImageUrl(url)
    );
  });
  if (direct?.url) return unescapeHtml(direct.url);

  // 2) Preview image fallback
  const withPreview = shuffle(posts).find(
    (p) => p.preview?.images?.[0]?.source?.url
  );
  if (withPreview?.preview?.images?.[0]?.source?.url) {
    return unescapeHtml(withPreview.preview.images[0].source.url);
  }

  // Nothing suitable
  return "";
}

function isImageUrl(url?: string): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return (
    u.endsWith(".jpg") ||
    u.endsWith(".jpeg") ||
    u.endsWith(".png") ||
    u.endsWith(".gif") ||
    u.endsWith(".webp")
  );
}

function isIreddIt(url?: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname.endsWith("i.redd.it");
  } catch {
    return false;
  }
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
