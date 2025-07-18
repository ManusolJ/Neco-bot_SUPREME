import { Client } from "discord.js";
import { readdir } from "fs/promises";
import { pathToFileURL, fileURLToPath } from "url";

import path from "path";
import EventModule from "@interfaces/event-module.interface";

// Resolve current module path for cross-platform compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define path to events directory relative to current module
const eventsPath = path.resolve(__dirname, "../events");

/**
 * Dynamically loads all Discord event handlers from the filesystem.
 * Recursively searches through events directory for .event.ts/.event.js files.
 *
 * @param client Discord.js Client instance for event registration
 */
async function loadAllEvents(client: Client): Promise<void> {
  /**
   * Recursive directory walker to discover event handler files
   *
   * @param dir Current directory to process
   */
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectories
        await walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".event.ts") || entry.name.endsWith(".event.js"))) {
        try {
          // Convert path to file URL for ES module compatibility
          const fileUrl = pathToFileURL(fullPath).href;
          const module: EventModule = await import(fileUrl);

          // Support both default export and named 'register' export
          const handler = module.default ?? module.register;

          if (typeof handler === "function") {
            // Initialize event handler with Discord client
            handler(client);
            console.log(`[EVENT LOADER] Loaded: ${fullPath}`);
          } else {
            console.warn(`[EVENT LOADER] No valid function exported in: ${fullPath}`);
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
