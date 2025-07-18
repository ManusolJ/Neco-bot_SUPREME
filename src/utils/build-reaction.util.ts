import { Message } from "discord.js";

/**
 * Adds a random custom emoji reaction to a guild message
 *
 * @param message Discord message to react to
 */
export default async function reactionBuilder(message: Message): Promise<void> {
  // Only process guild messages
  if (!message.guild) {
    console.error("Command not run in a guild.");
    return;
  }

  const guild = message.guild;

  // Get all custom emojis available in the guild
  const emojis = guild.emojis.cache.map((emoji) => emoji.toString());

  if (emojis.length === 0) {
    console.error("No custom emojis found in the guild.");
    return;
  }

  // Select random emoji from available options
  const randomIndex = Math.floor(Math.random() * emojis.length);

  // Add reaction to the message
  await message.react(emojis[randomIndex]);
}
