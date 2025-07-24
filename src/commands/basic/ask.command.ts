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

const IMAGE_PATH = "public/img/";
const IMAGE_FAIL = path.join(IMAGE_PATH, "pilk.jpg");
const IMAGE_CARE = path.join(IMAGE_PATH, "care.jpg");
const COST_OF_ACTION = 1;

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const author = interaction.user;
  const target = interaction.options.getUser("usuario", true) ?? null;

  if (!author || !target) {
    const errorMsg = `NYAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = target
      ? `NO pude conseguir tu informacion... Krill issue.`
      : `NO pude conseguir la informacion del objetivo... Krill issue.`;
    await interactionService.errorReply(errorMsg + reason);
    throw new Error(reason);
  }

  if (author.id === target.id || target.bot) {
    const errorMsg = `NYAHA! No puedes usar mis poderes contra ti mismo o contra un bot, bobo!`;
    return await interactionService.errorReply(errorMsg);
  }

  const agent = await necoService.getAgent(author.id);

  if (!agent || agent.balance === null) {
    const errorMsg = "Hm?! Hubo un problema intentado recuperar tu saldo caotico...";
    await interactionService.errorReply(errorMsg);
    throw new Error(`Agent not found or balance is null. Agent info: ${agent}`);
  }

  const balance = agent.balance;

  if (!balance || balance < COST_OF_ACTION) {
    const errorMsg = `NYAHAHAHA! ${author}, no tienes suficientes puntos! Pero si que tienes un skill issue!`;
    return await interactionService.feedbackReply(errorMsg, [path.resolve(IMAGE_FAIL)]);
  }

  const newBalance = balance - COST_OF_ACTION;
  await necoService.manipulateAgentBalance(author.id, newBalance);

  const replyMsg = `Ohoo~? Bueno ${target}, eso es interesante pero...`;
  return await interactionService.filesReply(replyMsg, [path.resolve(IMAGE_CARE)]);
}
