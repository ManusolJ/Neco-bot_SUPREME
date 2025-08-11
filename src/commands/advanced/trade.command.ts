import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  User,
} from "discord.js";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";
import Meme from "@interfaces/meme.interface";
import { isUserLocked, lockUser, unlockUser } from "@utils/lock-user.util";

const MEME_URL = process.env.MEME_URL;
const MEME_ID = process.env.MEME_TEMPLATE_ID;
const MEME_USERNAME = process.env.MEME_USERNAME;
const MEME_PASSWORD = process.env.MEME_PASSWORD;

const COLLECTOR_TIME = 300000;

export const data = new SlashCommandBuilder()
  .setName("trade")
  .setDescription("Tradea puntos entre los otros vagabundos de este servidor como si fuera fentanilo.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("gift")
      .setDescription("Ofrece tus deliciosos puntos a otro schizo del servidor.")
      .addUserOption((option) =>
        option
          .setName("usuario")
          .setDescription("Elige el vagabundo al que quieres regalar los puntos. Seguro que le encantaran.")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("puntos")
          .setDescription("La cantidad de puntos que le darás. Que generoso por tu parte.")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(20)
      )
      .addStringOption((option) =>
        option
          .setName("razon")
          .setDescription("La razon por la que le das los puntos. Puede ser un mensaje de amor o una amenaza.")
          .setMaxLength(100)
          .setRequired(false)
      )
      .addStringOption((option) =>
        option
          .setName("recompensa")
          .setDescription("Lo que le pides al vagabundo a cambio de los puntos. Prohibido pedir organos.")
          .setMaxLength(100)
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("request")
      .setDescription("Pide puntos a otro mamaguevo del servidor.")
      .addUserOption((option) =>
        option
          .setName("usuario")
          .setDescription("El vagabundo al que rogaras de forma patetica y humillante")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("puntos")
          .setDescription("La cantidad de puntos que quieres pedir. Si no te los da, le llamaremos rata.")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(20)
      )
      .addStringOption((option) =>
        option
          .setName("razon")
          .setDescription("La razon por la que le pides los puntos. Puede ser una mentira o chantaje emocional.")
          .setMaxLength(100)
          .setRequired(false)
      )
      .addStringOption((option) =>
        option
          .setName("recompensa")
          .setDescription("Lo que le ofreces a cambio de los puntos. Puede ser una promesa vacia o un soborno.")
          .setMaxLength(100)
          .setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const interactionService = new InteractionService(interaction);
    if (!interaction.guild) {
      const errorMsg = "¡Este comando solo puede ser usado en un servidor!";
      await interactionService.replyError(errorMsg);
      throw new Error("Trade command executed outside of a guild.");
    }

    await interactionService.deferReply();

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "gift") {
      return giftPoints(interaction, interactionService);
    } else if (subcommand === "request") {
      return requestPoints(interaction, interactionService);
    } else {
      const errorMsg = "Huh?! No entiendo ese subcomando!";
      await interactionService.replyError(errorMsg);
      throw new Error(`Unknown subcommand in trade command: ${subcommand}`);
    }
  } catch (error) {
    console.error("Error executing trade command:", error);
  }
}

