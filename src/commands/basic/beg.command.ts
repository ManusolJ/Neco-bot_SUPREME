import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import randomMessageBuilder from "@utils/build-random-message.util";
import { isUserLocked, lockUser, unlockUser } from "@utils/lock-user.util";

export const data = new SlashCommandBuilder()
  .setName("beg")
  .setDescription("Pidele a Neco-arc unas cuantas monedas como el vagabundo que eres.");

const IMAGE_PATH = "public/img/";
const IMAGE_FEEDBACK = path.join(IMAGE_PATH, "pilk.jpg");
const IMAGE_FAIL = path.join(IMAGE_PATH, "fail.jpg");

const LIMIT = 50;
const MINIMUM_AWARDED = 1;
const MAXIMUM_AWARDED = 10;

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = await NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  const author = interaction.user;
  let isLocked = false;

  try {
    if (!interaction.inGuild() || !interaction.guild) {
      const errorMsg = "NYAAAHA! Este comando solo puede usar en el servidor!";
      return await interactionService.errorReply(errorMsg);
    }

    const member = await interaction.guild.members.fetch(author.id);

    if (!member) {
      const errorMsg = "NYAAAHA! Hubo un problema intentado recuperar tu informacion!";
      return await interactionService.errorReply(errorMsg);
    }

    if (isUserLocked(author.id)) {
      const feedbackMsg = "¡Ya estas pidiendo! Espera a que termine, impaciente.";
      return await interactionService.feedbackReply(feedbackMsg);
    }

    lockUser(author.id);
    isLocked = true;

    let agent = await necoService.getAgent(member.id);

    if (!agent) {
      await necoService.createAgent(author.id);
      agent = await necoService.getAgent(author.id);
    }

    if (!agent) throw new Error("Agent creation failed");

    if (agent.begged) {
      const feedbackMsg = "¿Otra vez pidiendo? Nyah~ ¡Eso no es muy digno del caos! Espera hasta el siguiente dia!";
      const image = path.resolve(IMAGE_FEEDBACK);
      return await interactionService.feedbackReply(feedbackMsg, [image]);
    }

    if (agent.balance >= LIMIT) {
      const feedbackMsg = "¿¡HUH!? Tu ya tienes suficientes monedas! A pedir a la iglesia.";
      const image = path.resolve(IMAGE_FEEDBACK);
      return await interactionService.feedbackReply(feedbackMsg, [image]);
    }

    let success = Math.random() < 0.8;

    const cultistRole = process.env.CULTIST_ROLE;

    let secondTry;

    if (!success && cultistRole && member.roles.cache.has(cultistRole)) {
      const replyMsg = "Fallaste! Menuda skill iss- Ah, espera... Que eres uno de mis fieles. Venga, otro intento...";
      await interactionService.standardReply(replyMsg);
      success = Math.random() < 0.6;
      success ? (secondTry = true) : (secondTry = false);
    }

    if (!success) {
      await necoService.manipulateAgentBegState(member.id, true);
      const replyMsg = randomMessageBuilder("begFail");
      const image = path.resolve(IMAGE_FAIL);
      return await interactionService.followReply({ content: replyMsg, files: [image] });
    }

    const awarded = chaosBuilder(MINIMUM_AWARDED, MAXIMUM_AWARDED);
    await necoService.manipulateAgentBegState(member.id, true);
    await necoService.manipulateAgentBalance(member.id, agent.balance + awarded);
    const replyMsg = `${randomMessageBuilder(data.name, author)} ${
      awarded > 1 ? `${awarded} puntos.` : `1 punto lmao.`
    }`;

    return secondTry
      ? await interactionService.followReply(replyMsg)
      : await interactionService.standardReply(replyMsg);
  } catch (e) {
    const errorMsg = `Hubo un PROBLEMA! El siguiente: `;
    console.error(errorMsg, e);
    await interactionService.errorReply("¡NYAAA! Algo salio MUY mal. Intenta de nuevo mas tarde... O diselo a Manuel.");
  } finally {
    if (isLocked) {
      unlockUser(interaction.user.id);
    }
  }
}
