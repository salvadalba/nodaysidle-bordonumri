import { describe, it, expect } from "vitest";
import { createProvider } from "./provider.js";

describe("createProvider", () => {
  it("should create an Anthropic adapter", () => {
    const provider = createProvider("anthropic", "test-key");
    expect(provider.provider).toBe("anthropic");
  });

  it("should create a Gemini adapter", () => {
    const provider = createProvider("gemini", "test-key");
    expect(provider.provider).toBe("gemini");
  });

  it("should throw for unknown provider", () => {
    expect(() => createProvider("unknown" as any, "test-key")).toThrow(
      "Unknown provider",
    );
  });

  it("should accept custom model", () => {
    const provider = createProvider("anthropic", "test-key", "claude-opus-4-6");
    expect(provider.provider).toBe("anthropic");
  });
});
