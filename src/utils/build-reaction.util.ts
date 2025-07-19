import { Message } from "discord.js";

/**
 * Adds a random custom emoji reaction to a guild message.
 *
 * @remarks
 * This function will throw if invoked outside of a guild context or if
 * the guild has no custom emojis defined.
 *
 * @param message - The Discord message to react to.
 * @throws {Error} If the message is not from a guild.
 * @throws {Error} If the guild contains no custom emojis.
 * @returns A promise that resolves once the reaction has been added.
 */
export default async function reactionBuilder(message: Message): Promise<void> {
  if (!message.guild) {
    throw new Error("Command not run in a guild.");
  }

  const guild = message.guild;
  const emojis = guild.emojis.cache.map((emoji) => emoji.toString());

  if (emojis.length === 0) {
    throw new Error("No custom emojis available in this guild.");
  }

  const randomIndex = Math.floor(Math.random() * emojis.length);
  await message.react(emojis[randomIndex]);
}
