/**
 * Script to register global and guild‑specific Discord slash commands by
 * dynamically discovering command modules and pushing them via the Discord REST API.
 */

import { REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import { readdir } from "fs/promises";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import { env } from "process";

const CLIENT_ID = env.CLIENT_ID;

// Validate essential environment variables
if (!CLIENT_ID) {
  console.error("Missing CLIENT_ID environment variable");
  process.exit(1);
}

/**
 * Wraps a message in ANSI green color codes.
 *
 * @param msg - The message to colorize.
 * @returns The green‑colored ANSI string.
 */
const green = (msg: string): string => `\x1b[32m${msg}\x1b[0m`;

/**
 * Wraps a message in ANSI red color codes.
 *
 * @param msg - The message to colorize.
 * @returns The red‑colored ANSI string.
 */
const red = (msg: string): string => `\x1b[31m${msg}\x1b[0m`;

/**
 * Wraps a message in ANSI yellow color codes.
 *
 * @param msg - The message to colorize.
 * @returns The yellow‑colored ANSI string.
 */
const yellow = (msg: string): string => `\x1b[33m${msg}\x1b[0m`;

// Resolve current module path for cross‑platform compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Collection to accumulate serialized command definitions
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const commandsPath = path.resolve(__dirname, "./commands");

/**
 * Discover and load all command files under the given directory.
 * Each file ending in ".ts" is imported dynamically, supporting both default
 * and named exports, and validated for the presence of `data` and `execute`.
 */
const commandFiles = await getAllCommandFiles(commandsPath);

for (const file of commandFiles) {
  try {
    const commandModule = await import(pathToFileURL(file).href);
    const command = commandModule.default ?? commandModule;

    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
      console.log(green(`[COMMAND] Loaded: ${path.relative(commandsPath, file)}`));
    } else {
      console.warn(
        yellow(`[WARNING] The command at ${path.relative(commandsPath, file)} is missing "data" or "execute"`)
      );
    }
  } catch (err) {
    console.error(red(`[ERROR] Failed to load command at ${file}:`), err);
  }
}

// Initialize Discord REST API client
const rest = new REST().setToken(env.BOT_TOKEN);

// Fetch all environment variables that begin with "GUILD_"
const guildEnv = getEnvByPrefix("GUILD_");

try {
  console.log(yellow("Started refreshing application (/) commands for all guilds…"));

  // Iterate through each GUILD_ variable to register the commands
  for (const [envKey, guildId] of Object.entries(guildEnv)) {
    try {
      console.log(yellow(`Registering commands in guild ${envKey} (${guildId})…`));
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: commands });
      console.log(green(`✓ Success for ${guildId}`));
    } catch (err) {
      console.error(red(`✗ Failed for ${guildId}:`), err);
    }
  }

  console.log(green("Successfully reloaded application (/) commands for all guilds."));
  process.exit(0);
} catch (error) {
  console.error(red("Failed to register commands:"), error);
  process.exit(1);
}

/**
 * Filters environment variables by a given prefix.
 *
 * @param prefix - The prefix to match (e.g., "GUILD_").
 * @returns A record of matching key/value pairs.
 */
function getEnvByPrefix(prefix: string): Record<string, string> {
  return Object.entries(process.env)
    .filter(([key]) => key.startsWith(prefix))
    .reduce<Record<string, string>>((acc, [key, val]) => {
      if (val !== undefined) acc[key] = val;
      return acc;
    }, {});
}

/**
 * Recursively finds all TypeScript files in a directory.
 *
 * @param dir - The root directory to search.
 * @returns A promise resolving to an array of absolute file paths.
 */
async function getAllCommandFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return getAllCommandFiles(fullPath);
      }
      if (entry.name.endsWith(".ts")) {
        return [fullPath];
      }
      return [];
    })
  );

  return files.flat();
}
