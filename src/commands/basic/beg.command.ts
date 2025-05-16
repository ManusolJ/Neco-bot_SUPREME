import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import type ChaosAgent from "@interfaces/agent.interface";
import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";
import RandomMessageBuilder from "@utils/build-random-message.util";
import { isUserLocked, lockUser, unlockUser } from "@utils/lock-user.util";
import chaosBuilder from "@utils/build-chaos.util";

export const data = new SlashCommandBuilder()
  .setName("beg")
  .setDescription("Pidele a Neco-arc unas cuantas monedas como el vagabundo que eres.");

const LIMIT = 50;
const IMAGE_PATH = "public/img/";
const IMAGE_FEEDBACK = "pilk.jpg";
const IMAGE_FAIL = "fail.jpg";
const MINIMUM_AWARDED = 1;
const MAXIMUM_AWARDED = 10;

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  try {
    if (!interaction.inGuild() || !interaction.guild) {
      const errorMsg = "NYAAAHA! Este comando solo puede usar en el servidor!";
      return await interactionService.errorReply(errorMsg);
    }

    const author = interaction.user;
    const member = await interaction.guild.members.fetch(author.id);

    if (!author) {
      const errorMsg = "NYAAAHA! Hubo un problema intentado recuperar tu informacion!";
      return await interactionService.errorReply(errorMsg);
    }

    if (isUserLocked(author.id)) {
      const feedbackMsg = "¡Ya estas pidiendo! Espera a que termine, impaciente.";
      return await interactionService.feedbackReply(feedbackMsg);
    }

    lockUser(author.id);

    let agent = await necoService.getAgent(author.id);

    if (!agent) {
      await necoService.createAgent(author.id);
      agent = await necoService.getAgent(author.id);
    }

    if (!agent) throw new Error("Agent creation failed");

    if (agent.begged) {
      const msg = "¿Otra vez pidiendo? Nyah~ ¡Eso no es muy digno del caos! Espera hasta el siguiente dia!";
      const imgPath = path.resolve(path.join(IMAGE_PATH, IMAGE_FEEDBACK));
      return await interactionService.filesReply(msg, [imgPath]);
    }

    if (agent.necoins >= LIMIT) {
      const msg = "¿¡HUH!? Tu ya tienes suficientes monedas! A pedir a la iglesia.";
      const imgPath = path.resolve(path.join(IMAGE_PATH, IMAGE_FEEDBACK));
      return await interactionService.filesReply(msg, [imgPath]);
    }

    let success = Math.random() < 0.8;
    if (!success && member.roles.cache.has(process.env.CULTIST_ROLE)) {
      success = Math.random() < 0.6;
    }

    if (!success) {
      await necoService.manipulateAgentBegState(author.id, true);
      const msg = RandomMessageBuilder("begFail");
      const imgPath = path.resolve(path.join(IMAGE_PATH, IMAGE_FAIL));
      return await interactionService.filesReply(msg, [imgPath]);
    }

    const awarded = chaosBuilder(MINIMUM_AWARDED, MAXIMUM_AWARDED);
    await necoService.manipulateAgentNecoins(author.id, agent.necoins + awarded);
    const reply = `${RandomMessageBuilder("beg", author)} ${awarded > 1 ? `${awarded} puntos.` : `1 punto lmao.`}`;

    return await interactionService.standardReply(reply);
  } finally {
    unlockUser(interaction.user.id);
  }
}
