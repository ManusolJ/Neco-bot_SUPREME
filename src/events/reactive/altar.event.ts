import type { Client } from "discord.js";

import NecoService from "@services/neco.service";
import MessageService from "@services/message.service";
import RandomMessageBuilder from "@utils/build-random-message.util";
import chaosBuilder from "@utils/build-chaos.util";
import reactionBuilder from "@utils/build-reaction.util";

export default function altarEvent(client: Client): void {
  client.on("messageCreate", async (message) => {
    if (message && message.channelId === process.env.NECO_ALTAR_CHANNEL) {
      const necoService = NecoService.getInstance();
      const author = message.author;

      if (author.bot) return;

      const hasMedia = message.embeds.length > 0 || message.attachments.size > 0;
      const hasTwitterLink = /https?:\/\/(x|twitter|vxtwitter)\.com\/\S+/i.test(message.content);
      const isPost = hasMedia || hasTwitterLink;

      if (!isPost) return;

      const channel = message.channel;

      if (!channel || channel.isTextBased() || !message.guild) return;

      const msgService = new MessageService(channel);

      await necoService.manipulateAgentNecoins(author.id, chaosBuilder(1, 5));

      const msg = RandomMessageBuilder("altar", author);

      if (!msg) return;

      try {
        await msgService.send(msg);
      } catch (e) {
        console.error(e);
        const errorMsg = "...Pero no he podido darte puntos! No preguntes porque, no lo se! Nyahahaahaha!";
        await msgService.sendError(msg + errorMsg);
      }
      await reactionBuilder(message);
    }
  });
}
