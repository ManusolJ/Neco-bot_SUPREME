import { Client } from "discord.js";
import { readdir } from "fs/promises";
import { pathToFileURL, fileURLToPath } from "url";
import path from "path";
import EventModule from "@interfaces/event-module.interface";

// Resolve current file and directory for import paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the events directory relative to this utility
const eventsPath = path.resolve(__dirname, "../events");

/**
 * Recursively discovers and loads all event handler modules.
 *
 * @param client - The Discord.js Client instance on which to register handlers.
 * @returns A promise that resolves once all event files have been processed.
 */
async function loadAllEvents(client: Client): Promise<void> {
  /**
   * Traverses a directory tree to find files ending with `.event.ts` or `.event.js`.
   *
   * @param dir - The directory to scan.
   */
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".event.ts") || entry.name.endsWith(".event.js"))) {
        try {
          const fileUrl = pathToFileURL(fullPath).href;
          const module: EventModule = await import(fileUrl);
          const handler = module.default ?? module.register;

          if (typeof handler === "function") {
            handler(client);
            console.log(`[EVENT LOADER] Loaded: ${fullPath}`);
          } else {
            console.warn(`[EVENT LOADER] No valid export in: ${fullPath}`);
          }
        } catch (err) {
          console.error(`[EVENT LOADER] Error loading ${fullPath}:`, err);
        }
      }
    }
  }

  try {
    await walk(eventsPath);
    console.log("[EVENT LOADER] All events loaded.");
  } catch (err) {
    console.error("[EVENT LOADER] Failed to load events:", err);
  }
}

export default loadAllEvents;