async function giftPoints(interaction: ChatInputCommandInteraction, interactionService: InteractionService) {
  const author = interaction.user;
  const necoService = await NecoService.getInstance();
  const user = interaction.options.getUser("usuario", true);
  const points = interaction.options.getInteger("puntos", true);
  const reason = interaction.options.getString("razon") || "No hay razon, solo porque si.";
  const reward = interaction.options.getString("recompensa") || "Nada, no te preocupes...";

  if (!points || points < 1 || points > 20) {
    const errorMsg = "¡Los puntos deben estar entre 1 y 20!";
    await interactionService.followUp(errorMsg);
    throw new Error(`Invalid points value in gift command. Points: ${points}`);
  }

  if (!author || !user || !reason || !reward) {
    const errorMsg = "¡Me faltan datos necesarios para completar la transacción!";
    await interactionService.followUp(errorMsg);
    throw new Error(
      `Missing required data in gift command: author: ${author}, user: ${user}, reason: ${reason}, reward: ${reward}`
    );
  }

  if (author.id === user.id) {
    await punishUser(author, points);
    const errorMsg = "¡No puedes regalarte puntos a ti mismo! Seras imbecil! Ahora te quito los puntos.";
    return await interactionService.followUp(errorMsg);
  }

  if (user.bot) {
    const errorMsg = "¡No puedes regalar puntos a un bot! Seras bobo!";
    return await interactionService.followUp(errorMsg);
  }

  let authorAgent = await necoService.getAgent(author.id);
  if (!authorAgent) {
    const agentCreated = await necoService.createAgent(author.id);
    authorAgent = agentCreated ? await necoService.getAgent(author.id) : null;
  }

  if (!authorAgent) {
    const errorMsg = "¡No pude obtener tu informacion de agente del caos! Vuelve a intentarlo.";
    await interactionService.followUp(errorMsg);
    throw new Error(`Author agent could not be retrieved in trade command. Author ID: ${author.id}`);
  }

  let userAgent = await necoService.getAgent(user.id);

  if (!userAgent) {
    const agentCreated = await necoService.createAgent(user.id);
    userAgent = agentCreated ? await necoService.getAgent(user.id) : null;
  }

  if (!userAgent) {
    const errorMsg = "¡No pude obtener la informacion del usuario! Vuelve a intentarlo.";
    await interactionService.followUp(errorMsg);
    throw new Error(`User agent could not be retrieved in trade command. User ID: ${user.id}`);
  }

  if (authorAgent.balance < points) {
    const errorMsg = "¡No tienes suficientes puntos para regalar! Seras pobre!";
    return interactionService.followUp(errorMsg);
  }

  const isRequest = false;

  const embedDisplay = await getTradeEmbed(author, user, points, reason, reward, isRequest);

  await interactionService.followUp({
    embeds: [embedDisplay],
  });

  const row = new ActionRowBuilder<ButtonBuilder>();
  const acceptButton = new ButtonBuilder()
    .setCustomId("accept_trade")
    .setLabel("Aceptar")
    .setStyle(ButtonStyle.Success);
  const cancelButton = new ButtonBuilder()
    .setCustomId("cancel_trade")
    .setLabel("Cancelar")
    .setStyle(ButtonStyle.Danger);
  row.addComponents(acceptButton, cancelButton);

  const actionMessage = await interaction.followUp({
    components: [row],
    fetchReply: true,
  });

  const collector = actionMessage.createMessageComponentCollector({
    filter: (i) => i.user.id === user.id,
    time: COLLECTOR_TIME,
    max: 1,
  });

  collector.on("collect", async (i) => {
    if (isUserLocked(user.id) || isUserLocked(author.id)) {
      const errorMsg = "Ya esta en proceso! Esperate un momento ansias!";
      return await interactionService.followUp(errorMsg);
    }
    lockUser(user.id);
    lockUser(author.id);
    if (i.customId === "accept_trade") {
      try {
        await necoService.decreaseAgentBalance(author.id, points);
        await necoService.increaseAgentBalance(user.id, points);

        const titleMsg = "¡Transacción exitosa!";
        const successMsg = `¡${user.toString()} ha aceptado el regalo de ${author.toString()}!`;
        const footerMsg = "Gracias por usar el sistema de comercio Necobot™.";
        const successEmbed = new EmbedBuilder()
          .setColor("#22c55e")
          .setTitle(titleMsg)
          .setDescription(successMsg)
          .setFooter({ text: footerMsg });

        await i.update({ embeds: [successEmbed], components: [] });
      } catch (error) {
        console.error("Error during trade acceptance:", error);
      } finally {
        unlockUser(user.id);
        unlockUser(author.id);
      }
    } else if (i.customId === "cancel_trade") {
      const titleMsg = "¡Comercio cancelado!";
      const cancelMsg = "No se ha aceptado el comercio. Los puntos no se han transferido.";
      const footerMsg = "Gracias por usar el sistema de comercio Necobot™.";
      const cancelEmbed = new EmbedBuilder()
        .setColor("#f87171")
        .setTitle(titleMsg)
        .setDescription(cancelMsg)
        .setFooter({ text: footerMsg });

      await i.update({ embeds: [cancelEmbed], components: [] });
      unlockUser(user.id);
      unlockUser(author.id);
    }
  });

  collector.on("end", async (collected, reason) => {
    if (reason === "time") {
      const timeoutEmbed = new EmbedBuilder()
        .setColor("#f87171")
        .setTitle("¡Tiempo agotado!")
        .setDescription("El tiempo para aceptar el comercio ha expirado. Los puntos no se han transferido.")
        .setFooter({ text: "Gracias por usar el sistema de comercio Necobot™." });

      await actionMessage.edit({ embeds: [timeoutEmbed], components: [] });
    }
  });
}

