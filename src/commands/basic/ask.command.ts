import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";

// Paths for images used in responses
const IMAGE_PATH = "public/img/";
const IMAGE_FAIL = path.join(IMAGE_PATH, "pilk.jpg");
const IMAGE_CARE = path.join(IMAGE_PATH, "care.jpg");
// Cost of the action in chaotic points
const COST_OF_ACTION = 1;

export const data = new SlashCommandBuilder()
  .setName("ask")
  .setDescription("Haz que Neco-arc explique que no, en efecto no has preguntado.")
  .addUserOption((option) =>
    option
      .setName("usuario")
      .setDescription("La persona a la que quieres explicar que no le has preguntado.")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const author = interaction.user;
  const target = interaction.options.getUser("usuario", true) ?? null;

  // Validate author and target users
  if (!author || !target) {
    const errorMsg = `NYAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = target
      ? `NO pude conseguir tu informacion... Krill issue.`
      : `NO pude conseguir la informacion del objetivo... Krill issue.`;
    await interactionService.replyError(errorMsg + reason);
    throw new Error(reason);
  }

  // Check if the author is trying to use the command on themselves or a bot
  if (author.id === target.id || target.bot) {
    const errorMsg = `NYAHA! No puedes usar mis poderes contra ti mismo o contra un bot, bobo!`;
    return await interactionService.replyError(errorMsg);
  }

  // Retrieve the agent for the author
  const agent = await necoService.getAgent(author.id);

  // Check if the agent exists and has a valid balance
  if (!agent || agent.balance === null) {
    const errorMsg = "Hm?! Hubo un problema intentado recuperar tu saldo caotico...";
    await interactionService.replyError(errorMsg);
    throw new Error(`Agent not found or balance is null. Agent info: ${agent}`);
  }

  const balance = agent.balance;

  // Check if the author has enough balance to perform the action
  if (!balance || balance < COST_OF_ACTION) {
    const errorMsg = `NYAHAHAHA! ${author}, no tienes suficientes puntos! Pero si que tienes un skill issue!`;
    return await interactionService.replyWithFiles(errorMsg, [path.resolve(IMAGE_FAIL)]);
  }

  await necoService.decreaseAgentBalance(author.id, COST_OF_ACTION);

  const replyMsg = `Ohoo~? Bueno ${target}, eso es interesante pero...`;
  return await interactionService.replyWithFiles(replyMsg, [path.resolve(IMAGE_CARE)]);
}
