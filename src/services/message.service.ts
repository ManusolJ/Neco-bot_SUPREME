import {
  MessageCreateOptions,
  MessagePayload,
  EmbedBuilder,
  AttachmentBuilder,
  GuildTextBasedChannel,
} from "discord.js";
import path from "path";
import fs from "fs";

// Default error image path (resolved at module load)
const DEFAULT_ERROR_IMAGE_PATH = path.resolve("public/img/error.jpg");

/**
 * Service for handling Discord message operations in text channels
 * Encapsulates message sending with various content types and error handling
 */
export default class MessageService {
  private channel: GuildTextBasedChannel;

  constructor(channel: GuildTextBasedChannel) {
    this.channel = channel;
  }

  /**
   * Base message sending method with error handling
   *
   * @param content Message content (string, options, or payload)
   * @returns Sent message object
   * @throws Original error on failure
   */
  async send(content: string | MessageCreateOptions | MessagePayload) {
    try {
      const sent = await this.channel.send(content);
      return sent;
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error; // Propagate for higher-level handling
    }
  }

  /**
   * Sends an embedded message
   *
   * @param embed Prebuilt EmbedBuilder instance
   * @param content Optional text content
   */
  async sendEmbed(embed: EmbedBuilder, content?: string) {
    return this.send({
      content,
      embeds: [embed],
    });
  }

  /**
   * Sends message with file attachments
   *
   * @param content Text content
   * @param filePaths Array of absolute paths to files
   */
  async sendFiles(content: string, filePaths: string[]) {
    // Resolve and create AttachmentBuilder instances
    const files = filePaths.map((file) => new AttachmentBuilder(path.resolve(file)));
    return this.send({
      content,
      files,
    });
  }

  /**
   * Sends error message with default error image
   *
   * @param content Error description text
   */
  async sendError(content: string) {
    const errorImage = this.loadErrorImage();
    return this.send({
      content,
      files: errorImage ? [errorImage] : undefined, // Fallback if image missing
    });
  }

  /**
   * Loads error image from predefined path
   *
   * @returns AttachmentBuilder if image exists, otherwise null
   */
  private loadErrorImage(): AttachmentBuilder | null {
    try {
      // Check existence before attempting to attach
      if (fs.existsSync(DEFAULT_ERROR_IMAGE_PATH)) {
        return new AttachmentBuilder(DEFAULT_ERROR_IMAGE_PATH);
      }
    } catch (e) {
      console.warn("Error image not found or unreadable:", e);
    }
    return null;
  }
}