async function requestPoints(interaction: ChatInputCommandInteraction, interactionService: InteractionService) {
  const necoService = await NecoService.getInstance();
  const author = interaction.user;
  const user = interaction.options.getUser("usuario", true);
  const points = interaction.options.getInteger("puntos", true);
  const reason = interaction.options.getString("razon") || "Solo soy un pobre vagabundo goblino pidiendo puntos.";
  const reward = interaction.options.getString("recompensa") || "Nada, soy insolvente.";

  if (!points || points < 1 || points > 20) {
    const errorMsg = "¡Los puntos deben estar entre 1 y 20!";
    await interactionService.followUp(errorMsg);
    throw new Error(`Invalid points value in request command. Points: ${points}`);
  }

  if (!author || !user || !reason || !reward) {
    const errorMsg = "¡Me faltan datos necesarios para completar la transacción!";
    await interactionService.followUp(errorMsg);
    throw new Error(
      `Missing required data in request command: author: ${author}, user: ${user}, reason: ${reason}, reward: ${reward}`
    );
  }

  if (author.id === user.id) {
    await punishUser(author, points);
    const errorMsg = "¡No puedes pedir puntos a ti mismo! Seras imbecil! Ahora te quito los puntos.";
    return await interactionService.followUp(errorMsg);
  }

  if (user.bot) {
    const errorMsg = "¡No puedes pedir puntos a un bot! Seras bobo!";
    return await interactionService.followUp(errorMsg);
  }

  let authorAgent = await necoService.getAgent(author.id);
  let userAgent = await necoService.getAgent(user.id);

  if (!authorAgent) {
    authorAgent = await necoService.createAgent(author.id);
  }

  if (!userAgent) {
    userAgent = await necoService.createAgent(user.id);
  }

  if (!authorAgent || !userAgent) {
    const errorMsg = "¡No pude obtener la informacion de los agentes! Vuelve a intentarlo.";
    await interactionService.followUp(errorMsg);
    throw new Error(`Agents could not be retrieved in request command. Author ID: ${author.id}, User ID: ${user.id}`);
  }

  const isRequest = true;

  const embedDisplay = await getTradeEmbed(author, user, points, reason, reward, isRequest);

  await interactionService.followUp({
    embeds: [embedDisplay],
  });

  const row = new ActionRowBuilder<ButtonBuilder>();
  const acceptButton = new ButtonBuilder()
    .setCustomId("accept_trade")
    .setLabel("Aceptar")
    .setStyle(ButtonStyle.Success);
  const cancelButton = new ButtonBuilder()
    .setCustomId("cancel_trade")
    .setLabel("Cancelar")
    .setStyle(ButtonStyle.Danger);
  row.addComponents(acceptButton, cancelButton);

  const actionMessage = await interaction.followUp({
    components: [row],
    fetchReply: true,
  });

  const collector = actionMessage.createMessageComponentCollector({
    filter: (i) => i.user.id === user.id,
    time: COLLECTOR_TIME,
    max: 1,
  });

  collector.on("collect", async (i) => {
    if (isUserLocked(user.id) || isUserLocked(author.id)) {
      const errorMsg = "Ya esta en proceso! Esperate un momento ansias!";
      return await interactionService.followUp(errorMsg);
    }
    lockUser(user.id);
    lockUser(author.id);
    if (i.customId === "accept_trade") {
      try {
        await necoService.decreaseAgentBalance(user.id, points);
        await necoService.increaseAgentBalance(author.id, points);

        const titleMsg = "¡Transacción exitosa!";
        const successMsg = `¡${user.toString()} ha aceptado donar deliciosos puntos a ${author.toString()}!`;
        const footerMsg = "Gracias por usar el sistema de comercio Necobot™.";
        const successEmbed = new EmbedBuilder()
          .setColor("#22c55e")
          .setTitle(titleMsg)
          .setDescription(successMsg)
          .setFooter({ text: footerMsg });

        await i.update({ embeds: [successEmbed], components: [] });
      } catch (error) {
        console.error("Error during trade acceptance:", error);
      } finally {
        unlockUser(user.id);
        unlockUser(author.id);
      }
    } else if (i.customId === "cancel_trade") {
      const titleMsg = "¡Comercio cancelado!";
      const cancelMsg = "No se ha aceptado el comercio. Los puntos no se han transferido.";
      const footerMsg = "Gracias por usar el sistema de comercio Necobot™.";
      const cancelEmbed = new EmbedBuilder()
        .setColor("#f87171")
        .setTitle(titleMsg)
        .setDescription(cancelMsg)
        .setFooter({ text: footerMsg });

      await i.update({ embeds: [cancelEmbed], components: [] });
      unlockUser(user.id);
      unlockUser(author.id);
    }
  });

  collector.on("end", async (collected, reason) => {
    if (reason === "time") {
      const timeoutEmbed = new EmbedBuilder()
        .setColor("#f87171")
        .setTitle("¡Tiempo agotado!")
        .setDescription("El tiempo para aceptar el comercio ha expirado. Los puntos no se han transferido.")
        .setFooter({ text: "Gracias por usar el sistema de comercio Necobot™." });

      await actionMessage.edit({ embeds: [timeoutEmbed], components: [] });
    }
  });
}

