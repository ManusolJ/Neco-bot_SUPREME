import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from "@discordjs/voice";
import path from "path";
import fs from "fs";

import InteractionService from "@services/interaction.service";
import NecoService from "@services/neco.service";

// Cost of the action in chaotic points
const COST_OF_ACTION = 2;

// Paths for images and audio used in responses
const IMAGE_PATH = "public/img/";
const IMAGE_FEEDBACK = path.join(IMAGE_PATH, "pilk.jpg");
const AUDIO_PATH = "public/audio/";

// Time in milliseconds to delete the reply after sending
const TIME_FOR_REPLY_DELETE = 5000;

export const data = new SlashCommandBuilder()
  .setName("speak")
  .setDescription("Dile a Neco-Arc que haga un sonido.")
  .addStringOption((option) =>
    option
      .setName("sonido")
      .setDescription("Elige un sonido para reproducir.")
      .setRequired(true)
      .addChoices(
        { name: "Pluh!", value: "pluh" },
        { name: "Pipe.sfx", value: "pipe" },
        { name: "Burunyuu~~", value: "burunyuu" },
        { name: "Good boy!", value: "good_boy" },
        { name: "Bomboclaat!", value: "neco_bomboclaat" },
        { name: "El goblino", value: "neco_boblin" },
        { name: "Shawty", value: "shawty" },
        { name: "Minors", value: "grooming-neco" },
        { name: "Banana♪", value: "banana" },
        { name: "truck", value: "truck" }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const necoService = await NecoService.getInstance();
    const interactionService = new InteractionService(interaction);

    if (!interaction.inGuild() || !interaction.guild) {
      const errorMsg = "NYAAAHA! Este comando solo puede usar en el servidor!";
      return await interactionService.replyError(errorMsg);
    }

    const guild = interaction.guild;
    const author = interaction.user;
    const member = await interaction.guild.members.fetch(author.id);

    // Check if author and member exist
    if (!author || !member) {
      const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar tu informacion.`;
      await interactionService.replyError(errorMsg);
      throw new Error(`Error retrieving author or member. Author: ${author}, Member: ${member}`);
    }

    // Check if server exists
    if (!guild) {
      const errorMsg = "Hubo un problema al intentar pillar el servidor! Tehee~~";
      await interactionService.replyError(errorMsg);
      throw new Error("Guild retrieval failed");
    }

    const agent = await necoService.getAgent(author.id);

    // Check if the agent exists and has a balance
    if (!agent || agent.balance === null) {
      const errorMsg = `NYAHA! No pude recuperar la informacion de ${author.username}... Krill issue.`;
      await interactionService.replyError(errorMsg);
      throw new Error(`DB retrieval failed for author: ${author.id}`);
    }

    const balance = agent.balance;

    // Check if the author has enough balance to perform the action
    if (!balance || balance < COST_OF_ACTION) {
      const feedbackMsg = `LMAO! No tienes ni una sola moneda! Hueles a pobre.`;
      const image = path.resolve(IMAGE_FEEDBACK);
      return await interactionService.replyEphemeral(feedbackMsg, [image]);
    }

    const voiceChannel = member.voice.channel;

    // Check if voice channel exists
    if (!voiceChannel) {
      const errorMsg = `Hubo un problema al intentar pillar el canal de voz! Tehee~~`;
      await interactionService.replyError(errorMsg);
      throw new Error(`Voice channel retrieval failed for channel: ${voiceChannel}`);
    }

    const sound = `${interaction.options.getString("sonido", true)}`;
    const audioPath = path.resolve(`${AUDIO_PATH}${sound}.mp3`);

    // Check if the audio file exists
    if (!fs.existsSync(audioPath)) {
      const errorMsg = `Nyaa~ El sonido "${sound}" no existe.`;
      await interactionService.replyError(errorMsg);
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    // Create audio player and resource
    const player = createAudioPlayer();
    const resource = createAudioResource(audioPath, {
      inlineVolume: true,
    });

    // Check if the resource and player were created successfully
    if (!resource || !player) {
      const errorMsg = "No pude crear el recurso de audio o el reproductor!";
      await interactionService.replyError(errorMsg);
      throw new Error("Audio resource or player creation failed");
    }

    // Join the voice channel and play the sound
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    // Check if the connection was successful
    if (!connection) {
      const errorMsg = "No pude unirme al canal de voz!? Asegurate de que tengo permisos!!";
      return await interactionService.replyError(errorMsg);
    }

    // Decrease the author's balance
    await necoService.decreaseAgentBalance(author.id, COST_OF_ACTION);

    // Set volume based on some sounds types
    switch (sound) {
      case "pipe":
        resource.volume?.setVolume(0.4);
        break;
      case "neco_bomboclaat":
        resource.volume?.setVolume(0.5);
        break;
    }

    // Play the sound
    player.play(resource);
    connection.subscribe(player);
    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

    // Feedback to the user
    const feedbackMsg = `¡Sonido "${sound}" enviado nya~!`;
    await interactionService.replyEphemeral(feedbackMsg);

    // Delete the reply after a certain time
    setTimeout(async () => {
      interactionService.deleteReply();
    }, TIME_FOR_REPLY_DELETE);

    player.on("error", (error) => {
      console.error("El sonido se fue al vacio por este motivo: ", error);
      connection.destroy();
    });
  } catch (error) {
    console.error("Nyehehe! Alguien ha tocado algo y lo ha fastidiado todo... : ", error);
  }
}
