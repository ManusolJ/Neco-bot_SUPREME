import { Client, Events } from "discord.js";

import MessageService from "@services/message.service";
import NecoService from "@services/neco.service";
import chaosBuilder from "@utils/build-chaos.util";
import reactionBuilder from "@utils/build-reaction.util";
import randomMessageBuilder from "@utils/build-random-message.util";

/**
 * Event handler for copypasta channel
 * Rewards users for posting content with specific prefix
 *
 * @param client Discord.js Client instance
 */
export default function pastaEvent(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    // Only process messages in designated channel
    if (message && message.channelId !== process.env.COPYPASTA_CHANNEL) return;

    const necoService = await NecoService.getInstance();
    const author = message.author;
    const guild = message.guild;

    // Ignore bots and DMs
    if (author.bot || !guild) return;

    // Validate message format
    const isPasta = message.content.startsWith("Pasta:");
    if (!isPasta) return;

    // Validate text channel
    const channel = guild.channels.cache.get(message.channel.id);
    if (!channel?.isTextBased()) return;

    const msgService = new MessageService(channel);

    // Reward user with random points
    await necoService.manipulateAgentBalance(author.id, chaosBuilder(1, 5));

    // Generate random response
    const msg = randomMessageBuilder("copypasta", author);
    if (!msg) return;

    // Send response and add reaction
    await msgService.send(msg);
    await reactionBuilder(message);
  });
}
