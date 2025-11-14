/**
 * @file
 * Discovers and registers Discord slash commands—both global and per‑guild—
 * by dynamically importing each command module and pushing them via the REST API.
 */

import path from "path";
import { env } from "process";
import { readdir } from "fs/promises";
import { fileURLToPath, pathToFileURL } from "url";
import { REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

const CLIENT_ID = env.CLIENT_ID;
const BOT_TOKEN = env.BOT_TOKEN;

/**
 * The application client ID
 *
 * @constant {string}
 * @throws Will exit with code 1 if undefined.
 */
if (!CLIENT_ID) {
  console.error("Missing CLIENT_ID environment variable");
  process.exit(1);
}

/**
 * The bot’s authentication token, loaded from the BOT_TOKEN environment variable.
 *
 * @constant {string}
 * @throws Will exit the process if BOT_TOKEN is undefined.
 */
if (!BOT_TOKEN) {
  console.error("Missing BOT_TOKEN environment variable");
  process.exit(1);
}

/**
 * ANSI‑color formatter for console success, error and info messages.
 *
 * @param msg - The message to colorize.
 * @returns A colored string.
 */
const green = (msg: string): string => `\x1b[32m${msg}\x1b[0m`;
const red = (msg: string): string => `\x1b[31m${msg}\x1b[0m`;
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
        yellow(
          `[WARNING] The command at ${path.relative(
            commandsPath,
            file,
          )} is missing "data" or "execute"`,
        ),
      );
    }
  } catch (err) {
    console.error(red(`[ERROR] Failed to load command at ${file}:`), err);
  }
}

/**
 * Authenticated Discord.js REST client.
 *
 * @constant {REST}
 */
const rest = new REST().setToken(BOT_TOKEN);

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
 * Filters environment variables by prefix.
 *
 * @param prefix - Prefix to match (e.g., "GUILD_").
 * @returns A mapping of variable names to their values.
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
 * Recursively retrieves all `.ts` files from a directory.
 *
 * @param dir - Root directory to scan.
 * @returns Promise resolving to an array of absolute file paths.
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
    }),
  );

  return files.flat();
}
