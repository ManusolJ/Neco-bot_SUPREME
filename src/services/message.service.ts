import {
  MessageCreateOptions,
  MessagePayload,
  EmbedBuilder,
  AttachmentBuilder,
  GuildTextBasedChannel,
  Message,
} from "discord.js";
import path from "path";
import fs from "fs";

/** Absolute path to the default image used in error messages. */
const DEFAULT_ERROR_IMAGE_PATH = path.resolve("public/img/error.jpg");

/**
 * Service class for sending messages to a specific Discord text channel.
 *
 * @remarks
 * Provides helper methods for common content types: plain text, embeds, files,
 * and error messages with a fallback image.
 */
export default class MessageService {
  /** The text-based channel to which messages will be sent. */
  private readonly channel: GuildTextBasedChannel;

  /**
   * Creates a new instance of `MessageService` for the given channel.
   *
   * @param channel - The target Discord text channel for all outgoing messages.
   */
  constructor(channel: GuildTextBasedChannel) {
    this.channel = channel;
  }

  /**
   * Sends a message to the configured channel.
   *
   * @param content - The content to send (text, payload, or full options).
   * @returns A promise resolving to the sent `Message` object.
   * @throws Will rethrow any error that occurs during sending.
   */
  async send(content: string | MessageCreateOptions | MessagePayload): Promise<Message> {
    try {
      return await this.channel.send(content);
    } catch (error) {
      console.error("Message send failed:", error);
      throw error;
    }
  }

  /**
   * Sends an embed message, with optional accompanying text.
   *
   * @param embed - A fully configured embed object.
   * @param content - Optional message content to accompany the embed.
   * @returns A promise resolving to the sent message.
   */
  async sendEmbed(embed: EmbedBuilder, content?: string): Promise<Message> {
    return this.send({
      content,
      embeds: [embed],
    });
  }

  /**
   * Sends a text message with one or more attached files.
   *
   * @param content - The message body.
   * @param filePaths - Array of paths to files to attach.
   * @returns A promise resolving to the sent message.
   */
  async sendWithFiles(content: string, filePaths: string[]): Promise<Message> {
    const files = filePaths.map((file) => new AttachmentBuilder(path.resolve(file)));
    return this.send({
      content,
      files,
    });
  }

  /**
   * Sends an error message, optionally with the default error image.
   *
   * @param content - A description of the error or failure.
   * @returns A promise resolving to the sent message.
   */
  async sendError(content: string): Promise<Message> {
    const errorImage = this.loadErrorImage();
    return this.send({
      content,
      files: errorImage ? [errorImage] : undefined,
    });
  }

  /**
   * Attempts to load the default error image for fallback error messages.
   *
   * @returns An `AttachmentBuilder` instance, or `null` if the file is not found.
   */
  private loadErrorImage(): AttachmentBuilder | null {
    try {
      if (fs.existsSync(DEFAULT_ERROR_IMAGE_PATH)) {
        return new AttachmentBuilder(DEFAULT_ERROR_IMAGE_PATH);
      }
    } catch (error) {
      console.warn("Error loading fallback image:", error);
    }
    return null;
  }
}
