/**
 * @file Handles the chair event, managing user interactions with the "funny chair" voice channel.
 */

import { env } from "process";
import { Client, Events, VoiceState } from "discord.js";

import NecoService from "@services/neco.service";
import MessageService from "@services/message.service";
import Agent from "@interfaces/db/agent.interface";

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
 *
 * @param client - The Discord.js client instance.
 * @param oldState - The user's previous voice state.
 * @param newState - The user's current voice state.
 */
async function eventHandler(
  client: Client,
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  try {
    // Validate presence of all required environment variables
    if (
      !GUILD_ID ||
      !NECO_MESSAGES_CHANNEL_ID ||
      !MAIN_VOICE_CHANNEL_ID ||
      !FUNNY_CHAIR_CHANNEL_ID ||
      !FUNNY_ROLE_ID
    ) {
      const err = "Missing required environment variables for chair event";
      throw new Error(err);
    }

    const necoService = await NecoService.getInstance();

    // Resolve the guild context
    const guild = oldState.guild ?? newState.guild ?? client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      const err = "Failed to resolve guild from voice state.";
      throw new Error(err);
    }

    // Retrieve the main voice channel, chair voice channel, and message channel
    const mainChannel = guild.channels.cache.get(MAIN_VOICE_CHANNEL_ID);
    const chairChannel = guild.channels.cache.get(FUNNY_CHAIR_CHANNEL_ID);
    const messageChannel = guild.channels.cache.get(NECO_MESSAGES_CHANNEL_ID);

    if (!mainChannel || !chairChannel || !messageChannel) {
      const err = "Failed to resolve one or more required channels.";
      throw new Error(err);
    }

    const channelsAreValid =
      mainChannel.isVoiceBased() && chairChannel.isVoiceBased() && messageChannel.isTextBased();

    if (!channelsAreValid) {
      const err = "One or more channels have invalid types.";
      throw new Error(err);
    }

    const messageService = new MessageService(messageChannel);

    // Resolve the punishment role from guild
    const funnyRole = guild.roles.cache.get(FUNNY_ROLE_ID);
    if (!funnyRole) {
      const err = "Punishment role not found in guild";
      throw new Error(err);
    }

    // Determine whether the user joined or left the chair channel
    const joinedChair = newState.channelId === FUNNY_CHAIR_CHANNEL_ID;
    const leftChair = oldState.channelId === FUNNY_CHAIR_CHANNEL_ID;

    // Identify the target guild member
    const target = newState.member ?? oldState.member;
    if (!target) {
      const err = "Failed to resolve target member from voice state";
      throw new Error(err);
    }

    // Ensure the agent exists in the database
    let agent: Agent | null;
    if (await necoService.agentExists(target.id)) {
      agent = await necoService.getAgent(target.id);
    } else {
      agent = await necoService.createAgent(target.id);
    }

    if (!agent) {
      const err = `Agent not found for user ${target.id}, and creation failed.`;
      throw new Error(err);
    }

    // Handle user sitting in the chair (notification only)
    if (joinedChair && !target.roles.cache.has(funnyRole.id)) {
      const joinMsg = `Ohoo~ Parece que ${target.displayName} se ha sentado en la silla cuck! Nyanyanyaaa~~`;
      await messageService.send(joinMsg);
    }

    // Handle user leaving the chair (apply punishment)
    if (leftChair && !target.roles.cache.has(funnyRole.id) && !agent.punished) {
      await target.roles.add(funnyRole);
      await necoService.setPunishmentState(target.id, PUNISHED);
      const leaveMsg = `Oh no~~ ${target.displayName} ha abandonado la silla cuck... ¡qué decepción!`;
      await messageService.send(leaveMsg);

      const targetId = target.id;
      const roleId = funnyRole.id;
      const guildId = guild.id;
      const channelId = messageChannel.id;

      // Schedule removal of punishment role after timeout
      setTimeout(async () => {
        try {
          const currentGuild = client.guilds.cache.get(guildId);
          if (!currentGuild) return;

          // Fetch current member state
          const currentMember = await currentGuild.members.fetch(targetId).catch(() => null);
          if (!currentMember) return;

          // Remove role if still applied
          if (currentMember.roles.cache.has(roleId)) {
            await currentMember.roles.remove(roleId);
            await (await NecoService.getInstance()).setPunishmentState(targetId, !PUNISHED);

            // Get current message channel
            const currentChannel = currentGuild.channels.cache.get(channelId);
            if (currentChannel?.isTextBased()) {
              const releaseMsg = `${currentMember.displayName} ha sido liberado de la marca del cuck! Oops... Lo he dicho en voz alta? (¬‿¬) Nyehehe~~`;
              await new MessageService(currentChannel).send(releaseMsg);
            }
          }
        } catch (error) {
          console.error("Error in punishment removal:", error);
        }
      }, PUNISHMENT_TIME);
    }
  } catch (error) {
    console.error("Error processing chair event: ", error);
  }
}
