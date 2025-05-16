import {
  ChatInputCommandInteraction,
  MessageFlags,
  AttachmentBuilder,
  EmbedBuilder,
  InteractionReplyOptions,
  InteractionEditReplyOptions,
  InteractionResponse,
  MessagePayload,
} from "discord.js";

import path from "path";

const getErrorImage = () => {
  const imagePath = path.resolve("public/img/error.jpg");
  return new AttachmentBuilder(imagePath);
};

export default class InteractionService {
  private interaction: ChatInputCommandInteraction;
  private hasReplied = false;

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
    return this.handleResponse({
      content,
      flags: "Ephemeral",
      files: [getErrorImage()],
    });
  }

  async embedReply(embed: EmbedBuilder) {
    return this.handleResponse({
      embeds: [embed],
    });
  }

  async deferReply(ephemeral = false) {
    if (this.hasReplied) {
      throw new Error("Interaction already replied to");
    }
    try {
      await this.interaction.deferReply({ ephemeral });
      this.hasReplied = true;
    } catch (error) {
      console.error("Defer reply failed:", error);
      throw error;
    }
  }

  async deleteReply() {
    if (!this.hasReplied) return;
    try {
      return await this.interaction.deleteReply();
    } catch (error) {
      console.error("Delete reply failed:", error);
      throw error;
    }
  }

  async followReply(content: string | MessagePayload | InteractionReplyOptions) {
    if (!this.hasReplied) {
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
    if (!this.hasReplied) {
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
    if (this.hasReplied) {
      throw new Error("Interaction already replied to");
    }

    try {
      const response = await this.interaction.reply(options);
      this.hasReplied = true;
      return response;
    } catch (error) {
      console.error("Reply failed:", error);
      throw error;
    }
  }
}
