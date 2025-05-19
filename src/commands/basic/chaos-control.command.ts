import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import InteractionService from "../../services/interaction.service";
import NecoService from "../../services/neco.service";

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

  if (!target || target.bot) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
    const reason = target.bot
      ? `NO puedes usar mis poderes contra mi, bobo!`
      : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
    return await interactionService.errorReply(errorMsg + reason);
  }

  if (!coins) {
    const errorMsg = "Estupido dingus! No puedo hacer nada sin monedas!";
    return await interactionService.errorReply(errorMsg);
  }

  const agent = await necoService.getAgent(target.id);

  if (!agent) {
    await necoService.createAgent(target.id);
  }

  try {
    await necoService.manipulateAgentNecoins(target.id, coins);
  } catch (e) {
    const errorMsg = "EH?! No pude controlar el caos! Este es el problema: ";
    console.error(errorMsg, e);
  }

  const updatedCoins = await necoService.getAgent(target.id).then((agent) => (agent ? agent.necoins : 0));

  const replyMsg = `Ahora ${target.displayName} tiene ${updatedCoins} moneditas!`;

  return await interactionService.feedbackReply(replyMsg);
}
