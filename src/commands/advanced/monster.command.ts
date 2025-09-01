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
// Add maximum file size (5MB as example)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const guild = interaction.guild;
  const author = interaction.user;
  const sentImage = interaction.options.getAttachment("lienzo", true);

  // Defer the reply immediately and await it
  try {
    await interaction.deferReply();
  } catch (error) {
    console.error("Failed to defer reply:", error);
    return;
  }

  if (!author || !sentImage) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = !author
      ? "NO pude conseguir tu informacion... Krill issue."
      : "NO pude conseguir la imagen que has enviado... Internet issue.";
    return await interactionService.editReply(errorMsg + reason);
  }

  // Check file size before processing
  if (sentImage.size > MAX_FILE_SIZE) {
    return await interactionService.editReply(
      "¡La imagen es demasiado grande! Por favor, envía una imagen de menos de 5MB."
    );
  }

  if (!sentImage.contentType?.startsWith("image/")) {
    return await interactionService.editReply("¡Eso no es una imagen!");
  }

  if (!guild) {
    const errorMsg = `NYAAAHA! Hubo un problema intentando recuperar la informacion del servidor...`;
    return await interactionService.editReply(errorMsg);
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
    return await interactionService.editReply(errorMsg);
  }

  const replyMsg = `Uno de mis fieles desea mostrar su devocion con una foto de monster eh?... Veamos...`;
  await interactionService.editReply({ content: replyMsg, files: [sentImage.url] });

  try {
    const result = await detectMonster(sentImage.url, author);
    const now = new Date();
    const spainTime = new Date(now.toLocaleString("en-US", { timeZone: SPAIN_TIMEZONE }));
    const isFriday = spainTime.getDay() === 5;

    switch (result.status) {
      case "success":
        if (isFriday) {
          await necoService.increaseAgentBalance(author.id, REWARD);
          return await interactionService.followUp(result.message);
        } else {
          if (PUNISHMENT_ROLE) {
            try {
              const member = await guild.members.fetch(author.id);
              await member.roles.add(PUNISHMENT_ROLE);
            } catch (roleError) {
              console.error("Error adding role:", roleError);
            }
          }
          return await interactionService.followUp(
            "Fantástico Monster, pero hoy no es viernes… Tu herejía será marcada."
          );
        }

      case "lowConfidence":
        return await interactionService.followUp(result.message);

      case "fail":
        if (isFriday) {
          return await interactionService.followUp(result.message);
        } else {
          return await interactionService.followUp(
            "Ni Monster ni viernes… ¿Qué clase de blasfemia es esta? A la proxima te desintegro."
          );
        }

      case "error":
        return await interactionService.followUp(result.message);

      default:
        return await interactionService.followUp("Algo insólito ha ocurrido. Ni el caos lo predijo.");
    }
  } catch (error) {
    console.error("Error in monster detection:", error);
    return await interactionService.editReply(
      "¡Ocurrió un error procesando tu imagen! Por favor, intenta con una imagen más pequeña o más tarde."
    );
  }
}

async function detectMonster(imageUrl: string, user: User): Promise<DetectionResponse> {
  try {
    const res = await fetch(imageUrl);

    // Check if image is too large before processing
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return {
        status: "error",
        message: "La imagen es demasiado grande. Por favor, envía una imagen de menos de 5MB.",
      };
    }

    const buffer = await res.arrayBuffer();

    // Check buffer size as well
    if (buffer.byteLength > MAX_FILE_SIZE) {
      return {
        status: "error",
        message: "La imagen es demasiado grande. Por favor, envía una imagen de menos de 5MB.",
      };
    }

    const base64Data = Buffer.from(buffer).toString("base64");

    const response = await fetch(ROBOFLOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: base64Data,
    });

    if (!response.ok) {
      console.error("Roboflow error:", response.status, response.statusText);

      if (response.status === 413) {
        return {
          status: "error",
          message: "La imagen es demasiado grande para procesar. Por favor, envía una imagen más pequeña.",
        };
      }

      const errorMsg = `Uuuh... Mira, pruebas mas tarde o avisa a Manuel. Mis habilidades cognitivas no funcionan ahora mismo lmao.`;
      return {
        status: "fail",
        message: errorMsg,
      };
    }

    const data: ImageClassification = await response.json();

    if (data.predictions == null) {
      const errorMsg = `Uuuh... Mira, pruebas mas tarde o avisa a Manuel. Tengo problemas recuperando informacion de la API.`;
      return {
        status: "fail",
        message: errorMsg,
      };
    }

    const prediction = data.predictions[0];

    if (prediction.confidence < 0.75) {
      const replyMsg = "No estoy muy seguro de que es eso... Has probado a limpiar tu camara, pedazo de guarro?";
      return {
        status: "lowConfidence",
        message: replyMsg,
      };
    }

    if (prediction.class) {
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
  } catch (error) {
    console.error("Error in detectMonster:", error);
    return {
      status: "error",
      message: "Ocurrió un error inesperado procesando la imagen. Por favor, intenta de nuevo.",
    };
  }
}
