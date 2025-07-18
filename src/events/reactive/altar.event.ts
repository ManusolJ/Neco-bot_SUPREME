import { Client, Events, Message, OmitPartialGroupDMChannel } from "discord.js";
import { env } from "process";

import MessageService from "@services/message.service";
import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import randomMessageBuilder from "@utils/build-random-message.util";
import reactionBuilder from "@utils/build-reaction.util";

// Configuration constants
const NECO_ALTAR_CHANNEL_ID = env.NECO_ALTAR_CHANNEL;
const MINIMUM_REWARD = 1;
const MAXIMUM_REWARD = 5;
const MESSAGE_CASE = "altar";

/**
 * Event handler for "altar" channel
 * Rewards users for posting media content
 *
 * @param client Discord.js Client instance
 */
export default function altarEvent(client: Client): void {
  client.on(Events.MessageCreate, async (message) => handleAltarEvent(message));
}

/**
 * Processes messages in altar channel
 * Rewards users for media posts with random points
 */
async function handleAltarEvent(message: OmitPartialGroupDMChannel<Message<boolean>>) {
  // Only process messages in designated channel
  if (message && message.channelId !== NECO_ALTAR_CHANNEL_ID) return;

  const necoService = await NecoService.getInstance();
  const author = message.author;
  const guild = message.guild;

  // Validate message source
  if (!guild || !author) {
    console.error("Invalid message source");
    return;
  }

  // Ignore bot messages
  if (author.bot) return;

  // Check for valid content (embeds, attachments, or Twitter links)
  const hasMedia = message.embeds.length > 0 || message.attachments.size > 0;
  const hasTwitterLink = /https?:\/\/(x|twitter|vxtwitter)\.com\/\S+/i.test(message.content);
  const isPost = hasMedia || hasTwitterLink;

  if (!isPost) return;

  // Validate text channel
  const channel = guild.channels.cache.get(message.channel.id);
  if (!channel || !channel.isTextBased()) {
    console.error("Invalid channel type");
    return;
  }

  const msgService = new MessageService(channel);

  // Ensure user exists in database
  const agentExists = await necoService.checkAgentExists(author.id);
  if (!agentExists) {
    await necoService.createAgent(author.id);
  }

  const agent = await necoService.getAgent(author.id);
  if (!agent) {
    console.error("Agent retrieval failed");
    return;
  }

  // Calculate and apply reward
  const reward = chaosBuilder(MINIMUM_REWARD, MAXIMUM_REWARD);
  const newBalance = agent.balance + reward;
  await necoService.manipulateAgentBalance(author.id, newBalance);

  // Generate and send response
  const msg = randomMessageBuilder(MESSAGE_CASE, author);
  if (!msg) {
    console.error("Message generation failed");
    return;
  }

  await msgService.send(msg);
  await reactionBuilder(message);
}
