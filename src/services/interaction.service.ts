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

// Shared error image path (matches message.service)
const DEFAULT_ERROR_IMAGE_PATH = path.resolve("public/img/error.jpg");

/**
 * Service for handling command interaction responses
 * Centralizes response patterns with consistent error handling
 */
export default class InteractionService {
  private interaction: ChatInputCommandInteraction;

  constructor(interaction: ChatInputCommandInteraction) {
    this.interaction = interaction;
  }

  /**
   * Standard text-only reply
   *
   * @param content Response text
   */
  async standardReply(content: string) {
    return this.handleResponse({ content });
  }

  /**
   * Ephemeral reply (visible only to user) with optional files
   *
   * @param content Response text
   * @param files Optional array of file paths
   */
  async feedbackReply(content: string, files: string[] | null = null) {
    if (files) {
      const images = files.map((file) => new AttachmentBuilder(file));
      return this.handleResponse({
        content,
        files: images,
        flags: "Ephemeral",
      });
    }

    return this.handleResponse({
      content,
      flags: "Ephemeral",
    });
  }

  /**
   * File attachment reply (visible to all)
   *
   * @param content Response text
   * @param files Array of file paths
   */
  async filesReply(content: string, files: string[]) {
    const images = files.map((file) => new AttachmentBuilder(file));

    return this.handleResponse({
      content,
      files: images,
    });
  }

  /**
   * Error reply with default image (ephemeral)
   *
   * @param content Error message text
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
   * Embedded content reply
   *
   * @param embed Prebuilt EmbedBuilder instance
   */
  async embedReply(embed: EmbedBuilder) {
    return this.handleResponse({
      embeds: [embed],
    });
  }

  /**
   * Defers reply (shows loading state)
   *
   * @param ephemeral Make deferred response ephemeral
   */
  async deferReply(ephemeral = false) {
    try {
      ephemeral ? this.interaction.deferReply({ flags: "Ephemeral" }) : this.interaction.deferReply();
    } catch (error) {
      console.error("Defer reply failed:", error);
      throw error;
    }
  }

  /**
   * Deletes existing reply
   *
   * @throws If no reply exists
   */
  async deleteReply() {
    if (!this.interaction.replied) {
      throw new Error("No reply to delete");
    }
    try {
      return await this.interaction.deleteReply();
    } catch (error) {
      console.error("Delete reply failed:", error);
      throw error;
    }
  }

  /**
   * Follow-up message after initial reply
   *
   * @param content Follow-up content
   * @returns Follow-up message
   */
  async followReply(content: string | MessagePayload | InteractionReplyOptions) {
    try {
      const result = await this.interaction.followUp(content);
      return result;
    } catch (error) {
      console.error("Follow up failed:", error);
      throw error;
    }
  }

  /**
   * Edits existing reply
   *
   * @param content New content
   * @returns Edited message
   */
  async editReply(content: string | MessagePayload | InteractionEditReplyOptions) {
    try {
      const result = await this.interaction.editReply(content);
      return result;
    } catch (error) {
      console.error("Edit reply failed:", error);
      throw error;
    }
  }

  /**
   * Unified response handler with error trapping
   *
   * @param options Response options
   * @returns Interaction response
   */
  private async handleResponse(options: InteractionReplyOptions): Promise<void | InteractionResponse> {
    try {
      const response = await this.interaction.reply(options);
      return response;
    } catch (error) {
      console.error("Reply failed:", error);
      throw error;
    }
  }

  /**
   * Loads error image (shared implementation with MessageService)
   *
   * @returns AttachmentBuilder or null
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
