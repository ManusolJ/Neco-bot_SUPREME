import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";

export const data = new SlashCommandBuilder()
  .setName("chaos-control")
  .setDescription("Controla el saldo caotico de cada usuario en este servidor.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((user) =>
    user
      .setName("usuario")
      .setDescription("Elije el desafortunado vagabundo al que quieres modificar el saldo.")
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("monedas")
      .setDescription("Elije cuantas monedas quieres poner al schizo seleccionado.")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const target = interaction.options.getUser("usuario", true);
  const coins = interaction.options.getInteger("monedas", true);

  if (target.bot) {
    const errorMsg = `NO puedes usar mis poderes contra mi, bobo!`;
    return await interactionService.errorReply(errorMsg);
  }

  try {
    const agentExists = await necoService.checkAgentExists(target.id);

    if (!agentExists) {
      await necoService.createAgent(target.id);
    }

    await necoService.manipulateAgentBalance(target.id, coins);

    const replyMsg = `Ahora ${target.displayName} tiene ${coins} moneditas!`;
    return await interactionService.feedbackReply(replyMsg);
  } catch (e) {
    const errorMsg = `¡NYAAA! Algo salio MUY mal. Intenta de nuevo mas tarde... O diselo a Manuel.`;
    console.error(errorMsg, e);
    return await interactionService.errorReply(errorMsg);
  }
}
