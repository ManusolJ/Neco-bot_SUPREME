import { Client, Events, VoiceState } from "discord.js";
import { env } from "process";

import NecoService from "@services/neco.service";
import MessageService from "@services/message.service";

const GUILD_ID = env.GUILD_ID;

const NECO_MESSAGES_CHANNEL_ID = env.NECO_MESSAGES_CHANNEL;

const MAIN_VOICE_CHANNEL_ID = env.MAIN_VOICE_CHANNEL;

const FUNNY_CHAIR_CHANNEL_ID = env.FUNNY_CHAIR_CHANNEL;

const FUNNY_ROLE_ID = env.FUNNY_ROLE;

const PUNISHED = true;

const TIME = 1000 * 60 * 60;

export default function chairEvent(client: Client): void {
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => chairEventHandler(client, oldState, newState));
}

async function chairEventHandler(client: Client, oldState: VoiceState, newState: VoiceState): Promise<void> {
  if (!NECO_MESSAGES_CHANNEL_ID || !MAIN_VOICE_CHANNEL_ID || !FUNNY_CHAIR_CHANNEL_ID || !FUNNY_ROLE_ID || !GUILD_ID) {
    console.error("Hubo un problema intentando recuperar variables de entorno.");
    return;
  }

  const necoService = await NecoService.getInstance();

  const guild = oldState.guild ?? newState.guild ?? client.guilds.cache.get(GUILD_ID);

  if (!guild) {
    console.error("Hubo un error al intentar conseguir el servidor.");
    return;
  }

  const mainChannel = guild.channels.cache.get(MAIN_VOICE_CHANNEL_ID);

  const chairChannel = guild.channels.cache.get(FUNNY_CHAIR_CHANNEL_ID);

  const messageChannel = guild.channels.cache.get(NECO_MESSAGES_CHANNEL_ID);

  const isMainChannel = mainChannel && mainChannel.isVoiceBased();

  const isChairChannel = chairChannel && chairChannel.isVoiceBased();

  const isMessageChannel = messageChannel && messageChannel.isTextBased();

  if (!isMainChannel || !isChairChannel || !isMessageChannel) {
    console.error("Hubo un error al intentar conseguir los canales de voz o de mensajes.");
    return;
  }

  const messageService = new MessageService(messageChannel);

  const funnyRole = guild.roles.cache.get(FUNNY_ROLE_ID);

  if (!funnyRole) {
    console.error("Hubo un error al intentar conseguir el rol.");
    return;
  }

  const joinedFunnyChannel = newState.channelId === FUNNY_CHAIR_CHANNEL_ID;

  const leftFunnyChannel = oldState.channelId === FUNNY_CHAIR_CHANNEL_ID;

  const target = newState.member ?? oldState.member;

  if (!target) {
    console.error("Hubo un error al intentar conseguir el miembro del usuario.");
    return;
  }

  const targetExistsInDb = await necoService.checkAgentExists(target.id);

  let agent;

  if (!targetExistsInDb) {
    await necoService.createAgent(target.id);
  }

  agent = await necoService.getAgent(target.id);

  if (!agent) {
    console.error("Hubo un error al intentar conseguir el agente del usuario.");
    return;
  }

  if (joinedFunnyChannel && !target.roles.cache.has(funnyRole.id)) {
    const msg = `Ohoo~ Parece que ${target.displayName} se ha sentado en la silla cuck! Nyanyanyaaa~~`;
    await messageService.send(msg);
  }

  if (leftFunnyChannel && !target.roles.cache.has(funnyRole.id) && !agent.punished) {
    await target.roles.add(funnyRole);
    await necoService.manipulateAgentPunishmentState(target.id, PUNISHED);
    const msg = `Oh no~~ ${target.displayName} ha abandonado la silla cuck... ¡qué decepción!`;
    await messageService.send(msg);
  }

  setTimeout(async () => {
    const refreshedTarget = guild.members.cache.get(target.id);
    if (refreshedTarget && refreshedTarget.roles.cache.get(funnyRole.id)) {
      await refreshedTarget.roles.remove(funnyRole.id);
      await necoService.manipulateAgentPunishmentState(target.id, !PUNISHED);
      const msg = `${refreshedTarget.displayName} ha sido liberado de la marca del cuck! Oops... Lo he dicho en voz alta? (¬‿¬) Nyehehe~~`;
      await messageService.send(msg);
    }
  }, TIME);
}
