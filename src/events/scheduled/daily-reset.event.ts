import type { Client } from "discord.js";
import cron from "node-cron";

import NecoService from "@services/neco.service";

export default function dailyBeg(client: Client): void {
  client.once("ready", () => {
    cron.schedule("0 12 * * *", async () => scheduledTask(), {
      timezone: "Europe/Madrid",
    });
  });
}

async function scheduledTask(): Promise<void> {
  const necoService = await NecoService.getInstance();

  const isResetDone = await necoService.resetBegState();

  if (isResetDone) {
    console.log("Reseteo diario completado: ", Date.now());
  } else {
    console.error("Hubo un error durante el reseteo diario.");
  }
}
