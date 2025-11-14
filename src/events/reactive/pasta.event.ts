import { Client, Events, Message, OmitPartialGroupDMChannel } from "discord.js";

import MessageService from "@services/message.service";
import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import reactionBuilder from "@utils/build-reaction.util";
import randomMessageBuilder from "@utils/build-random-message.util";

// Bounds for the random points awarded per qualifying post
const MINIMUN_REWARD = 1;
const MAXIMUM_REWARD = 5;

// Prefix that identifies a copypasta message
const PREFIX = "Pasta:";

// Key passed to the random message generator to select the appropriate pool
const MESSAGE_CASE = "copypasta";

/**
 * Event handler for copypasta channel
 * Rewards users for posting content with specific prefix
 *
 * @param client Discord.js Client instance
 */
export default function pastaEvent(client: Client): void {
  client.on(Events.MessageCreate, async (message) => eventHandler(message));
}

async function eventHandler(message: OmitPartialGroupDMChannel<Message<boolean>>): Promise<void> {
  // Only process messages in designated channel
  if (message && message.channelId !== process.env.COPYPASTA_CHANNEL) return;

  const necoService = await NecoService.getInstance();
  const author = message.author;
  const guild = message.guild;

  // Ignore bots and DMs
  if (author.bot || !guild) return;

  // Validate message format
  const isPasta = message.content.startsWith(PREFIX);
  if (!isPasta) return;

  // Validate text channel
  const channel = guild.channels.cache.get(message.channel.id);
  const isChannelValid = channel && channel.isTextBased();
  if (!isChannelValid) return;

  const msgService = new MessageService(channel);

  const reward = chaosBuilder(MINIMUN_REWARD, MAXIMUM_REWARD);

  // Reward user with random points
  await necoService.increaseAgentBalance(author.id, reward);

  // Generate random response
  const msg = randomMessageBuilder(MESSAGE_CASE, author);
  if (!msg) return;

  // Send response and add reaction
  await msgService.send(msg);
  await reactionBuilder(message);
}
