import type { Client } from "discord.js";
import cron from "node-cron";

import NecoService from "@services/neco.service";

/**
 * Scheduled daily reset for begging cooldowns
 * Runs at 12:00 PM daily (Madrid time)
 *
 * @param client Discord client instance
 *
 * @returns {void}
 */
export default function dailyBeg(client: Client): void {
  // Schedule daily at 12:00 PM Madrid time
  client.once("ready", () => {
    cron.schedule("0 12 * * *", async () => scheduledTask(), {
      timezone: "Europe/Madrid",
    });
  });
}

/**
 * Executes the daily reset task
 * Resets all agents' begged state
 *
 * @param client Discord client instance
 *
 * @returns {Promise<void>}
 */
async function scheduledTask(): Promise<void> {
  const necoService = await NecoService.getInstance();

  // Reset all begged states in database
  const isResetDone = await necoService.resetBegState();

  if (isResetDone) {
    console.log("Reseteo diario completado: ", Date.now());
  } else {
    console.error("Hubo un error durante el reseteo diario.");
  }
}
