/**
 * @file
 *
 * Implementation of the `/beg` slash command for Neco-arc.
 */

import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, User } from "discord.js";
import path from "path";

import Agent from "@interfaces/agent.interface";
import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import InteractionService from "@services/interaction.service";
import randomMessageBuilder from "@utils/build-random-message.util";
import { isUserLocked, lockUser, unlockUser } from "@utils/lock-user.util";

/**
 * Command data for the "beg" slash command.
 *
 * @remarks
 * Users can beg Neco-arc for a random amount of points.
 */
export const data = new SlashCommandBuilder()
  .setName("beg")
  .setDescription("Pidele a Neco-arc unas cuantas monedas como el vagabundo que eres.");

/**
 * Role ID for cultists, loaded from the CULTIST_ROLE environment variable.
 */
const CULTIST_ROLE: string = process.env.CULTIST_ROLE;

/**
 * Paths for images used in responses.
 */
const IMAGE_PATH = "public/img/";
const IMAGE_FEEDBACK = path.join(IMAGE_PATH, "pilk.jpg");
const IMAGE_FAIL = path.join(IMAGE_PATH, "fail.jpg");

/**
 * Maximum balance threshold before begging is disallowed.
 */
const LIMIT = 50;

/**
 * Minimum and maximum points awarded when begging.
 */
const MINIMUM_AWARDED = 1;
const MAXIMUM_AWARDED = 10;

/**
 * Handles execution of the `/beg` command.
 *
 * @param interaction - The command interaction instance from Discord.js
 * @returns A promise that resolves when the interaction has been replied to.
 * @throws {Error} If the interaction is used outside a guild, if required environment variables are missing,
 * or if agent creation/retrieval fails.
 */
export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);
  const author: User = interaction.user;

  try {
    // Ensure command is run in a guild context
    if (!interaction.inGuild() || !interaction.guild) {
      throw new Error("Interaction used outside server.");
    }

    // Ensure CULTIST_ROLE is defined
    if (!CULTIST_ROLE) {
      throw new Error("CULTIST_ROLE environment variable missing in beg command.");
    }

    // Prevent concurrent beg requests
    if (isUserLocked(author.id)) {
      const feedbackMsg = "¡Ya estas pidiendo! Espera a que termine, impaciente.";
      return await interactionService.replyEphemeral(feedbackMsg);
    }

    lockUser(author.id);

    await interaction.deferReply();

    const guildMember = await interaction.guild.members.fetch(author.id);

    // Retrieve or create the agent profile
    let agent: Agent | null = await necoService.getAgent(author.id);
    if (!agent) {
      agent = await necoService.createAgent(author.id);
    }

    if (!agent) {
      throw new Error("Agent creation failed");
    }

    // Deny repeated begs within the same day
    if (agent.begged) {
      const feedbackMsg = `¿Otra vez pidiendo? Nyah~ ¡Eso no es muy digno del caos! Espera hasta el siguiente dia!`;
      const shame = agent.shame + 1;
      await necoService.setAgentShame(author.id, shame);
      await interactionService.followUp({
        content: feedbackMsg,
        files: [path.resolve(IMAGE_FEEDBACK)],
        flags: MessageFlags.Ephemeral,
      });
      await interactionService.deleteReply();
      return;
    }

    // Deny if user already has sufficient balance
    if (agent.balance >= LIMIT) {
      const feedbackMsg = `¿¡HUH!? Tu ya tienes suficientes monedas! A pedir a la iglesia.`;
      await interactionService.followUp({
        content: feedbackMsg,
        files: [path.resolve(IMAGE_FEEDBACK)],
        flags: MessageFlags.Ephemeral,
      });
      await interactionService.deleteReply();
      return;
    }

    // Determine success chance
    let success = Math.random() < 0.8;

    // Allow cultists a second chance
    if (!success && guildMember.roles.cache.has(CULTIST_ROLE)) {
      const replyMsg = `Fallaste! Menuda skill iss- Ah, espera... Que eres uno de mis fieles. Venga, otro intento...`;
      await interactionService.editReply(replyMsg);
      success = Math.random() < 0.6;
    }

    // Handle failure case
    if (!success) {
      await necoService.setBeggedState(author.id, true);
      const replyMsg = randomMessageBuilder("begFail");
      const imagePath = path.resolve(IMAGE_FAIL);
      await interactionService.followUp({ content: replyMsg, files: [imagePath] });
      return;
    }

    // Handle success case
    const awarded = chaosBuilder(MINIMUM_AWARDED, MAXIMUM_AWARDED);
    await necoService.setBeggedState(author.id, true);
    await necoService.increaseAgentBalance(author.id, awarded);
    const replyMsg = `${randomMessageBuilder(data.name, author)} ${
      awarded > 1 ? `${awarded} puntos.` : `1 punto lmao.`
    }`;

    await interactionService.editReply(replyMsg);
  } catch (error) {
    console.error("Error executing beg command:", error);
  } finally {
    // Ensure user lock is released
    if (isUserLocked(interaction.user.id)) {
      unlockUser(interaction.user.id);
    }
  }
}
