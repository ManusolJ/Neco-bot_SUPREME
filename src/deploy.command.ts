import { REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import { readdir } from "fs/promises";
import path from "path";

const green = (msg: string) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg: string) => `\x1b[31m${msg}\x1b[0m`;
const yellow = (msg: string) => `\x1b[33m${msg}\x1b[0m`;

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
    const commandModule = await import(file);
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

const rest = new REST().setToken(process.env.BOT_TOKEN);

try {
  console.log(yellow("Started refreshing application (/) commands..."));

  await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
    body: commands,
  });

  console.log(green("Successfully reloaded application (/) commands."));
  process.exit(0);
} catch (error) {
  console.error(red("Failed to register commands:"), error);
  process.exit(1);
}
