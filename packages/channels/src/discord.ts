import { Client, GatewayIntentBits, Events } from "discord.js";
import { randomUUID } from "node:crypto";
import type { ChannelAdapter, ChannelMessage } from "@agentpilot/core";
import { ChannelError } from "@agentpilot/core";

export class DiscordAdapter implements ChannelAdapter {
  type = "discord" as const;
  private client: Client;
  private messageHandler?: (message: ChannelMessage) => void;

  constructor(private botToken: string) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });
  }

  async start(): Promise<void> {
    this.client.on(Events.MessageCreate, (message) => {
      // Ignore bot messages
      if (message.author.bot || !this.messageHandler) return;

      const attachments = message.attachments.map((a) => ({
        type: "file" as const,
        url: a.url,
        name: a.name ?? "attachment",
        mimeType: a.contentType ?? "application/octet-stream",
        size: a.size,
      }));

      const msg: ChannelMessage = {
        id: randomUUID(),
        channelType: "discord",
        channelId: message.channelId,
        userId: message.author.id,
        content: message.content,
        attachments: attachments.length > 0 ? attachments : undefined,
        timestamp: message.createdAt,
      };

      this.messageHandler(msg);
    });

    try {
      await this.client.login(this.botToken);
      console.log(`[Discord] Bot logged in as ${this.client.user?.tag}`);
    } catch (err) {
      throw new ChannelError(
        "discord",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async stop(): Promise<void> {
    await this.client.destroy();
    console.log("[Discord] Bot disconnected");
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel && "send" in channel) {
        await (channel as any).send(content);
      } else {
        throw new Error(`Channel ${channelId} not found or not text-based`);
      }
    } catch (err) {
      throw new ChannelError(
        "discord",
        `Failed to send: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  onMessage(handler: (message: ChannelMessage) => void): void {
    this.messageHandler = handler;
  }
}
