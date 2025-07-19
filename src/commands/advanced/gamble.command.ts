import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("gambling")
  .setDescription("LET'S GO GAMBLING!!!!")
  .addStringOption((option) =>
    option
      .setName("motivo")
      .setDescription("El motivo por el cual has decidido apostar esos deliciosos puntos.")
      .setRequired(true)
  );
