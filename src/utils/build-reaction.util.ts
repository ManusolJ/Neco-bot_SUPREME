import { Message } from "discord.js";

/**
 * Adds a random custom emoji reaction to a guild message
 *
 * @param message Discord message to react to
 *
 * @throws Error if command is not run in a guild or no custom emojis are available
 *
 * @returns {Promise<void>} Resolves when reaction is added
 */
export default async function reactionBuilder(message: Message): Promise<void> {
  // Only process guild messages
  if (!message.guild) {
    throw new Error("Command not run in a guild.");
  }

  const guild = message.guild;

  // Get all custom emojis available in the guild
  const emojis = guild.emojis.cache.map((emoji) => emoji.toString());

  if (emojis.length === 0) {
    throw new Error("No custom emojis available in this guild.");
  }

  // Select random emoji from available options
  const randomIndex = Math.floor(Math.random() * emojis.length);

  // Add reaction to the message
  await message.react(emojis[randomIndex]);
}
