/**
 * @file
 *
 * Implementation of the `/beg` slash command for Neco-arc.
 */

import { ChatInputCommandInteraction, SlashCommandBuilder, User } from "discord.js";
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
const CULTIST_ROLE: string = process.env.CULTIST_ROLE!;

/**
 * Base path for public images.
 */
const IMAGE_PATH = "public/img/";

/**
 * File path for feedback image when begging.
 */
const IMAGE_FEEDBACK = path.join(IMAGE_PATH, "pilk.jpg");

/**
 * File path for failure image when begging.
 */
const IMAGE_FAIL = path.join(IMAGE_PATH, "fail.jpg");

/**
 * Maximum balance threshold before begging is disallowed.
 */
const LIMIT = 50;

/**
 * Minimum amount of points that can be awarded on a successful beg.
 */
const MINIMUM_AWARDED = 1;

/**
 * Maximum amount of points that can be awarded on a successful beg.
 */
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

    if (!CULTIST_ROLE) {
      throw new Error("CULTIST_ROLE environment variable missing in beg command.");
    }

    const guildMember = await interaction.guild.members.fetch(author.id);

    // Confirm author retrieved
    if (!author) {
      const errorMsg = "NYAAAHA! Hubo un problema intentado recuperar tu informacion!";
      return await interactionService.errorReply(errorMsg);
    }

    // Prevent concurrent beg requests
    if (isUserLocked(author.id)) {
      const feedbackMsg = "¡Ya estas pidiendo! Espera a que termine, impaciente.";
      return await interactionService.feedbackReply(feedbackMsg);
    }

    lockUser(author.id);

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
      await necoService.manipulateAgentShame(author.id, shame);
      return await interactionService.feedbackReply(feedbackMsg, [path.resolve(IMAGE_FEEDBACK)]);
    }

    // Deny if user already has sufficient balance
    if (agent.balance >= LIMIT) {
      const feedbackMsg = `¿¡HUH!? Tu ya tienes suficientes monedas! A pedir a la iglesia.`;
      return await interactionService.feedbackReply(feedbackMsg, [path.resolve(IMAGE_FEEDBACK)]);
    }

    // Determine success chance
    let success = Math.random() < 0.8;
    let secondTry = false;

    // Allow cultists a second chance
    if (!success && guildMember.roles.cache.has(CULTIST_ROLE)) {
      const replyMsg = `Fallaste! Menuda skill iss- Ah, espera... Que eres uno de mis fieles. Venga, otro intento...`;
      await interactionService.standardReply(replyMsg);
      success = Math.random() < 0.6;
      secondTry = true;
    }

    // Handle failure case
    if (!success) {
      await necoService.manipulateAgentBegState(author.id, true);
      const replyMsg = randomMessageBuilder("begFail");
      const imagePath = path.resolve(IMAGE_FAIL);
      return secondTry
        ? await interactionService.followReply({ content: replyMsg, files: [imagePath] })
        : await interactionService.filesReply(replyMsg, [imagePath]);
    }

    // Handle success case
    const awarded = chaosBuilder(MINIMUM_AWARDED, MAXIMUM_AWARDED);
    const newBalance = agent.balance + awarded;
    await necoService.manipulateAgentBegState(author.id, true);
    await necoService.manipulateAgentBalance(author.id, newBalance);
    const replyMsg = `${randomMessageBuilder(data.name, author)} ${
      awarded > 1 ? `${awarded} puntos.` : `1 punto lmao.`
    }`;

    return secondTry
      ? await interactionService.followReply(replyMsg)
      : await interactionService.standardReply(replyMsg);
  } catch (error) {
    console.error("Error executing beg command:", error);
  } finally {
    // Ensure user lock is released
    if (isUserLocked(interaction.user.id)) {
      unlockUser(interaction.user.id);
    }
  }
}
