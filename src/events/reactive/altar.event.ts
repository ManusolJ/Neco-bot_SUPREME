import { Client, Events, Message, OmitPartialGroupDMChannel } from "discord.js";
import { env } from "process";

import MessageService from "@services/message.service";
import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import randomMessageBuilder from "@utils/build-random-message.util";
import reactionBuilder from "@utils/build-reaction.util";

const NECO_ALTAR_CHANNEL_ID = env.NECO_ALTAR_CHANNEL;

const MINIMUM_REWARD = 1;
const MAXIMUM_REWARD = 5;

const MESSAGE_CASE = "altar";

export default function altarEvent(client: Client): void {
  client.on(Events.MessageCreate, async (message) => handleAltarEvent(message));
}

async function handleAltarEvent(message: OmitPartialGroupDMChannel<Message<boolean>>) {
  if (message && message.channelId === NECO_ALTAR_CHANNEL_ID) {
    const necoService = await NecoService.getInstance();

    const author = message.author;
    const guild = message.guild;

    if (!guild || !author) {
      console.error("Hubo un error al intentar recuperar el autor o el servidor del mensaje.");
      return;
    }

    if (author.bot) return;

    const hasMedia = message.embeds.length > 0 || message.attachments.size > 0;

    const hasTwitterLink = /https?:\/\/(x|twitter|vxtwitter)\.com\/\S+/i.test(message.content);

    const isPost = hasMedia || hasTwitterLink;

    if (!isPost) return;

    const channel = guild.channels.cache.get(message.channel.id);

    if (!channel || !channel.isTextBased()) {
      console.error("El canal del mensaje no es un canal de texto válido.");
      return;
    }

    const msgService = new MessageService(channel);

    const agentExists = await necoService.checkAgentExists(author.id);

    let agent;

    if (!agentExists) {
      await necoService.createAgent(author.id);
    }

    agent = await necoService.getAgent(author.id);

    if (!agent) {
      console.error("No se pudo recuperar el agente del autor de la db.");
      return;
    }

    const newBalance = agent.balance + chaosBuilder(MINIMUM_REWARD, MAXIMUM_REWARD);

    await necoService.manipulateAgentBalance(author.id, newBalance);

    const msg = randomMessageBuilder(MESSAGE_CASE, author);

    if (!msg) {
      console.error("No se pudo construir un mensaje aleatorio para el altar.");
      return;
    }

    await msgService.send(msg);

    await reactionBuilder(message);
  }
}
