import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";
import AuditLog from "@interfaces/db/audit-log.interface";

export const data = new SlashCommandBuilder()
  .setName("debug")
  .setDescription("Debug command operations for admin purposes.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("beg")
      .setDescription("Elije el estado de mendicidad de un usuario.")
      .addUserOption((option) =>
        option
          .setName("usuario")
          .setDescription("Elije el usuario al que quieres cambiar el estado de mendicidad.")
          .setRequired(true),
      )
      .addBooleanOption((option) =>
        option
          .setName("estado")
          .setDescription(
            "Elije el estado al que quieres cambiar el estado de mendicidad del usuario.",
          )
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("punishment")
      .setDescription("Elije el estado de castigo de un usuario.")
      .addUserOption((option) =>
        option
          .setName("usuario")
          .setDescription("Elije el usuario al que quieres cambiar el estado de castigo.")
          .setRequired(true),
      )
      .addBooleanOption((option) =>
        option
          .setName("estado")
          .setDescription(
            "Elije el estado al que quieres cambiar el estado de castigo del usuario.",
          )
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("chaos-control")
      .setDescription("Controla el saldo caotico de cada usuario en este servidor.")
      .addUserOption((user) =>
        user
          .setName("usuario")
          .setDescription("Elije el desafortunado vagabundo al que quieres modificar el saldo.")
          .setRequired(true),
      )
      .addIntegerOption((option) =>
        option
          .setName("puntos")
          .setDescription("Elije cuantas puntos quieres poner al schizo seleccionado.")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("chaos-inspection")
      .setDescription("Inspecciona las cola y bolas de alguien (Las monedas que tiene).")
      .addUserOption((option) =>
        option
          .setName("usuario")
          .setDescription(
            "Elije el usuario al que quieres verle la pilinga (las monedas que tiene).",
          )
          .setRequired(true),
      )
      .addBooleanOption((option) =>
        option
          .setName("oculto")
          .setDescription(
            "¿Quieres que los demas puedan ver la pilinga del vagabundo elegido (las monedas...)?",
          )
          .setRequired(false),
      ),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();
  const interactionService = new InteractionService(interaction);

  switch (subcommand) {
    case "beg":
      await handleBegState(interaction);
      break;
    case "punishment":
      await handlePunishmentState(interaction);
      break;
    case "chaos-control":
      await handleChaosControl(interaction);
      break;
    case "chaos-inspection":
      await handleChaosInspection(interaction);
      break;
    default:
      const errorMsg = "Krill issue: Subcommand not recognized.";
      return await interactionService.replyError(errorMsg);
  }
}

async function handleBegState(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const target = interaction.options.getUser("usuario", true);
  const newState = interaction.options.getBoolean("estado", true);

  try {
    // Validate target user
    if (!target || target.bot) {
      const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
      const reason = target.bot
        ? `NO puedes usar mis poderes contra mi, bobo!`
        : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
      await interactionService.replyError(errorMsg + reason);
      throw new Error(`Error retrieving user information in beg state: ${reason}`);
    }

    const agent = await necoService.getAgent(target.id);
    if (!agent) {
      const errorMsg = `NYAHA! No pude recuperar la informacion de ${target.username}... Krill issue.`;
      await interactionService.replyError(errorMsg);
      throw new Error(`Error retrieving agent information for ${target.username}`);
    }

    // Set the begging state for the target user
    await necoService.setBeggedState(target.id, newState);

    const audit: AuditLog = {
      authorId: interaction.user.id,
      targetId: target.id,
      changedField: "begging_state",
      previousValue: agent.begged.toString(),
      newValue: newState.toString(),
    };

    // Log the audit for the begging state change
    await necoService.logAudit(audit);

    const replyMsg = `Ahora ${target.displayName} esta en modo mendigado: ${
      newState ? "ON" : "OFF"
    }!`;
    return await interactionService.replyEphemeral(replyMsg);
  } catch (e) {
    const errorMsg = "Error in beg state handling: ";
    console.error(errorMsg, e);
    return await interactionService.replyError(errorMsg);
  }
}

async function handlePunishmentState(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const target = interaction.options.getUser("usuario", true);
  const newState = interaction.options.getBoolean("estado", true);

  try {
    // Validate target user
    if (!target || target.bot) {
      const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
      const reason = target.bot
        ? `NO puedes usar mis poderes contra mi, bobo!`
        : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
      await interactionService.replyError(errorMsg + reason);
      throw new Error(`Error retrieving user information in punishment state: ${reason}`);
    }

    const agent = await necoService.getAgent(target.id);
    if (!agent) {
      const errorMsg = `NYAHA! No pude recuperar la informacion de ${target.username}... Krill issue.`;
      await interactionService.replyError(errorMsg);
      throw new Error(`Error retrieving agent information for ${target.username}`);
    }

    // Set the punishment state for the target user
    await necoService.setPunishmentState(target.id, newState);

    const audit: AuditLog = {
      authorId: interaction.user.id,
      targetId: target.id,
      changedField: "punishment_state",
      previousValue: agent.punished.toString(),
      newValue: newState.toString(),
    };

    // Log the audit for the punishment state change
    await necoService.logAudit(audit);

    const replyMsg = `Ahora ${target.displayName} esta en modo castigado: ${
      newState ? "ON" : "OFF"
    }!`;
    return await interactionService.replyEphemeral(replyMsg);
  } catch (e) {
    const errorMsg = "Error in punishment state handling: ";
    console.error(errorMsg, e);
    return await interactionService.replyError(errorMsg);
  }
}

async function handleChaosControl(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const target = interaction.options.getUser("usuario", true);
  const newBalance = interaction.options.getInteger("puntos", true);
  try {
    // Validate target user
    if (!target || target.bot) {
      const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar la informacion. Este es el motivo: `;
      const reason = target.bot
        ? `NO puedes usar mis poderes contra mi, bobo!`
        : `NO pude conseguir tu informacion o la del objetivo... Krill issue.`;
      await interactionService.replyError(errorMsg + reason);
      throw new Error(`Errro retrieving user information in chaos control: ${reason}`);
    }

    const agent = await necoService.getAgent(target.id);
    const currentBalance = agent?.balance ?? 0;

    // Set the chaotic balance for the target user
    await necoService.setAgentBalance(target.id, newBalance);

    const audit: AuditLog = {
      authorId: interaction.user.id,
      targetId: target.id,
      changedField: "set_balance",
      previousValue: currentBalance.toString(),
      newValue: newBalance.toString(),
    };

    // Log the audit for the balance change
    await necoService.logAudit(audit);

    const replyMsg = `Ahora ${target.displayName} tiene ${newBalance} puntos!`;
    return await interactionService.replyEphemeral(replyMsg);
  } catch (e) {
    const errorMsg = "Error in chaos control handling: ";
    console.error(errorMsg, e);
  }
}

export async function handleChaosInspection(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const target = interaction.options.getUser("usuario", true);
  const hidden = interaction.options.getBoolean("oculto", false);
  try {
    // Validate target user
    if (target.bot) {
      const errorMsg = `NO puedes usar mis poderes contra mi, bobo!`;
      await interactionService.replyError(errorMsg);
      throw new Error("Attempted to inspect bot's balance.");
    }

    const agent = await necoService.getAgent(target.id);

    // Check if agent exists and has a balance
    if (!agent || agent.balance === null) {
      const errorMsg = `NYAHA! No pude recuperar la informacion de ${target.username}... Krill issue.`;
      await interactionService.replyError(errorMsg);
      throw new Error(`Error retrieving agent information for ${target.username}`);
    }

    const balance = agent.balance;

    if (!balance) {
      const replyMsg = "Este schizo no tiene un solo punto! Le falta Pilk, vaya pringao.";
      return hidden
        ? await interactionService.replyEphemeral(replyMsg)
        : await interactionService.reply(replyMsg);
    } else {
      const replyMsg = `Veamos, ${target} tiene...${
        balance > 1 ? `${balance} puntos` : "1 punto! LMAO, krill issue."
      }`;
      return hidden
        ? await interactionService.replyEphemeral(replyMsg)
        : await interactionService.reply(replyMsg);
    }
  } catch (e) {
    const errorMsg = "Error in chaos inspection handling: ";
    console.error(errorMsg, e);
  }
}
