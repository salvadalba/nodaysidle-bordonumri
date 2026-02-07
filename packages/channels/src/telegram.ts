import type { ChannelAdapter, ChannelMessage } from "@agentpilot/core";

export class TelegramAdapter implements ChannelAdapter {
  type = "telegram" as const;

  constructor(private botToken: string) {}

  async start(): Promise<void> {
    // TODO: Phase 5 - implement with grammY
  }

  async stop(): Promise<void> {
    // TODO: Phase 5
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    // TODO: Phase 5
  }

  onMessage(handler: (message: ChannelMessage) => void): void {
    // TODO: Phase 5
  }
}
