import type { Client } from "discord.js";
import cron from "node-cron";

import NecoService from "@services/neco.service";

let cronScheduled = false;

export default function dailyBeg(client: Client) {
  client.on("ready", () => {
    if (cronScheduled) return;
    cron.schedule(
      "0 12 * * *",
      async () => {
        cronScheduled = true;
        const necoService = await NecoService.getInstance();
        try {
          const isBegStateReset = await necoService.resetBegState();
          if (isBegStateReset) {
            console.log("The reset was done at: ", Date.now());
          } else {
            console.error("The reset was done incorrectly.");
          }
        } catch (e) {
          console.error("NYAHAAA! Ha habido un error al resetear el tiempo! Este es el skill issue:", e);
        }
      },
      {
        timezone: "Europe/Madrid",
      }
    );
  });
}
