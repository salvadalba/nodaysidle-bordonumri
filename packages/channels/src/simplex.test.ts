import { describe, it, expect, vi } from "vitest";
import { SimpleXAdapter } from "./simplex.js";

describe("SimpleXAdapter", () => {
  it("should have correct type", () => {
    const adapter = new SimpleXAdapter("/usr/local/bin/simplex-chat");
    expect(adapter.type).toBe("simplex");
  });

  it("should register message handler", () => {
    const adapter = new SimpleXAdapter();
    const handler = vi.fn();
    adapter.onMessage(handler);
    expect((adapter as any).messageHandler).toBe(handler);
  });

  it("should throw when sending without running process", async () => {
    const adapter = new SimpleXAdapter();
    await expect(
      adapter.sendMessage("chat-1", "hello"),
    ).rejects.toThrow("SimpleX process not running");
  });

  it("should stop cleanly when not started", async () => {
    const adapter = new SimpleXAdapter();
    await adapter.stop(); // Should not throw
  });
});
