import { REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import { readdir } from "fs/promises";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import { env } from "process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const green = (msg: string) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg: string) => `\x1b[31m${msg}\x1b[0m`;
const yellow = (msg: string) => `\x1b[33m${msg}\x1b[0m`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({ input, output });

async function getGuildId(): Promise<string> {
  console.log(yellow("\nSetting Guild ID for commands registration..."));
  return rl.question("Please enter GUILD_ID: ");
}

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const commandsPath = path.resolve(__dirname, "./commands");

async function getAllCommandFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return getAllCommandFiles(fullPath);
      if (entry.name.endsWith(".ts")) return [fullPath];
      return [];
    })
  );
  return files.flat();
}

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

const rest = new REST();
rest.setToken(env.BOT_TOKEN);

try {
  console.log(yellow("Started refreshing application (/) commands..."));

  const guildId = await getGuildId();

  await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID!, guildId), { body: commands });

  console.log(green("Successfully reloaded application (/) commands."));
  process.exit(0);
} catch (error) {
  console.error(red("Failed to register commands:"), error);
  process.exit(1);
} finally {
  rl.close();
}
