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

const DEFAULT_ERROR_IMAGE_PATH = path.resolve("public/img/error.jpg");

export default class InteractionService {
  private interaction: ChatInputCommandInteraction;

  constructor(interaction: ChatInputCommandInteraction) {
    this.interaction = interaction;
  }

  async standardReply(content: string) {
    return this.handleResponse({ content });
  }

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

  async filesReply(content: string, files: string[]) {
    const images = files.map((file) => new AttachmentBuilder(file));

    return this.handleResponse({
      content,
      files: images,
    });
  }

  async errorReply(content: string) {
    const errorImage = this.loadErrorImage();
    return this.handleResponse({
      content,
      flags: "Ephemeral",
      files: errorImage ? [errorImage] : undefined,
    });
  }

  async embedReply(embed: EmbedBuilder) {
    return this.handleResponse({
      embeds: [embed],
    });
  }

  async deferReply(ephemeral = false) {
    try {
      ephemeral ? this.interaction.deferReply({ flags: "Ephemeral" }) : this.interaction.deferReply();
    } catch (error) {
      console.error("Defer reply failed:", error);
      throw error;
    }
  }

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

  async followReply(content: string | MessagePayload | InteractionReplyOptions) {
    if (!this.interaction.replied) {
      throw new Error("No initial reply to follow up");
    }
    try {
      const result = await this.interaction.followUp(content);
      return result;
    } catch (error) {
      console.error("Follow up failed:", error);
      throw error;
    }
  }

  async editReply(content: string | MessagePayload | InteractionEditReplyOptions) {
    if (!this.interaction.replied) {
      throw new Error("No reply to edit");
    }
    try {
      const result = await this.interaction.editReply(content);
      return result;
    } catch (error) {
      console.error("Edit reply failed:", error);
      throw error;
    }
  }

  private async handleResponse(options: InteractionReplyOptions): Promise<void | InteractionResponse> {
    try {
      const response = await this.interaction.reply(options);
      return response;
    } catch (error) {
      console.error("Reply failed:", error);
      throw error;
    }
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
