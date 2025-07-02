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
  const balance = interaction.options.getInteger("monedas", true);

  if (!target || target.bot) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = target.bot
      ? `NO puedes usar mis poderes contra mi, bobo!`
      : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
    return await interactionService.errorReply(errorMsg + reason);
  }

  try {
    const agentExists = await necoService.checkAgentExists(target.id);

    if (!agentExists) {
      await necoService.createAgent(target.id);
    }

    await necoService.manipulateAgentBalance(target.id, balance);

    const replyMsg = `Ahora ${target.displayName} tiene ${balance} moneditas!`;
    return await interactionService.feedbackReply(replyMsg);
  } catch (e) {
    const errorMsg = `¡NYAAA! Algo salio MUY mal. Intenta de nuevo mas tarde... O diselo a Manuel.`;
    console.error(errorMsg, e);
    return await interactionService.errorReply(errorMsg);
  }
}
