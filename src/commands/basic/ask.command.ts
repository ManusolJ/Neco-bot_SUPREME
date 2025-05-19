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

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const author = interaction.user;
  const target = interaction.options.getUser("usuario", true) ?? null;

  let coins = null;

  try {
    coins = await necoService.getAgent(author.id).then((agent) => (agent ? agent.necoins : null));
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

  if (!coins || coins < COST_OF_ACTION) {
    const imagePath = path.resolve("public/img/pilk.jpg");
    const errorMsg = `NYAHAHAHA! ${author}, no tienes suficientes puntos! Pero si que tienes un skill issue!`;
    return await interactionService.feedbackReply(errorMsg, [imagePath]);
  }

  try {
    await necoService.manipulateAgentNecoins(author.id, coins - COST_OF_ACTION);
  } catch (e) {
    const errorMsg = "EH?! No pude controlar el caos! Este es el problema: ";
    console.error(errorMsg, e);
    return await interactionService.errorReply(errorMsg);
  }

  const replyMsg = `Ohoo~? Bueno ${target}, eso es interesante pero...`;
  const imagePath = path.resolve("public/img/care.jpg");
  return await interactionService.filesReply(replyMsg, [imagePath]);
}
