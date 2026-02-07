import { describe, it, expect, vi } from "vitest";

// Mock discord.js before importing adapter
vi.mock("discord.js", () => ({
  Client: class MockClient {
    handlers: Record<string, Function> = {};
    user = { tag: "AgentPilot#0001" };
    on(event: string, handler: Function) {
      this.handlers[event] = handler;
    }
    async login() {}
    async destroy() {}
    channels = {
      fetch: vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue({}),
      }),
    };
  },
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 512,
    MessageContent: 32768,
    DirectMessages: 4096,
  },
  Events: {
    MessageCreate: "messageCreate",
  },
}));

import { DiscordAdapter } from "./discord.js";

describe("DiscordAdapter", () => {
  it("should have correct type", () => {
    const adapter = new DiscordAdapter("fake-token");
    expect(adapter.type).toBe("discord");
  });

  it("should register message handler", () => {
    const adapter = new DiscordAdapter("fake-token");
    const handler = vi.fn();
    adapter.onMessage(handler);
    expect((adapter as any).messageHandler).toBe(handler);
  });

  it("should start and stop without error", async () => {
    const adapter = new DiscordAdapter("fake-token");
    await adapter.start();
    await adapter.stop();
  });

  it("should send messages to a channel", async () => {
    const adapter = new DiscordAdapter("fake-token");
    await adapter.start();
    await adapter.sendMessage("channel-123", "Hello from AgentPilot");
    const client = (adapter as any).client;
    expect(client.channels.fetch).toHaveBeenCalledWith("channel-123");
  });
});
