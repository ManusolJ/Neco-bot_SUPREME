import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";

export const data = new SlashCommandBuilder()
  .setName("chaos-inspection")
  .setDescription("Inspecciona las cola y bolas de alguien (Las monedas que tiene).")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((option) =>
    option
      .setName("usuario")
      .setDescription("Elije el usuario al que quieres verle la pilinga (las monedas que tiene).")
      .setRequired(true)
  )
  .addBooleanOption((option) =>
    option
      .setName("oculto")
      .setDescription("¿Quieres que los demas puedan ver la pilinga del vagabundo elegido (las monedas...)?")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const target = interaction.options.getUser("usuario", true);
  const hidden = interaction.options.getBoolean("oculto", false);

  // Validate target user
  if (target.bot) {
    const errorMsg = `NO puedes usar mis poderes contra mi, bobo!`;
    return await interactionService.replyError(errorMsg);
  }

  const agent = await necoService.getAgent(target.id);

  if (!agent || agent.balance === null) {
    const errorMsg = `NYAHA! No pude recuperar la informacion de ${target.username}... Krill issue.`;
    return await interactionService.replyError(errorMsg);
  }

  const balance = agent.balance;

  if (!balance) {
    const replyMsg = "Este schizo no tiene un solo punto! Le falta Pilk, vaya pringao.";
    return hidden ? await interactionService.replyEphemeral(replyMsg) : await interactionService.reply(replyMsg);
  } else {
    const replyMsg = `Veamos, ${target} tiene...${balance > 1 ? `${balance} puntos` : "1 punto! LMAO, krill issue."}`;
    return hidden ? await interactionService.replyEphemeral(replyMsg) : await interactionService.reply(replyMsg);
  }
}
