import { Client, Events, VoiceState } from "discord.js";
import { env } from "process";

import NecoService from "@services/neco.service";
import MessageService from "@services/message.service";

// Environment configuration
const GUILD_ID = env.GUILD_ID;
const NECO_MESSAGES_CHANNEL_ID = env.NECO_MESSAGES_CHANNEL;
const MAIN_VOICE_CHANNEL_ID = env.MAIN_VOICE_CHANNEL;
const FUNNY_CHAIR_CHANNEL_ID = env.FUNNY_CHAIR_CHANNEL;
const FUNNY_ROLE_ID = env.FUNNY_ROLE;

// Punishment configuration
const PUNISHED = true; // Constant for punishment state
const PUNISHMENT_TIME = 1000 * 60 * 60; // 1 hour in milliseconds

/**
 * Event handler for voice channel interactions
 * Tracks users entering/leaving special "chair" channel and applies punishments
 *
 * @param client Discord.js Client instance
 */
export default function chairEvent(client: Client): void {
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => chairEventHandler(client, oldState, newState));
}

/**
 * Handles voice state changes related to special chair channel
 * - Notifies when user sits in chair
 * - Applies punishment role when leaving chair
 * - Removes punishment after timeout
 */
async function chairEventHandler(client: Client, oldState: VoiceState, newState: VoiceState): Promise<void> {
  // Validate environment variables
  if (!NECO_MESSAGES_CHANNEL_ID || !MAIN_VOICE_CHANNEL_ID || !FUNNY_CHAIR_CHANNEL_ID || !FUNNY_ROLE_ID || !GUILD_ID) {
    console.error("Missing required environment variables for chair event");
    return;
  }

  const necoService = await NecoService.getInstance();

  // Resolve guild from either state or client cache
  const guild = oldState.guild ?? newState.guild ?? client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.error("Failed to resolve guild");
    return;
  }

  // Retrieve channel references
  const mainChannel = guild.channels.cache.get(MAIN_VOICE_CHANNEL_ID);
  const chairChannel = guild.channels.cache.get(FUNNY_CHAIR_CHANNEL_ID);
  const messageChannel = guild.channels.cache.get(NECO_MESSAGES_CHANNEL_ID);

  if (!mainChannel || !chairChannel || !messageChannel) {
    console.error("Failed to resolve one or more channels");
    return;
  }

  // Validate channel types
  const isMainChannel = mainChannel.isVoiceBased();
  const isChairChannel = chairChannel.isVoiceBased();
  const isMessageChannel = messageChannel.isTextBased();

  if (!isMainChannel || !isChairChannel || !isMessageChannel) {
    console.error("Invalid channel configuration");
    return;
  }

  const messageService = new MessageService(messageChannel);
  const funnyRole = guild.roles.cache.get(FUNNY_ROLE_ID);

  if (!funnyRole) {
    console.error("Funny role not found");
    return;
  }

  // Determine voice state changes
  const joinedFunnyChannel = newState.channelId === FUNNY_CHAIR_CHANNEL_ID;
  const leftFunnyChannel = oldState.channelId === FUNNY_CHAIR_CHANNEL_ID;

  // Resolve target member (prefer newState, fallback to oldState)
  const target = newState.member ?? oldState.member;
  if (!target) {
    console.error("Failed to resolve member");
    return;
  }

  // Ensure user exists in database
  const targetExistsInDb = await necoService.checkAgentExists(target.id);
  if (!targetExistsInDb) {
    await necoService.createAgent(target.id);
  }

  const agent = await necoService.getAgent(target.id);
  if (!agent) {
    console.error("Failed to retrieve agent");
    return;
  }

  // Handle chair interactions
  if (joinedFunnyChannel && !target.roles.cache.has(funnyRole.id)) {
    // User sat in chair without punishment role
    const msg = `Ohoo~ Parece que ${target.displayName} se ha sentado en la silla cuck! Nyanyanyaaa~~`;
    await messageService.send(msg);
  }

  if (leftFunnyChannel && !target.roles.cache.has(funnyRole.id) && !agent.punished) {
    // User left chair - apply punishment
    await target.roles.add(funnyRole);
    await necoService.manipulateAgentPunishmentState(target.id, PUNISHED);
    const msg = `Oh no~~ ${target.displayName} ha abandonado la silla cuck... ¡qué decepción!`;
    await messageService.send(msg);
  }

  // Schedule punishment removal
  setTimeout(async () => {
    const refreshedTarget = guild.members.cache.get(target.id);
    if (refreshedTarget?.roles.cache.has(funnyRole.id)) {
      await refreshedTarget.roles.remove(funnyRole.id);
      await necoService.manipulateAgentPunishmentState(target.id, !PUNISHED);
      const msg = `${refreshedTarget.displayName} ha sido liberado de la marca del cuck! Oops... Lo he dicho en voz alta? (¬‿¬) Nyehehe~~`;
      await messageService.send(msg);
    }
  }, PUNISHMENT_TIME);
}
