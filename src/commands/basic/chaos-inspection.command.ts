import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";

export const data = new SlashCommandBuilder()
  .setName("chaos-inspection")
  .setDescription("Inspecciona las cola y bolas de alguien (Las monedas que tiene).")
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
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = NecoService.getInstance();
  const interactionService = new InteractionService(interaction);
  const target = interaction.options.getUser("usuario", true);
  const hidden = interaction.options.getBoolean("oculto", false);

  if (!target || target.bot) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = target.bot
      ? `NO puedes usar mis poderes contra mi, bobo!`
      : `NO pude conseguir tu informacion... Krill issue.`;
    return await interactionService.errorReply(errorMsg + reason);
  }

  const agent = await necoService.getAgent(target.id);

  if (!agent) {
    const feedbackMsg = "Este schizo no tiene un solo punto! Le falta Pilk, vaya pringao.";
    return await interactionService.feedbackReply(feedbackMsg);
  } else {
    const coins = agent.necoins;
    const replyMsg = `Veamos, el schizo elegido tiene...${
      coins > 1 ? `${coins} monedas` : "1 moneda! LMAO, krill issue."
    }`;
    return hidden ? await interactionService.feedbackReply(replyMsg) : await interactionService.standardReply(replyMsg);
  }
}
