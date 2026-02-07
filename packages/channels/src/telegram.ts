import { Bot } from "grammy";
import { randomUUID } from "node:crypto";
import type { ChannelAdapter, ChannelMessage } from "@agentpilot/core";
import { ChannelError } from "@agentpilot/core";

export class TelegramAdapter implements ChannelAdapter {
  type = "telegram" as const;
  private bot: Bot;
  private messageHandler?: (message: ChannelMessage) => void;

  constructor(private botToken: string) {
    this.bot = new Bot(botToken);
  }

  async start(): Promise<void> {
    this.bot.on("message:text", (ctx) => {
      if (!this.messageHandler || !ctx.message.text) return;

      const msg: ChannelMessage = {
        id: randomUUID(),
        channelType: "telegram",
        channelId: String(ctx.chat.id),
        userId: String(ctx.from?.id ?? "unknown"),
        content: ctx.message.text,
        timestamp: new Date(ctx.message.date * 1000),
      };

      this.messageHandler(msg);
    });

    // Handle photos with captions
    this.bot.on("message:photo", (ctx) => {
      if (!this.messageHandler) return;

      const msg: ChannelMessage = {
        id: randomUUID(),
        channelType: "telegram",
        channelId: String(ctx.chat.id),
        userId: String(ctx.from?.id ?? "unknown"),
        content: ctx.message.caption ?? "[Photo received]",
        attachments: [
          {
            type: "image",
            url: "", // Would need getFile API call
            name: "photo.jpg",
            mimeType: "image/jpeg",
            size: 0,
          },
        ],
        timestamp: new Date(ctx.message.date * 1000),
      };

      this.messageHandler(msg);
    });

    try {
      this.bot.start();
      console.log("[Telegram] Bot started");
    } catch (err) {
      throw new ChannelError(
        "telegram",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async stop(): Promise<void> {
    this.bot.stop();
    console.log("[Telegram] Bot stopped");
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    try {
      // Try Markdown first, fall back to plain text if parsing fails
      await this.bot.api.sendMessage(Number(channelId), content, {
        parse_mode: "Markdown",
      });
    } catch {
      try {
        // Send as plain text (no parse_mode)
        await this.bot.api.sendMessage(Number(channelId), content);
      } catch (err) {
        throw new ChannelError(
          "telegram",
          `Failed to send: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  onMessage(handler: (message: ChannelMessage) => void): void {
    this.messageHandler = handler;
  }
}
