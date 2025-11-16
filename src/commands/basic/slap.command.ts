import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";

// Cost of the action in chaotic points
const COST_OF_ACTION = 1;

// Paths for images used in responses
const IMAGE_PATH = "public/img/";
const IMAGE_FEEDBACK = path.join(IMAGE_PATH, "pilk.jpg");
const IMAGE_SLAP = path.join(IMAGE_PATH, "slap.jpg");

export const data = new SlashCommandBuilder()
  .setName("slap")
  .setDescription("Golpea las bolas de alguien.")
  .addUserOption((option) =>
    option
      .setName("usuario")
      .setDescription(
        "La persona a las que vas a golpear las bolas. Si es Jan, puede que haya recompensa...",
      )
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const target = interaction.options.getUser("usuario", true);
  const author = interaction.user;

  // Check if the target exists and is not a bot
  if (!author || target.bot) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = target.bot
      ? `NO puedes usar mis poderes contra mi, bobo!`
      : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
    return await interactionService.replyError(errorMsg + reason);
  }

  // Check if the target is the same as the author
  if (target.id === author.id) {
    const feedbackMsg = `NYAHAHAHA! ${author}, no puedes golpear tus propias bolas! Comprate enemigos.`;
    const image = path.resolve(IMAGE_FEEDBACK);
    return await interactionService.replyEphemeral(feedbackMsg, [image]);
  }

  const agent = await necoService.getAgent(author.id);

  // Check if the agent exists and has a balance
  if (!agent || agent.balance === null) {
    const errorMsg = `NYAHA! No pude recuperar la informacion de ${target.username}... Krill issue.`;
    return await interactionService.replyError(errorMsg);
  }

  const balance = agent.balance;

  // Check if the author has enough balance to perform the action
  if (!balance || balance < COST_OF_ACTION) {
    const feedbackMsg = `NYAHAHAHA! ${author}, no tienes suficientes puntos! Pero si que tienes un skill issue!`;
    const image = path.resolve(IMAGE_FEEDBACK);
    return await interactionService.replyEphemeral(feedbackMsg, [image]);
  }

  const replyMsg = `Wow ${target}! Nice balls, bro!`;
  const image = path.resolve(IMAGE_SLAP);
  return interactionService.replyWithFiles(replyMsg, [image]);
}
