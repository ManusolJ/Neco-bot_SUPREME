import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import path from "path";

import InteractionService from "@services/interaction.service";
import randomMessageBuilder from "@utils/build-random-message.util";

export const data = new SlashCommandBuilder()
  .setName("timer")
  .setDescription("Dile a Neco-arc que te mande un aviso pasado un tiempo.")
  .addStringOption((unidad) =>
    unidad
      .setName("unidad")
      .setDescription("¿Minutos o horas? Nyah!")
      .setRequired(true)
      .addChoices({ name: "Horas!", value: "hour" }, { name: "Minutos!", value: "minute" })
  )
  .addIntegerOption((cantidad) =>
    cantidad
      .setName("cantidad")
      .setDescription("¿Cuantos minutos u horas?")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(1440)
  );

const ANIMATION_PATH = "public/animation";
const DANCE_PATH = "dance.gif";

export async function execute(interaction: ChatInputCommandInteraction) {
  const interactionService = new InteractionService(interaction);
  const timeUnit = interaction.options.getString("unidad", true);
  const timeQuantity = interaction.options.getInteger("cantidad", true);

  if (!timeUnit || !timeQuantity) {
    const errorMsg = "Nyahu?! Lo siento, pero no me he enterado bien...";
    return await interactionService.errorReply(errorMsg);
  }

  const milliseconds = timeUnit === "hour" ? timeQuantity * 60 * 60 * 1000 : timeQuantity * 60 * 1000;

  if (!milliseconds) {
    const errorMsg = "¿¡HUUUH?! ¡Si no se sumar! ¿¡Para que me dices nada?!";
    return await interactionService.errorReply(errorMsg);
  }

  const author = interaction.user;

  if (!author) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar tu informacion.`;
    return await interactionService.errorReply(errorMsg);
  }

  const msg = `¡Muy bien nyah~! Te avisaré en ${timeQuantity} ${
    timeUnit === "hour" ? (timeQuantity > 1 ? "horas" : "hora") : timeQuantity > 1 ? "minutos" : "minuto"
  }!`;

  await interactionService.standardReply(msg);

  setTimeout(async () => {
    await interactionService.deleteReply();
  }, 5000);

  setTimeout(async () => {
    try {
      const msg = randomMessageBuilder(data.name, author);
      const imagePath = path.resolve(path.join(ANIMATION_PATH, DANCE_PATH));
      await author.send({
        content: msg,
        files: [imagePath],
      });
    } catch (err) {
      console.error("No pude enviar DM:", err);
    }
  }, milliseconds);
}
