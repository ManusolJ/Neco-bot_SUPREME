import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from "@discordjs/voice";
import path from "path";
import fs from "fs";

import NecoService from "@services/neco.service";
import InteractionService from "@services/interaction.service";

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
        { name: "Banana♪", value: "banana" }
      )
  );

const COST_OF_ACTION = 2;
const IMAGE_PATH = "public/img/";
const IMAGE_FEEDBACK = "pilk.jpg";

export async function execute(interaction: ChatInputCommandInteraction) {
  const necoService = NecoService.getInstance();
  const interactionService = new InteractionService(interaction);

  if (!interaction.inGuild() || !interaction.guild) {
    const errorMsg = "NYAAAHA! Este comando solo puede usar en el servidor!";
    return await interactionService.errorReply(errorMsg);
  }

  const guild = interaction.guild;
  const author = interaction.user;
  const member = await interaction.guild.members.fetch(author.id);

  if (!author || !member) {
    const errorMsg = `NYAAAHA! Hubo un problema intentado recuperar tu informacion.`;
    return await interactionService.errorReply(errorMsg);
  }

  if (!guild) {
    const errorMsg = "Hubo un problema al intentar pillar el servidor! Tehee~~";
    return await interactionService.errorReply(errorMsg);
  }

  const coins = await necoService.getAgent(author.id).then((agent) => (agent ? agent.necoins : null));

  if (!coins) {
    const feedbackMsg = `LMAO! No tienes ni una sola moneda! Hueles a pobre.`;
    const files = path.resolve(path.join(IMAGE_PATH, IMAGE_FEEDBACK));
    return await interactionService.feedbackReply(feedbackMsg, [files]);
  }

  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    const errorMsg = `Hubo un problema al intentar pillar el canal de voz! Tehee~~`;
    return await interactionService.errorReply(errorMsg);
  }

  const sound = interaction.options.getString("sonido", true);
  const audioPath = path.join(__dirname, `../../assets/sounds/${sound}.mp3`);

  if (!fs.existsSync(audioPath)) {
    const errorMsg = `Nyaa~ El sonido "${sound}" no existe.`;
    return await interactionService.errorReply(errorMsg);
  }

  const player = createAudioPlayer();
  const resource = createAudioResource(audioPath, {
    inlineVolume: true,
  });

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    await necoService.manipulateAgentNecoins(author.id, coins - COST_OF_ACTION);

    switch (sound) {
      case "pipe":
        resource.volume?.setVolume(0.1);
        break;
      case "neco_bomboclaat":
        resource.volume?.setVolume(0.5);
        break;
    }

    player.play(resource);
    connection.subscribe(player);
    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

    const feedbackMsg = `¡Sonido "${sound}" enviado nya~!`;
    await interactionService.feedbackReply(feedbackMsg);

    setTimeout(async () => {
      interactionService.deleteReply();
    }, 5000);

    player.on("error", (error) => {
      console.error("El sonido se fue al vacio por este motivo: ", error);
      connection.destroy();
    });
  } catch (error) {
    console.error("Nyehehe! Alguien ha tocado algo y lo ha fastidiado todo... : ", error);
  }
}
