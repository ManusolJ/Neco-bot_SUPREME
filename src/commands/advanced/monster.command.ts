import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { env } from "process";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";
import { ImageClassification } from "@interfaces/image-classification.interface";

export const data = new SlashCommandBuilder()
  .setName("monster")
  .setDescription("Manda una foto de tu monster en viernes como la tradicion demanda.")
  .addAttachmentOption((option) =>
    option.setName("prueba").setDescription("Tienes que añadir la foto para probar tu devocion.").setRequired(true)
  );

const REWARD = 5;
const PUNISHMENT_ROLE = env.HERETIC_ROLE;
const ROBOFLOW_ENDPOINT = `https://classify.roboflow.com/${env.MODEL_NAME}/${env.MODEL_VERSION}?api_key=${env.ROBOFLOW_API_KEY}`;
const SPAIN_TIMEZONE = "Europe/Madrid";

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  await interactionService.deferReply(true);

  const guild = interaction.guild;
  const author = interaction.user;
  const sentImage = interaction.options.getAttachment("prueba", true);

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

  const result = await detectMonster(sentImage.url);
  const now = new Date();
  const spainTime = new Date(now.toLocaleString("en-US", { timeZone: SPAIN_TIMEZONE }));
  const isFriday = spainTime.getDay() === 5;

  if (result && isFriday) {
    const newBalance = agent.balance + REWARD;
    await necoService.manipulateAgentBalance(author.id, newBalance);
    const replyMsg = `Vaya! Que buen monstruo tienes ahi, pillin... Has demonstrado tu devocion por las tradiciones, asi que te regalo esto: ${REWARD} puntos. No te lo gastes todo slapeando las bolas de jan`;
    return interactionService.followReply(replyMsg);
  } else if (result && !isFriday) {
    if (PUNISHMENT_ROLE) {
      const member = await guild.members.fetch(author.id);
      await member.roles.add(PUNISHMENT_ROLE);
    }

    return interactionService.followReply(
      "Fantástico monster que tienes ahí... PERO!!!! Hoy no es viernes, heretico. Quedas castigado."
    );
  } else if (!result && isFriday) {
    return interactionService.followReply("...Huh? Eso ni siquiera parece un monster. Serás bobo.");
  } else {
    return interactionService.followReply(
      "Eso ni siquiera es un monster... y encima hoy no es viernes. ¿Qué intentas? A la proxima te desintegro."
    );
  }
}

async function detectMonster(imageUrl: string): Promise<boolean> {
  const imageResponse = await fetch(imageUrl);
  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  const response = await fetch(ROBOFLOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ image: base64Data }),
  });

  if (!response.ok) {
    console.error("Roboflow error:", response.statusText);
    return false;
  }

  const data: ImageClassification = await response.json();

  return (
    data.confidence > 0.75 &&
    data.top !== "none" &&
    data.predictions.some((p) => p.class !== null && p.class !== "none" && p.confidence > 0.75)
  );
}
