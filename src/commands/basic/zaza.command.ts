import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import InteractionService from "@services/interaction.service";

export const data = new SlashCommandBuilder()
  .setName("zaza")
  .setDescription("Dale un hit al zaza de la criatura. De tranquis, por supuesto.");

const IMAGE_PATH = "public/img/";
const IMAGE_ZAZA = path.join(IMAGE_PATH, "zaza.jpg");
const IMAGE_ZAZA_R = path.join(IMAGE_PATH, "zaza-r.jpg");

export async function execute(interaction: ChatInputCommandInteraction) {
  const interactionService = new InteractionService(interaction);

  // Randomly decide if Ralsei is here
  let whyIsRalseiHere = Math.random() > 0.8;

  // Reply to the interaction
  if (whyIsRalseiHere) {
    const replyMsg = "Toma tio... No le des tan fuerte, que creo que estas viendo cosas";
    const image = IMAGE_ZAZA_R;
    return await interactionService.replyWithFiles(replyMsg, [image]);
  } else {
    const replyMsg = "Un poquito de zaza para ti... Que disfruton eres.";
    const image = IMAGE_ZAZA;
    return await interactionService.replyWithFiles(replyMsg, [image]);
  }
}
