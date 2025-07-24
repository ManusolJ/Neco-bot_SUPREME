import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import randomMessageBuilder from "@utils/build-random-message.util";
import { isUserLocked, lockUser, unlockUser } from "@utils/lock-user.util";
import Agent from "@interfaces/agent.interface";

export const data = new SlashCommandBuilder()
  .setName("beg")
  .setDescription("Pidele a Neco-arc unas cuantas monedas como el vagabundo que eres.");

const CULTIST_ROLE = process.env.CULTIST_ROLE;

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

  try {
    if (!interaction.inGuild() || !interaction.guild) {
      throw new Error("Interaction used outside server.");
    }

    if (!CULTIST_ROLE) {
      throw new Error("role environment variable missing in beg command.");
    }

    const guildMember = await interaction.guild.members.fetch(author.id);

    if (!author) {
      const errorMsg = "NYAAAHA! Hubo un problema intentado recuperar tu informacion!";
      return await interactionService.errorReply(errorMsg);
    }

    if (isUserLocked(author.id)) {
      const feedbackMsg = "¡Ya estas pidiendo! Espera a que termine, impaciente.";
      return await interactionService.feedbackReply(feedbackMsg);
    }

    lockUser(author.id);

    let agent: Agent | null = await necoService.getAgent(author.id);

    if (!agent) {
      agent = await necoService.createAgent(author.id);
    }

    if (!agent) throw new Error("Agent creation failed");

    if (agent.begged) {
      const feedbackMsg: string = `¿Otra vez pidiendo? Nyah~ ¡Eso no es muy digno del caos! Espera hasta el siguiente dia!`;
      const shame: number = agent.shame + 1;
      await necoService.manipulateAgentShame(author.id, shame);
      const image: string = path.resolve(IMAGE_FEEDBACK);
      return await interactionService.feedbackReply(feedbackMsg, [image]);
    }

    if (agent.balance >= LIMIT) {
      const feedbackMsg: string = `¿¡HUH!? Tu ya tienes suficientes monedas! A pedir a la iglesia.`;
      const image: string = path.resolve(IMAGE_FEEDBACK);
      return await interactionService.feedbackReply(feedbackMsg, [image]);
    }

    let success: boolean = Math.random() < 0.8;

    let secondTry: boolean = false;

    const cultistRole: string = CULTIST_ROLE;

    if (!success && cultistRole && guildMember.roles.cache.has(cultistRole)) {
      const replyMsg: string = `Fallaste! Menuda skill iss- Ah, espera... Que eres uno de mis fieles. Venga, otro intento...`;
      await interactionService.standardReply(replyMsg);
      success = Math.random() < 0.6;
      secondTry = true;
    }

    if (!success) {
      await necoService.manipulateAgentBegState(author.id, true);
      const replyMsg = randomMessageBuilder("begFail");
      const image = path.resolve(IMAGE_FAIL);
      return secondTry
        ? await interactionService.followReply({ content: replyMsg, files: [image] })
        : interactionService.filesReply(replyMsg, [image]);
    }

    const awarded: number = chaosBuilder(MINIMUM_AWARDED, MAXIMUM_AWARDED);
    const newBalance: number = agent.balance + awarded;
    await necoService.manipulateAgentBegState(author.id, true);
    await necoService.manipulateAgentBalance(author.id, newBalance);
    const replyMsg = `${randomMessageBuilder(data.name, author)} ${
      awarded > 1 ? `${awarded} puntos.` : `1 punto lmao.`
    }`;

    return secondTry
      ? await interactionService.followReply(replyMsg)
      : await interactionService.standardReply(replyMsg);
  } catch (e) {
    const errorMsg: string = `Error executing beg command: `;
    console.error(errorMsg, e);
  } finally {
    if (isUserLocked(interaction.user.id)) {
      unlockUser(interaction.user.id);
    }
  }
}
