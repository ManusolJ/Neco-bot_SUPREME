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

  if (target.bot) {
    const errorMsg = `NO puedes usar mis poderes contra mi, bobo!`;
    return await interactionService.errorReply(errorMsg);
  }

  const balance = await necoService.getAgent(target.id).then((agent) => (agent ? agent.balance : null));

  if (!balance) {
    const replyMsg = "Este schizo no tiene un solo punto! Le falta Pilk, vaya pringao.";
    return hidden ? await interactionService.feedbackReply(replyMsg) : await interactionService.standardReply(replyMsg);
  } else {
    const replyMsg = `Veamos, ${target} tiene...${balance > 1 ? `${balance} monedas` : "1 moneda! LMAO, krill issue."}`;
    return hidden ? await interactionService.feedbackReply(replyMsg) : await interactionService.standardReply(replyMsg);
  }
}
