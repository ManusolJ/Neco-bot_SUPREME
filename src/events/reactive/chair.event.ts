import { Client, Events, VoiceState } from "discord.js";
import { env } from "process";

import NecoService from "@services/neco.service";
import MessageService from "@services/message.service";

// Environment variable values for guild and channels
const GUILD_ID = env.GUILD_ID;
const FUNNY_ROLE_ID = env.FUNNY_ROLE;
const MAIN_VOICE_CHANNEL_ID = env.MAIN_VOICE_CHANNEL;
const FUNNY_CHAIR_CHANNEL_ID = env.FUNNY_CHAIR_CHANNEL;
const NECO_MESSAGES_CHANNEL_ID = env.NECO_MESSAGES_CHANNEL;

// Punishment configuration constants
const PUNISHED = true; // Value to set the punished state
const PUNISHMENT_TIME = 1000 * 60 * 60; // Duration (ms) to apply punishment (1 hour)

/**
 * Initializes the chair event listener on the Discord client.
 *
 * Sets up a handler for voice state updates to manage entering and leaving the "funny chair" channel.
 *
 * @param client - The Discord.js client instance.
 */
export default function chairEvent(client: Client): void {
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    await eventHandler(client, oldState, newState);
  });
}

/**
 * Processes voice state changes for the "funny chair" feature:
 * 1. Verifies required environment variables and resolves guild and channels.
 * 2. Detects users joining or leaving the chair channel.
 * 3. Sends notification messages to the designated text channel.
 * 4. Applies a punishment role when a user leaves the chair and updates the database.
 * 5. Schedules removal of the punishment role after a fixed timeout and updates the database.
 *
 * @param client - The Discord.js client instance.
 * @param oldState - The user's previous voice state.
 * @param newState - The user's current voice state.
 */
async function eventHandler(client: Client, oldState: VoiceState, newState: VoiceState): Promise<void> {
  try {
    // Validate presence of all required environment variables
    if (!GUILD_ID || !NECO_MESSAGES_CHANNEL_ID || !MAIN_VOICE_CHANNEL_ID || !FUNNY_CHAIR_CHANNEL_ID || !FUNNY_ROLE_ID) {
      throw new Error("Missing required environment variables for chair event");
    }

    const necoService = await NecoService.getInstance();

    // Resolve the guild context
    const guild = oldState.guild ?? newState.guild ?? client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      throw new Error("Failed to resolve guild from voice state");
    }

    // Retrieve the main voice channel, chair voice channel, and message channel
    const mainChannel = guild.channels.cache.get(MAIN_VOICE_CHANNEL_ID);
    const chairChannel = guild.channels.cache.get(FUNNY_CHAIR_CHANNEL_ID);
    const messageChannel = guild.channels.cache.get(NECO_MESSAGES_CHANNEL_ID);

    if (!mainChannel || !chairChannel || !messageChannel) {
      console.log(mainChannel, chairChannel, messageChannel);
      throw new Error("Failed to resolve one or more required channels");
    }

    // Confirm appropriate channel types
    if (!mainChannel.isVoiceBased()) {
      throw new Error("Main channel is not voice-based");
    }
    if (!chairChannel.isVoiceBased()) {
      throw new Error("Chair channel is not voice-based");
    }
    if (!messageChannel.isTextBased()) {
      throw new Error("Message channel is not text-based");
    }

    const messageService = new MessageService(messageChannel);

    // Resolve the punishment role from guild
    const funnyRole = guild.roles.cache.get(FUNNY_ROLE_ID);
    if (!funnyRole) {
      throw new Error("Punishment role not found in guild");
    }

    // Determine whether the user joined or left the chair channel
    const joinedChair = newState.channelId === FUNNY_CHAIR_CHANNEL_ID;
    const leftChair = oldState.channelId === FUNNY_CHAIR_CHANNEL_ID;

    // Identify the target guild member
    const target = newState.member ?? oldState.member;
    if (!target) {
      throw new Error("Failed to resolve target member from voice state");
    }

    // Ensure the agent exists in the database
    const exists = await necoService.checkAgentExists(target.id);
    if (!exists) {
      await necoService.createAgent(target.id);
    }
    const agent = await necoService.getAgent(target.id);
    if (!agent) {
      throw new Error(`Agent not found for user ${target.id}`);
    }

    // Handle user sitting in the chair (notification only)
    if (joinedChair && !target.roles.cache.has(funnyRole.id)) {
      const joinMsg = `Ohoo~ Parece que ${target.displayName} se ha sentado en la silla cuck! Nyanyanyaaa~~`;
      await messageService.send(joinMsg);
    }

    // Handle user leaving the chair (apply punishment)
    if (leftChair && !target.roles.cache.has(funnyRole.id) && !agent.punished) {
      await target.roles.add(funnyRole);
      await necoService.manipulateAgentPunishmentState(target.id, PUNISHED);
      const leaveMsg = `Oh no~~ ${target.displayName} ha abandonado la silla cuck... ¡qué decepción!`;
      await messageService.send(leaveMsg);
    }

    // Schedule removal of punishment role after timeout
    setTimeout(async () => {
      const refreshed = guild.members.cache.get(target.id);
      if (refreshed && refreshed.roles.cache.has(funnyRole.id)) {
        await refreshed.roles.remove(funnyRole.id);
        await necoService.manipulateAgentPunishmentState(target.id, !PUNISHED);
        const releaseMsg = `${refreshed.displayName} ha sido liberado de la marca del cuck! Oops... Lo he dicho en voz alta? (¬‿¬) Nyehehe~~`;
        await messageService.send(releaseMsg);
      }
    }, PUNISHMENT_TIME);
  } catch (error) {
    console.error("Error processing chair event: ", error);
  }
}
