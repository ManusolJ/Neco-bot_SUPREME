import { Client, Events, VoiceState } from "discord.js";

export default function roleEvent(client: Client): void {
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => roleEventHandler(client, oldState, newState));
}

async function roleEventHandler(client: Client, oldState: VoiceState, newState: VoiceState): Promise<void> {}
