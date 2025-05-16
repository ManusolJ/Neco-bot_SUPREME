import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import NecoService from "@services/neco.service";
import InteractionService from "@services/interaction.service";
import RandomMessageBuilder from "@utils/build-random-message.util";

export const data = new SlashCommandBuilder()
  .setName("slap")
  .setDescription("Golpea las bolas de alguien.")
  .addUserOption((option) =>
    option
      .setName("usuario")
      .setDescription("La persona a las que vas a golpear las bolas. Si es Jan, puede que haya recompensa...")
      .setRequired(true)
  );

const COST_OF_ACTION = 1;
const IMAGE_PATH = "public/img/";
const IMAGE_FEEDBACK = "pilk.jpg";
const IMAGE_SLAP = "slap.jpg";

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = NecoService.getInstance();
  const interactionService = new InteractionService(interaction);
  const target = interaction.options.getUser("usuario", true);
  const author = interaction.user;

  if (!target || !author || target.bot) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = target.bot
      ? `NO puedes usar mis poderes contra mi, bobo!`
      : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
    return await interactionService.errorReply(errorMsg + reason);
  }

  const coins = await necoService.getAgent(target.id).then((agent) => (agent ? agent.necoins : null));

  if (!coins || coins < COST_OF_ACTION) {
    const feedbackMsg = `NYAHAHAHA! ${author}, no tienes suficientes puntos! Pero si que tienes un skill issue!`;
    const files = path.resolve(path.join(IMAGE_PATH + IMAGE_FEEDBACK));
    return await interactionService.feedbackReply(feedbackMsg, [files]);
  }

  try {
    await necoService.manipulateAgentNecoins(author.id, coins - COST_OF_ACTION);
  } catch (e) {
    const errorMsg = "EH?! No pude controlar el caos! Este es el problema: ";
    console.error(errorMsg, e);
    return await interactionService.errorReply(errorMsg);
  }

  const msg = RandomMessageBuilder(data.name, target);
  const files = path.resolve(path.join(IMAGE_PATH + IMAGE_SLAP));
  return await interactionService.filesReply(msg, [files]);
}