async function punishUser(user: User, wantedPoints: number) {
  const necoService = await NecoService.getInstance();

  let agent = await necoService.getAgent(user.id);

  if (!agent) {
    const agentCreated = await necoService.createAgent(user.id);
    agent = agentCreated ? await necoService.getAgent(user.id) : null;
  }

  if (!agent) {
    throw new Error(`Agent could not be retrieved for user: ${user.id}`);
  }

  await necoService.decreaseAgentBalance(user.id, wantedPoints);
}

async function getTradeEmbed(
  author: User,
  user: User,
  points: number,
  reason: string,
  reward: string,
  isRequest: boolean = false
) {
  const meme = await generateMemeImage(points, reward, isRequest);
  const isRequestText = isRequest ? "Pide" : "Regala";
  const otherText = isRequest ? "Paga" : "Recibe";

  return new EmbedBuilder()
    .setColor("#6366c3")
    .setTitle("ALERTA! NUEVO OFERTA DE COMERCIO DETECTADA!")
    .setDescription("Nueva transacción de puntos detectada.")
    .addFields(
      { name: `Vagabundo que ${isRequestText}`, value: author.toString(), inline: true },
      { name: `Vagabundo que ${otherText}`, value: user.toString(), inline: true }
    )
    .addFields(
      {
        name: "Puntos transferidos",
        value: points.toString(),
        inline: true,
      },
      {
        name: "Razon de la transacción",
        value: reason,
        inline: true,
      }
    )
    .setImage(meme);
}

async function generateMemeImage(points: number, reward: string, isRequest: boolean): Promise<string> {
  const flavorText = points > 1 ? "puntos" : "punto";

  const boxes = [
    {
      text: `${isRequest ? `${points} ${flavorText}` : reward}`,
      x: 65,
      y: 320,
      width: 300,
      height: 100,
    },
    {
      text: `${isRequest ? reward : `${points} ${flavorText}`}`,
      x: 635,
      y: 302,
      width: 300,
      height: 100,
    },
  ];

  const data = new URLSearchParams();
  data.append("template_id", MEME_ID);
  data.append("username", MEME_USERNAME);
  data.append("password", MEME_PASSWORD);

  boxes.forEach((box, i) => {
    data.append(`boxes[${i}][text]`, box.text);
    data.append(`boxes[${i}][x]`, box.x.toString());
    data.append(`boxes[${i}][y]`, box.y.toString());
    data.append(`boxes[${i}][width]`, box.width.toString());
    data.append(`boxes[${i}][height]`, box.height.toString());
  });

  const response = await fetch(MEME_URL, {
    method: "POST",
    body: data,
  });

  if (!response.ok) {
    throw new Error(`Failed to generate meme image: ${response.statusText}`);
  }

  const meme: Meme = await response.json();

  if (!meme.success) {
    throw new Error(`Meme generation failed: ${meme}`);
  }

  return meme.data.url;
}
