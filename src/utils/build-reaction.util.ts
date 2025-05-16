import { Message } from "discord.js";

export default async function reactionBuilder(message: Message): Promise<void> {
  if (!message.guild) {
    console.log("Command not run in a guild.");
    return;
  }

  const guild = message.guild;

  const emojis = guild.emojis.cache.map((emoji) => emoji.toString());

  if (emojis.length === 0) {
    console.log("No custom emojis found in the guild.");
    return;
  }

  const randomIndex = Math.floor(Math.random() * emojis.length);

  await message.react(emojis[randomIndex]);
}
