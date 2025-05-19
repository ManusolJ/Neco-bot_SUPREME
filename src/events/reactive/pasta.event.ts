import { Client, Events } from "discord.js";

import NecoService from "../../services/neco.service";
import MessageService from "../../services/message.service";
import chaosBuilder from "../../utils/build-chaos.util";
import RandomMessageBuilder from "../../utils/build-random-message.util";
import reactionBuilder from "../../utils/build-reaction.util";

export default function pastaEvent(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    if (message && message.channelId === process.env.COPYPASTA_CHANNEL) {
      const necoService = await NecoService.getInstance();
      const author = message.author;
      const guild = message.guild;

      if (author.bot || !guild) return;

      const isPasta = message.content.startsWith("Pasta:");

      if (!isPasta) return;

      const channel = guild.channels.cache.get(message.channel.id);

      if (!channel || !channel.isTextBased()) return;

      const msgService = new MessageService(channel);

      await necoService.manipulateAgentNecoins(author.id, chaosBuilder(1, 5));

      const msg = RandomMessageBuilder("pasta", author);

      if (!msg) return;

      try {
        await msgService.send(msg);
        await reactionBuilder(message);
      } catch (e) {
        console.error(e);
        const errorMsg = "...Pero no he podido darte puntos! No preguntes porque, no lo se! Nyahahaahaha!";
        await msgService.sendError(msg + errorMsg);
      }
    }
  });
}
