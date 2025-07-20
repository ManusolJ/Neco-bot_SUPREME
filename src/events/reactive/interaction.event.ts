import { Client, Events } from "discord.js";

// Command handlers
import { execute as ask } from "@commands/basic/ask.command";
import { execute as beg } from "@commands/basic/beg.command";
import { execute as info } from "@commands/basic/chaos-info.command";
import { execute as control } from "@commands/basic/chaos-control.command";
import { execute as inspection } from "@commands/basic/chaos-inspection.command";
import { execute as slap } from "@commands/basic/slap.command";
import { execute as cheer } from "@commands/basic/cheer.command";
import { execute as speak } from "@commands/basic/speak.command";
import { execute as timer } from "@commands/basic/timer.command";
import { execute as zaza } from "@commands/basic/zaza.command";
import { execute as monster } from "@commands/advanced/monster.command";
import { execute as trade } from "@commands/advanced/trade.command";

/**
 * Central interaction router for slash commands
 * Maps command names to their execution handlers
 *
 * @param client Discord.js Client instance
 */
export default function interactionListener(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    // Only handle slash commands
    if (!interaction.isChatInputCommand()) return;

    // Route to appropriate command handler
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
      case "zaza":
        await zaza(interaction);
        break;
      case "monster-time":
        await monster(interaction);
        break;
      case "trade":
        await trade(interaction);
        break;
    }
  });
}
