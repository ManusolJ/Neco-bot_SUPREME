import {
  TextBasedChannel,
  MessageCreateOptions,
  MessagePayload,
  EmbedBuilder,
  AttachmentBuilder,
  TextChannel,
} from "discord.js";
import path from "path";
import fs from "fs";

const DEFAULT_ERROR_IMAGE_PATH = path.resolve("public/img/error.jpg");

export default class ChannelMessageService {
  private channel: TextChannel;

  constructor(channel: TextChannel) {
    this.channel = channel;
  }

  async send(content: string | MessageCreateOptions | MessagePayload) {
    try {
      const sent = await this.channel.send(content);
      return sent;
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  async sendEmbed(embed: EmbedBuilder, content?: string) {
    return this.send({
      content,
      embeds: [embed],
    });
  }

  async sendFiles(content: string, filePaths: string[]) {
    const files = filePaths.map((file) => new AttachmentBuilder(path.resolve(file)));
    return this.send({
      content,
      files,
    });
  }

  async sendError(content: string) {
    const errorImage = this.loadErrorImage();
    return this.send({
      content,
      files: errorImage ? [errorImage] : undefined,
    });
  }

  private loadErrorImage(): AttachmentBuilder | null {
    try {
      if (fs.existsSync(DEFAULT_ERROR_IMAGE_PATH)) {
        return new AttachmentBuilder(DEFAULT_ERROR_IMAGE_PATH);
      }
    } catch (e) {
      console.warn("Error image not found or unreadable:", e);
    }
    return null;
  }
}
