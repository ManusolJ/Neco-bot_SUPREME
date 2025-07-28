import {
  ChatInputCommandInteraction,
  AttachmentBuilder,
  EmbedBuilder,
  InteractionReplyOptions,
  InteractionEditReplyOptions,
  InteractionResponse,
  MessagePayload,
} from "discord.js";
import fs from "fs";
import path from "path";

const DEFAULT_ERROR_IMAGE_PATH = path.resolve("public/img/error.jpg");

/**
 * Centralized service for handling interaction replies.
 * Supports standard, ephemeral, embed, file, error, and follow-up responses.
 */
export default class InteractionService {
  private readonly interaction: ChatInputCommandInteraction;

  constructor(interaction: ChatInputCommandInteraction) {
    this.interaction = interaction;
  }

  /**
   * Sends a basic public reply.
   *
   * @param content - The text content of the reply.
   */
  async reply(content: string): Promise<InteractionResponse | void> {
    return this.safeReply({ content });
  }

  /**
   * Sends an ephemeral reply (visible only to the user).
   *
   * @param content - The message content.
   * @param files - Optional list of file paths to attach.
   */
  async replyEphemeral(content: string, files?: string[]): Promise<InteractionResponse | void> {
    const options: InteractionReplyOptions = {
      content,
      flags: "Ephemeral",
    };

    if (files && files.length > 0) {
      options.files = files.map((f) => new AttachmentBuilder(f));
    }

    return this.safeReply(options);
  }

  /**
   * Sends a public reply with file attachments.
   *
   * @param content - The reply message.
   * @param files - List of file paths to attach.
   */
  async replyWithFiles(content: string, files: string[]): Promise<InteractionResponse | void> {
    const options: InteractionReplyOptions = {
      content,
      files: files.map((f) => new AttachmentBuilder(f)),
    };
    return this.safeReply(options);
  }

  /**
   * Sends an ephemeral error message with a default image (if available).
   *
   * @param content - The error message.
   */
  async replyError(content: string): Promise<InteractionResponse | void> {
    const image = this.loadErrorImage();
    return this.safeReply({
      content,
      ephemeral: true,
      files: image ? [image] : undefined,
    });
  }

  /**
   * Sends an embed as a reply.
   *
   * @param embed - A preconstructed embed.
   */
  async replyEmbed(embed: EmbedBuilder): Promise<InteractionResponse | void> {
    return this.safeReply({ embeds: [embed] });
  }

  /**
   * Defers the reply to show a loading state.
   *
   * @param ephemeral - Whether the deferred message should be ephemeral.
   */
  async deferReply(ephemeral = false): Promise<void> {
    try {
      await this.interaction.deferReply({ ephemeral });
    } catch (error) {
      console.error("Defer failed:", error);
      throw error;
    }
  }

  /**
   * Deletes the current reply.
   */
  async deleteReply(): Promise<void> {
    try {
      await this.interaction.deleteReply();
    } catch (error) {
      console.error("Delete failed:", error);
      throw error;
    }
  }

  /**
   * Sends a follow-up message after the initial reply.
   *
   * @param content - The follow-up content.
   */
  async followUp(content: string | MessagePayload | InteractionReplyOptions): Promise<void> {
    try {
      await this.interaction.followUp(content);
    } catch (error) {
      console.error("Follow-up failed:", error);
      throw error;
    }
  }

  /**
   * Edits the current reply with new content.
   *
   * @param content - New content or options.
   */
  async editReply(content: string | MessagePayload | InteractionEditReplyOptions): Promise<void> {
    try {
      await this.interaction.editReply(content);
    } catch (error) {
      console.error("Edit failed:", error);
      throw error;
    }
  }

  /**
   * Internal helper that wraps `interaction.reply()` with error handling.
   *
   * @param options - Standard reply options.
   */
  private async safeReply(options: InteractionReplyOptions): Promise<InteractionResponse | void> {
    try {
      return await this.interaction.reply(options);
    } catch (error) {
      console.error("Reply failed:", error);
    }
  }

  /**
   * Loads the default error image from disk.
   *
   * @returns An attachment or null if not found.
   */
  private loadErrorImage(): AttachmentBuilder | null {
    try {
      if (fs.existsSync(DEFAULT_ERROR_IMAGE_PATH)) {
        return new AttachmentBuilder(DEFAULT_ERROR_IMAGE_PATH);
      }
    } catch (error) {
      console.warn("Failed to load error image:", error);
    }
    return null;
  }
}
