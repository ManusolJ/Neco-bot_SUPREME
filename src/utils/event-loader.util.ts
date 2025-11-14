/**
 * @file
 * Recursively discovers and registers all Discord.js event handlers
 * under the `/events` directory by dynamically importing `.event.ts` and `.event.js` modules.
 */
import { Client } from "discord.js";
import { readdir } from "fs/promises";
import { pathToFileURL, fileURLToPath } from "url";
import path from "path";
import EventModule from "@interfaces/rest/file-config/event-module.interface";

/** @private Absolute path of this source file. */
const __filename = fileURLToPath(import.meta.url);
/** @private Directory name of this module. */
const __dirname = path.dirname(__filename);
/** @private Absolute path to the events directory. */
const eventsPath = path.resolve(__dirname, "../events");

/**
 * Discovers and loads all event handler modules.
 *
 * @param client - The Discord.js Client instance on which to register handlers.
 * @returns A promise that resolves once all event files have been processed.
 * @remarks
 * - Searches recursively for files ending in `.event.ts` or `.event.js`.
 * - Logs successes and warnings, but does not throw on individual import errors.
 */
async function loadAllEvents(client: Client): Promise<void> {
  /**
   * @private
   * Traverses a directory tree to find and import event modules.
   *
   * @param dir - Directory path to scan.
   * @returns Promise that resolves when this directory (and subdirectories) have been walked.
   */
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".event.ts") || entry.name.endsWith(".event.js"))
      ) {
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

/**
 * Default export: registers all event handlers on the provided Discord client.
 *
 * @param client - Discord.js Client instance.
 */
export default loadAllEvents;
