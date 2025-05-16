import { Client, Events } from "discord.js";

import { execute as ask } from "@commands/basic/ask.command";
import { execute as beg } from "@commands/basic/beg.command";

export default function interactionListener(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
      case "ask":
        await ask(interaction);
        break;
      case "beg":
        await beg(interaction);
        break;
    }
  });
}
