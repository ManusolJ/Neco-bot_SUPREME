import { Client, Events } from "discord.js";

import { execute as ask } from "@commands/basic/ask.command";
import { execute as beg } from "@commands/basic/beg.command";
import { execute as info } from "@commands/basic/chaos-info.command";
import { execute as control } from "@commands/basic/chaos-control.command";
import { execute as inspection } from "@commands/basic/chaos-inspection.command";
import { execute as slap } from "@commands/basic/slap.command";
import { execute as cheer } from "@commands/basic/cheer.command";
import { execute as speak } from "@commands/basic/speak.command";
import { execute as timer } from "@commands/basic/timer.command";

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
      case "chaos-info":
        await info(interaction);
        break;
      case "chaos-control":
        await control(interaction);
        break;
      case "chaos-inspection":
        await inspection(interaction);
        break;
      case "speak":
        await speak(interaction);
        break;
      case "slap":
        await slap(interaction);
        break;
      case "cheer":
        await cheer(interaction);
        break;
      case "timer":
        await timer(interaction);
        break;
    }
  });
}
