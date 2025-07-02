import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";

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
const IMAGE_FEEDBACK = path.join(IMAGE_PATH, "pilk.jpg");
const IMAGE_SLAP = path.join(IMAGE_PATH, "slap.jpg");

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const target = interaction.options.getUser("usuario", true);
  const author = interaction.user;

  if (!author || target.bot) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = target.bot
      ? `NO puedes usar mis poderes contra mi, bobo!`
      : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
    return await interactionService.errorReply(errorMsg + reason);
  }

  const balance = await necoService.getAgent(author.id).then((agent) => (agent ? agent.balance : null));

  if (!balance || balance < COST_OF_ACTION) {
    const feedbackMsg = `NYAHAHAHA! ${author}, no tienes suficientes puntos! Pero si que tienes un skill issue!`;
    const image = path.resolve(IMAGE_FEEDBACK);
    return await interactionService.feedbackReply(feedbackMsg, [image]);
  }

  try {
    const jan = process.env.USER_JAN;
    console.log(jan);
    let success;
    if (jan) {
      const targetIsJan = target.id === jan;
      console.log(targetIsJan);

      if (targetIsJan) {
        success = Math.random() > 0.5;
        console.log(success);
      }
      if (success) {
        const replyMsg = `¡Vaya! Con que alguien quiere slapear las bolas de Jan... Pues venga, esta es gratis. Pero no te acostumbres`;
        await interactionService.standardReply(replyMsg);
      }
    }

    if (!success) {
      await necoService.manipulateAgentBalance(author.id, balance - COST_OF_ACTION);
    }
  } catch (e) {
    const errorMsg = "EH?! No pude controlar el caos! Este es el problema: ";
    console.error(errorMsg, e);
    return await interactionService.errorReply(errorMsg);
  }

  const replyMsg = `Wow ${target}! Nice balls, bro!`;
  const image = path.resolve(IMAGE_SLAP);
  return await interactionService.filesReply(replyMsg, [image]);
}
