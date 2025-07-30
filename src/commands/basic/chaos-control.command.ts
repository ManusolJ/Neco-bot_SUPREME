import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";
import AuditLog from "@interfaces/audit-log.interface";

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
      .setName("puntos")
      .setDescription("Elije cuantas puntos quieres poner al schizo seleccionado.")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const target = interaction.options.getUser("usuario", true);
  const balance = interaction.options.getInteger("puntos", true);

  // Validate target user
  if (!target || target.bot) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = target.bot
      ? `NO puedes usar mis poderes contra mi, bobo!`
      : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
    return await interactionService.replyError(errorMsg + reason);
  }

  try {
    const currentBalance = await necoService.getAgent(target.id).then((agent) => agent?.balance || 0);
    // Set the chaotic balance for the target user
    await necoService.setAgentBalance(target.id, balance);

    const audit: AuditLog = {
      authorId: interaction.user.id,
      targetId: target.id,
      changedField: "set_balance",
      previousValue: currentBalance.toString(),
      newValue: balance.toString(),
    };

    // Log the audit for the balance change
    await necoService.logAudit(audit);

    const replyMsg = `Ahora ${target.displayName} tiene ${balance} puntos!`;
    return await interactionService.replyEphemeral(replyMsg);
  } catch (e) {
    const errorMsg = `¡NYAAA! Algo salio MUY mal. Intenta de nuevo mas tarde... O diselo a Manuel.`;
    console.error(errorMsg, e);
    return await interactionService.replyError(errorMsg);
  }
}
