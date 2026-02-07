import { describe, it, expect, vi } from "vitest";

// Mock grammY before importing adapter
vi.mock("grammy", () => ({
  Bot: class MockBot {
    api = {
      sendMessage: vi.fn().mockResolvedValue({}),
    };
    handlers: Record<string, Function> = {};
    on(event: string, handler: Function) {
      this.handlers[event] = handler;
    }
    start() {}
    stop() {}
  },
}));

import { TelegramAdapter } from "./telegram.js";

describe("TelegramAdapter", () => {
  it("should have correct type", () => {
    const adapter = new TelegramAdapter("fake-token");
    expect(adapter.type).toBe("telegram");
  });

  it("should register message handler", () => {
    const adapter = new TelegramAdapter("fake-token");
    const handler = vi.fn();
    adapter.onMessage(handler);
    // Handler is stored internally
    expect((adapter as any).messageHandler).toBe(handler);
  });

  it("should start and stop without error", async () => {
    const adapter = new TelegramAdapter("fake-token");
    await adapter.start();
    await adapter.stop();
  });

  it("should send messages via bot API", async () => {
    const adapter = new TelegramAdapter("fake-token");
    await adapter.start();
    await adapter.sendMessage("12345", "Hello from AgentPilot");
    const bot = (adapter as any).bot;
    expect(bot.api.sendMessage).toHaveBeenCalledWith(12345, "Hello from AgentPilot", {
      parse_mode: "Markdown",
    });
  });
});
