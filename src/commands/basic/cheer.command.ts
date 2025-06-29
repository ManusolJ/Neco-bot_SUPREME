import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";
import randomMessageBuilder from "@utils/build-random-message.util";

export const data = new SlashCommandBuilder()
  .setName("cheer")
  .setDescription(`Felicidades de parte de la criatura!`)
  .addUserOption((option) =>
    option
      .setName(`usuario`)
      .setDescription(`El pilk consumer al que quieres felicitar por sobrevivir otro año.`)
      .setRequired(true)
  );

const COST_OF_ACTION = 1;
const IMAGE_PATH = "public/img/";
const IMAGE_FEEDBACK = "pilk.jpg";
const IMAGE_CHEER = "cheer.jpg";

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const target = interaction.options.getUser(`usuario`, true);
  const author = interaction.user;

  if (!target || target.bot) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = target.bot
      ? `NO puedes usar mis poderes contra mi, bobo!`
      : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
    return await interactionService.errorReply(errorMsg + reason);
  }

  const coins = await necoService.getAgent(target.id).then((agent) => (agent ? agent.balance : null));

  if (!coins || coins < COST_OF_ACTION) {
    const feedbackMsg = `NYAHAHAHA! ${author}, no tienes suficientes puntos! Pero si que tienes un skill issue!`;
    const files = path.resolve(path.join(IMAGE_PATH + IMAGE_FEEDBACK));
    return await interactionService.feedbackReply(feedbackMsg, [files]);
  }

  try {
    await necoService.manipulateAgentBalance(author.id, coins - COST_OF_ACTION);
  } catch (e) {
    const errorMsg = "EH?! No pude controlar el caos! Este es el problema: ";
    console.error(errorMsg, e);
    return await interactionService.errorReply(errorMsg);
  }

  const replyMsg = randomMessageBuilder(data.name, target);
  const files = path.resolve(path.join(IMAGE_PATH + IMAGE_CHEER));
  return await interactionService.filesReply(replyMsg, [files]);
}
