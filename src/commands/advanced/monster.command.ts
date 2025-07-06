import { ChatInputCommandInteraction, SlashCommandBuilder, User } from "discord.js";
import { env } from "process";

import ImageClassification from "@interfaces/image-classification.interface";
import DetectionResponse from "@interfaces/detection-response.interface";
import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";
import randomMessageBuilder from "@utils/build-random-message.util";

export const data = new SlashCommandBuilder()
  .setName("monster-time")
  .setDescription("Presume tu Monster Energy y demuestra tu lealtad al culto… o enfréntate al exilio.")
  .addAttachmentOption((option) =>
    option
      .setName("lienzo")
      .setDescription("Carga la obra maestra líquida con la probaras tu devocion.")
      .setRequired(true)
  );

const REWARD = 5;
const PUNISHMENT_ROLE = env.HERETIC_ROLE;
const ROBOFLOW_ENDPOINT = `https://classify.roboflow.com/${env.MODEL_NAME}/${env.MODEL_VERSION}?api_key=${env.ROBOFLOW_API_KEY}`;
const SPAIN_TIMEZONE = "Europe/Madrid";

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const guild = interaction.guild;
  const author = interaction.user;
  const sentImage = interaction.options.getAttachment("lienzo", true);

  if (!author || !sentImage) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = !author
      ? "NO pude conseguir tu informacion... Krill issue."
      : "NO pude conseguir la imagen que has enviado... Internet issue.";
    return await interactionService.errorReply(errorMsg + reason);
  }

  if (!sentImage.contentType?.startsWith("image/")) {
    return interactionService.errorReply("¡Eso no es una imagen!");
  }

  if (!guild) {
    const errorMsg = `NYAAAHA! Hubo un problema intentando recuperar la informacion del servidor...`;
    return await interactionService.errorReply(errorMsg);
  }

  let agent = await necoService.getAgent(author.id);

  if (!agent) {
    try {
      (await necoService.createAgent(author.id)) ? (agent = await necoService.getAgent(author.id)) : (agent = null);
    } catch (e) {
      console.error("Error en creacion de un agente del chaos! Este es el error: ", e);
    }
  }

  if (!agent) {
    const errorMsg = "Nyahaaa! No pude obtener tu informacion de agente del caos!!! Vuelve a intentarlo!";
    return await interactionService.errorReply(errorMsg);
  }

  const replyMsg = `Uno de mis fieles desea mostrar su devocion con una foto de monster eh?... Veamos...`;
  await interactionService.standardReply(replyMsg);

  const result = await detectMonster(sentImage.url, author);
  const now = new Date();
  const spainTime = new Date(now.toLocaleString("en-US", { timeZone: SPAIN_TIMEZONE }));
  const isFriday = spainTime.getDay() === 5;

  switch (result.status) {
    case "success":
      if (isFriday) {
        const newBalance = agent.balance + REWARD;
        await necoService.manipulateAgentBalance(author.id, newBalance);
        return interactionService.followReply(result.message);
      } else {
        if (PUNISHMENT_ROLE) {
          const member = await guild.members.fetch(author.id);
          await member.roles.add(PUNISHMENT_ROLE);
        }
        return interactionService.followReply("Fantástico Monster, pero hoy no es viernes… Tu herejía será marcada.");
      }

    case "lowConfidence":
      return interactionService.followReply(result.message);

    case "fail":
      if (isFriday) {
        return interactionService.followReply(result.message);
      } else {
        return interactionService.followReply(
          "Ni Monster ni viernes… ¿Qué clase de blasfemia es esta? A la proxima te desintegro."
        );
      }

    case "error":
      return interactionService.followReply(result.message);

    default:
      return interactionService.followReply("Algo insólito ha ocurrido. Ni el caos lo predijo.");
  }
}

async function detectMonster(imageUrl: string, user: User): Promise<DetectionResponse> {
  const res = await fetch(imageUrl);
  const buffer = await res.arrayBuffer();
  const base64Data = Buffer.from(buffer).toString("base64");

  const response = await fetch(ROBOFLOW_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: base64Data,
  });

  if (!response.ok) {
    console.error("Roboflow error:", response.statusText);
    const errorMsg = `Uuuh... Mira, pruebas mas tarde o avisa a Manuel. Mis habilidades cognitivas no funcionan ahora mismo lmao.`;
    return {
      status: "fail",
      message: errorMsg,
    };
  }

  const data: ImageClassification = await response.json();

  if (data.confidence < 0.75) {
    const replyMsg = "No estoy muy seguro de que es eso... Has probado a limpiar tu camara, pedazo de guarro?";
    return {
      status: "lowConfidence",
      message: replyMsg,
    };
  }

  console.log(data);

  if (data.predictions.some((p) => p.class !== "none" || p.class !== null)) {
    return {
      status: "success",
      message: randomMessageBuilder("monsterSuccess", user),
    };
  } else {
    return {
      status: "fail",
      message: randomMessageBuilder("monsterFail", user),
    };
  }
}
