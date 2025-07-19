import { REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import { readdir } from "fs/promises";
import { fileURLToPath, pathToFileURL } from "url";
import { env } from "process";

import path from "path";

const CLIENT_ID = env.CLIENT_ID;

// Validate essential environment variables
if (!CLIENT_ID) {
  console.error("Missing CLIENT_ID environment variable");
  process.exit(1);
}

// ANSI color codes for console output
const green = (msg: string) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg: string) => `\x1b[31m${msg}\x1b[0m`;
const yellow = (msg: string) => `\x1b[33m${msg}\x1b[0m`;

// Resolve current module path for cross-platform compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command collection and path configuration
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const commandsPath = path.resolve(__dirname, "./commands");

// Recursively discover all command files
const commandFiles = await getAllCommandFiles(commandsPath);

// Process each command file
for (const file of commandFiles) {
  try {
    // Dynamic ES module import
    const commandModule = await import(pathToFileURL(file).href);
    // Support both default and named exports
    const command = commandModule.default ?? commandModule;

    // Validate command structure
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
const rest = new REST();
rest.setToken(env.BOT_TOKEN);

// Get all environment variables prefixed with "GUILD_"
const guildEnv = getEnvByPrefix("GUILD_");

try {
  console.log(yellow("Started refreshing application (/) commands for all guilds…"));

  // Register commands in each guild specified in environment
  for (const [envKey, guildId] of Object.entries(guildEnv)) {
    try {
      console.log(yellow(`Registering commands in guild ${envKey} (${guildId})…`));
      // Update bot commands
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
 * Filters environment variables by prefix
 *
 * @param prefix Filter prefix (e.g., "GUILD_")
 * @returns Key-value pairs of matching environment variables
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
 * Recursively finds all TypeScript command files in a directory
 *
 * @param dir Starting directory path
 * @returns Array of absolute file paths
 */
async function getAllCommandFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  // Process directories and files concurrently
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Recurse into subdirectories
        return getAllCommandFiles(fullPath);
      }
      // Filter for TypeScript files
      if (entry.name.endsWith(".ts")) return [fullPath];
      return [];
    })
  );

  // Flatten nested arrays from recursion
  return files.flat();
}
