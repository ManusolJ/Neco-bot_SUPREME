import { readdir } from "fs/promises";
import { pathToFileURL } from "url";
import type { Client } from "discord.js";
import path from "path";

async function loadAllEvents(client: Client): Promise<void> {
  const eventsPath = path.resolve(__dirname, "../events");

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".event.ts") || entry.name.endsWith(".event.js"))) {
        try {
          const module = await import(pathToFileURL(fullPath).href);
          const handler = module.default ?? module.register;

          if (typeof handler === "function") {
            handler(client);
            console.log(`[EVENT LOADER] Cargado: ${entry.name}`);
          } else {
            console.warn(`[EVENT LOADER] Módulo sin función válida: ${entry.name}`);
          }
        } catch (err) {
          console.error(`[EVENT LOADER] Error al cargar ${entry.name}:`, err);
        }
      }
    }
  }

  await walk(eventsPath);
}

export default loadAllEvents;
