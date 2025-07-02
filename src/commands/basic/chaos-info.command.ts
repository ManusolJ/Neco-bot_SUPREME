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

  if (!author) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar tu informacion.`;
    return await interactionService.errorReply(errorMsg);
  }

  try {
    const balance = await necoService.getAgent(author.id).then((agent) => (agent ? agent.balance : null));

    if (!balance) {
      const feedbackMsg = `LMAO! No tienes ni una sola moneda! Hueles a pobre.`;
      return await interactionService.feedbackReply(feedbackMsg);
    }

    const replyMsg = `${
      author.displayName ?? author.username
    } tiene unas ${balance} monedas. Creo. Es posible que se me haya olvidado anotar alguno.`;

    return await interactionService.feedbackReply(replyMsg);
  } catch (e) {
    const errorMsg = "EH?! No consigo recordar los puntos del caos! Este es el problema: ";
    console.error(errorMsg, e);
    return await interactionService.errorReply(errorMsg);
  }
}
