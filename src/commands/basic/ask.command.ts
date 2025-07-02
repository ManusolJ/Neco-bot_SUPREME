import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";

export const data = new SlashCommandBuilder()
  .setName("ask")
  .setDescription("Haz que Neco-arc explique que no, en efecto no has preguntado.")
  .addUserOption((option) =>
    option
      .setName("usuario")
      .setDescription("La persona a la que quieres explicar que no le has preguntado.")
      .setRequired(true)
  );

const COST_OF_ACTION = 1;
const IMAGE_PATH = "public/img/";
const IMAGE_FAIL = path.join(IMAGE_PATH, "pilk.jpg");
const IMAGE_CARE = path.join(IMAGE_PATH, "care.jpg");

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const author = interaction.user;
  const target = interaction.options.getUser("usuario", true) ?? null;

  let balance = null;

  try {
    balance = await necoService.getAgent(author.id).then((agent) => (agent ? agent.balance : null));
  } catch (e) {
    const errorMsg = `Uuh... Hubo un error intentado controlar el saldo caotico... `;
    console.error(errorMsg, e);
    return await interactionService.errorReply(errorMsg);
  }

  if (!author || target.bot) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = target.bot
      ? `NO puedes usar mis poderes contra mi, bobo!`
      : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
    return await interactionService.errorReply(errorMsg + reason);
  }

  if (!balance || balance < COST_OF_ACTION) {
    const image = path.resolve(IMAGE_FAIL);
    const errorMsg = `NYAHAHAHA! ${author}, no tienes suficientes puntos! Pero si que tienes un skill issue!`;
    return await interactionService.feedbackReply(errorMsg, [image]);
  }

  try {
    await necoService.manipulateAgentBalance(author.id, balance - COST_OF_ACTION);
  } catch (e) {
    const errorMsg = "EH?! No pude controlar el caos! Este es el problema: ";
    console.error(errorMsg, e);
    return await interactionService.errorReply(errorMsg);
  }

  const replyMsg = `Ohoo~? Bueno ${target}, eso es interesante pero...`;
  const image = path.resolve(IMAGE_CARE);
  return await interactionService.filesReply(replyMsg, [image]);
}
