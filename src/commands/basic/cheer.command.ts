import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";
import randomMessageBuilder from "@utils/build-random-message.util";

// Cost of the action in chaotic points
const COST_OF_ACTION = 1;

// Paths for images used in responses
const IMAGE_PATH = "public/img/";
const IMAGE_FEEDBACK = path.join(IMAGE_PATH, "pilk.jpg");
const IMAGE_CHEER = path.join(IMAGE_PATH, "cheer.jpg");

export const data = new SlashCommandBuilder()
  .setName("cheer")
  .setDescription(`Felicidades de parte de la criatura!`)
  .addUserOption((option) =>
    option
      .setName(`usuario`)
      .setDescription(`El pilk consumer al que quieres felicitar por sobrevivir otro año.`)
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const target = interaction.options.getUser(`usuario`, true);
  const author = interaction.user;

  // Check if the target exists and is not a bot
  if (!target || target.bot) {
    const errorMsg = `NYAAAHA! Hubo un problema! Este es el motivo: `;
    const reason = target.bot
      ? `NO puedes usar mis poderes contra mi, bobo!`
      : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
    return await interactionService.replyError(errorMsg + reason);
  }

  // Check if the target is the same as the author
  if (target.id === author.id) {
    const feedbackMsg = `NYAHAHAHA! ${author}, no puedes felicitarte a ti mismo! Comprate amigos.`;
    const image = path.resolve(IMAGE_FEEDBACK);
    return await interactionService.replyEphemeral(feedbackMsg, [image]);
  }

  // Retrieve the agent of the author user
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

  try {
    await necoService.decreaseAgentBalance(author.id, COST_OF_ACTION);
  } catch (e) {
    const errorMsg = "EH?! No pude controlar el caos! Este es el problema: ";
    console.error(errorMsg, e);
    return await interactionService.replyError(errorMsg);
  }

  const replyMsg = randomMessageBuilder(data.name, target);
  const image = path.resolve(IMAGE_CHEER);
  return await interactionService.replyWithFiles(replyMsg, [image]);
}
