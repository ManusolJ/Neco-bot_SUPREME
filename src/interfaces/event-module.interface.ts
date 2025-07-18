import { Client } from "discord.js";

export default interface EventModule {
  default?: (client: Client) => void;
  register?: (client: Client) => void;
}
