import { Client, Events } from "discord.js";

import MessageService from "@services/message.service";
import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import randomMessageBuilder from "@utils/build-random-message.util";
import reactionBuilder from "@utils/build-reaction.util";

export default function altarEvent(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    if (message && message.channelId === process.env.NECO_ALTAR_CHANNEL) {
      const necoService = await NecoService.getInstance();
      const author = message.author;
      const guild = message.guild;

      if (author.bot || !guild) return;

      const hasMedia = message.embeds.length > 0 || message.attachments.size > 0;
      const hasTwitterLink = /https?:\/\/(x|twitter|vxtwitter)\.com\/\S+/i.test(message.content);
      const isPost = hasMedia || hasTwitterLink;

      if (!isPost) return;

      const channel = guild.channels.cache.get(message.channel.id);

      if (!channel || !channel.isTextBased()) return;

      const msgService = new MessageService(channel);

      await necoService.manipulateAgentNecoins(author.id, chaosBuilder(1, 5));

      const msg = randomMessageBuilder("altar", author);

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
