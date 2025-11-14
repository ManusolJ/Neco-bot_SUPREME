/**
 * @file Handles the altar event, rewarding users for posting media in a specific channel.
 */

import { env } from "process";
import { Client, Events, Message, OmitPartialGroupDMChannel } from "discord.js";

import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import MessageService from "@services/message.service";
import reactionBuilder from "@utils/build-reaction.util";
import randomMessageBuilder from "@utils/build-random-message.util";

// The ID of the channel designated as the altar for media posts
const NECO_ALTAR_CHANNEL_ID = env.NECO_ALTAR_CHANNEL;

// Bounds for the random points awarded per qualifying post
const MINIMUM_REWARD = 1;
const MAXIMUM_REWARD = 5;

// Key passed to the random message generator to select the appropriate pool
const MESSAGE_CASE = "altar";

/**
 * Attaches the message‐create listener to the given Discord client.
 *
 * @param client - The Discord.js client instance.
 */
export default function altarEvent(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    await eventHandler(message);
  });
}

/**
 * Processes a new message in the altar channel. If the message contains
 * media (attachments or embeds) or a Twitter/X link, the author is rewarded
 *
 * @param message - The incoming Discord message to evaluate.
 * @returns A promise that resolves when processing completes.
 */
async function eventHandler(message: OmitPartialGroupDMChannel<Message<boolean>>): Promise<void> {
  // Only handle messages in the configured altar channel
  if (message.channelId !== NECO_ALTAR_CHANNEL_ID) {
    return;
  }

  try {
    const necoService = await NecoService.getInstance();
    const author = message.author;
    const guild = message.guild;

    // Validate that message has a guild context and a non‐bot author
    if (!guild || !author) {
      const err = "Invalid message source: missing guild or author";
      throw new Error(err);
    }

    if (author.bot) {
      return;
    }

    // Determine qualification: media (embeds/attachments) or Twitter/X link
    const hasMedia = message.embeds.length > 0 || message.attachments.size > 0;
    const hasTwitterLink = /https?:\/\/(x|twitter|vxtwitter)\.com\/\S+/i.test(message.content);
    if (!(hasMedia || hasTwitterLink)) {
      return;
    }

    // Ensure the channel is text‐based before replying
    const channel = guild.channels.cache.get(message.channel.id);
    if (!channel || !channel.isTextBased()) {
      const err = "Invalid channel type: must be text‐based";
      throw new Error(err);
    }
    const messageService = new MessageService(channel);

    // Award random points and update the agent’s balance
    const reward = chaosBuilder(MINIMUM_REWARD, MAXIMUM_REWARD);
    await necoService.increaseAgentBalance(author.id, reward);

    // Generate and send a contextual reply, then react to the original message
    const reply = randomMessageBuilder(MESSAGE_CASE, author);
    if (!reply) {
      const err = "Failed to generate random message for altar event";
      throw new Error(err);
    }
    await messageService.send(reply);
    await reactionBuilder(message);
  } catch (error) {
    console.error("Error processing altar event:", error);
  }
}
