import { readdir } from "fs/promises";
import { pathToFileURL, fileURLToPath } from "url";
import path from "path";
import type { Client } from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventsPath = path.resolve(__dirname, "./events");

async function loadAllEvents(client: Client): Promise<void> {
  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".event.js")) {
        try {
          const module = await import(pathToFileURL(fullPath).href);
          const handler = module.default ?? module.register;

          if (typeof handler === "function") {
            handler(client);
            console.log(`[EVENT LOADER] Loaded: ${entry.name}`);
          } else {
            console.warn(`[EVENT LOADER] No valid function in module: ${entry.name}`);
          }
        } catch (err) {
          console.error(`[EVENT LOADER] Error loading ${entry.name}:`, err);
        }
      }
    }
  }

  await walk(eventsPath);
}

export default loadAllEvents;
