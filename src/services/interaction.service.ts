import {
  ChatInputCommandInteraction,
  AttachmentBuilder,
  EmbedBuilder,
  InteractionReplyOptions,
  InteractionEditReplyOptions,
  InteractionResponse,
  MessagePayload,
} from "discord.js";
import path from "path";
import fs from "fs";

// Default path to the error image used in interaction replies
const DEFAULT_ERROR_IMAGE_PATH = path.resolve("public/img/error.jpg");

/**
 * Service centralizing Discord slash‑command interaction responses.
 *
 * Offers methods for standard, ephemeral, file, embed, error, deferred,
 * follow‑up, edit, and delete operations with unified error handling.
 */
export default class InteractionService {
  /** The interaction context for reply operations */
  private interaction: ChatInputCommandInteraction;

  /**
   * Constructs a new InteractionService for a given command interaction.
   *
   * @param interaction - The ChatInputCommandInteraction to respond to.
   */
  constructor(interaction: ChatInputCommandInteraction) {
    this.interaction = interaction;
  }

  /**
   * Sends a standard public reply with plain text.
   *
   * @param content - The reply text.
   * @returns The interaction response.
   */
  async standardReply(content: string) {
    return this.handleResponse({ content });
  }

  /**
   * Sends an ephemeral (user‑only) reply, optionally with file attachments.
   *
   * @param content - The reply text.
   * @param files - Optional array of file paths to attach.
   * @returns The interaction response.
   */
  async feedbackReply(content: string, files: string[] | null = null) {
    const options: InteractionReplyOptions = {
      content,
      flags: "Ephemeral",
    };

    if (files) {
      options.files = files.map((file) => new AttachmentBuilder(file));
    }

    return this.handleResponse(options);
  }

  /**
   * Sends a public reply with file attachments.
   *
   * @param content - The reply text.
   * @param files - Array of file paths to attach.
   * @returns The interaction response.
   */
  async filesReply(content: string, files: string[]) {
    const options: InteractionReplyOptions = {
      content,
      files: files.map((file) => new AttachmentBuilder(file)),
    };
    return this.handleResponse(options);
  }

  /**
   * Sends an ephemeral error reply with the default error image.
   *
   * @param content - The error message text.
   * @returns The interaction response.
   */
  async errorReply(content: string) {
    const errorImage = this.loadErrorImage();
    return this.handleResponse({
      content,
      flags: "Ephemeral",
      files: errorImage ? [errorImage] : undefined,
    });
  }

  /**
   * Sends an embed as the interaction reply.
   *
   * @param embed - A prebuilt EmbedBuilder instance.
   * @returns The interaction response.
   */
  async embedReply(embed: EmbedBuilder) {
    return this.handleResponse({ embeds: [embed] });
  }

  /**
   * Defers the reply, showing a loading state.
   *
   * @param ephemeral - Whether the eventual reply should be ephemeral.
   * @throws Will propagate any error encountered during defer.
   */
  async deferReply(ephemeral = false) {
    try {
      if (ephemeral) {
        await this.interaction.deferReply({ flags: "Ephemeral" });
      } else {
        await this.interaction.deferReply();
      }
    } catch (error) {
      console.error("Defer reply failed:", error);
      throw error;
    }
  }

  /**
   * Deletes the existing reply, if one has been sent.
   *
   * @returns Void promise once deletion completes.
   * @throws If no reply exists or deletion fails.
   */
  async deleteReply() {
    if (!this.interaction.replied) {
      throw new Error("No reply to delete");
    }
    try {
      await this.interaction.deleteReply();
    } catch (error) {
      console.error("Delete reply failed:", error);
      throw error;
    }
  }

  /**
   * Sends a follow‑up message after the initial reply.
   *
   * @param content - The follow‑up content (text, payload, or options).
   * @returns The follow‑up message object.
   */
  async followReply(content: string | MessagePayload | InteractionReplyOptions) {
    try {
      return await this.interaction.followUp(content);
    } catch (error) {
      console.error("Follow up failed:", error);
      throw error;
    }
  }

  /**
   * Edits the existing reply with new content.
   *
   * @param content - The new content (text, payload, or edit options).
   * @returns The edited message object.
   */
  async editReply(content: string | MessagePayload | InteractionEditReplyOptions) {
    try {
      return await this.interaction.editReply(content);
    } catch (error) {
      console.error("Edit reply failed:", error);
      throw error;
    }
  }

  /**
   * Internal helper that performs the actual reply operation and traps errors.
   *
   * @param options - InteractionReplyOptions to pass to `reply()`.
   * @returns The raw InteractionResponse or void.
   */
  private async handleResponse(options: InteractionReplyOptions): Promise<void | InteractionResponse> {
    try {
      return await this.interaction.reply(options);
    } catch (error) {
      console.error("Reply failed:", error);
      throw error;
    }
  }

  /**
   * Loads the default error image from disk for error replies.
   *
   * @returns An AttachmentBuilder or null if the file is inaccessible.
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
