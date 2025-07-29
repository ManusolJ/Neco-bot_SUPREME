import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";

export const data = new SlashCommandBuilder()
  .setName("chaos-info")
  .setDescription("Informacion sobre tu saldo caotico.");

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);
  const author = interaction.user;

  // Validate author user
  if (!author) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar tu informacion.`;
    return await interactionService.replyError(errorMsg);
  }

  try {
    // Retrieve the agent for the author
    const agent = await necoService.getAgent(author.id);

    // Check if the agent exists and has a valid balance
    if (!agent || agent.balance === null) {
      const feedbackMsg = `LMAO! No tienes ni un solo punto! Hueles a pobre.`;
      return await interactionService.replyEphemeral(feedbackMsg);
    }

    const balance = agent.balance;

    // Reply with the balance information
    const replyMsg = `${
      author.displayName ?? author.username
    } tiene unos ${balance} puntos. Creo. Es posible que se me haya olvidado anotar alguno.`;

    return await interactionService.replyEphemeral(replyMsg);
  } catch (e) {
    const errorMsg = "EH?! No consigo recordar los puntos del caos! Este es el problema: ";
    console.error(errorMsg, e);
    return await interactionService.replyError(errorMsg);
  }
}
