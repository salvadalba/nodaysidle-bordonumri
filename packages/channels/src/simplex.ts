import type { ChannelAdapter, ChannelMessage } from "@agentpilot/core";

export class SimpleXAdapter implements ChannelAdapter {
  type = "simplex" as const;

  constructor(private cliPath: string) {}

  async start(): Promise<void> {
    // TODO: Phase 5 - implement with simplex-chat CLI bridge
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
