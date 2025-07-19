import {
  MessageCreateOptions,
  MessagePayload,
  EmbedBuilder,
  AttachmentBuilder,
  GuildTextBasedChannel,
} from "discord.js";
import path from "path";
import fs from "fs";

// Default path to the error image used when sending error messages
const DEFAULT_ERROR_IMAGE_PATH = path.resolve("public/img/error.jpg");

/**
 * Service encapsulating message sending operations in a Discord text channel.
 *
 * Provides methods to send plain text, embeds, files, and standardized error messages
 * with built‑in error handling and optional attachments.
 */
export default class MessageService {
  /** The Discord text channel where messages will be sent */
  private channel: GuildTextBasedChannel;

  /**
   * Constructs a new MessageService bound to a specific text channel.
   *
   * @param channel - The target GuildTextBasedChannel for outgoing messages.
   */
  constructor(channel: GuildTextBasedChannel) {
    this.channel = channel;
  }

  /**
   * Sends arbitrary content to the configured channel.
   *
   * @param content - The message content, which may be a string, full options, or payload.
   * @returns The sent message object.
   * @throws Will re‑throw any error encountered during send.
   */
  async send(content: string | MessageCreateOptions | MessagePayload) {
    try {
      const sent = await this.channel.send(content);
      return sent;
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  /**
   * Sends an embed along with optional text content.
   *
   * @param embed - A preconfigured EmbedBuilder instance.
   * @param content - Optional accompanying text content.
   * @returns The sent message object.
   */
  async sendEmbed(embed: EmbedBuilder, content?: string) {
    return this.send({
      content,
      embeds: [embed],
    });
  }

  /**
   * Sends text content and attaches one or more files.
   *
   * @param content - The message text.
   * @param filePaths - Array of absolute or relative file paths to attach.
   * @returns The sent message object.
   */
  async sendFiles(content: string, filePaths: string[]) {
    const files = filePaths.map((file) => new AttachmentBuilder(path.resolve(file)));
    return this.send({
      content,
      files,
    });
  }

  /**
   * Sends an error notification message, attaching the default error image if available.
   *
   * @param content - Error description text.
   * @returns The sent message object.
   */
  async sendError(content: string) {
    const errorImage = this.loadErrorImage();
    return this.send({
      content,
      files: errorImage ? [errorImage] : undefined,
    });
  }

  /**
   * Attempts to load the default error image from disk.
   *
   * @returns An AttachmentBuilder for the error image, or null if unavailable.
   */
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
