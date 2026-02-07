import { describe, it, expect, vi } from "vitest";
import { AnthropicAdapter } from "./anthropic.js";
import { ProviderError } from "@agentpilot/core";

// Mock the Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "Hello! How can I help?" }],
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      };
    },
  };
});

describe("AnthropicAdapter", () => {
  it("should have correct provider name", () => {
    const adapter = new AnthropicAdapter("test-key");
    expect(adapter.provider).toBe("anthropic");
  });

  it("should call chat and return formatted response", async () => {
    const adapter = new AnthropicAdapter("test-key");
    const response = await adapter.chat([
      { role: "user", content: "Hello" },
    ]);

    expect(response.content).toBe("Hello! How can I help?");
    expect(response.toolCalls).toEqual([]);
    expect(response.usage.inputTokens).toBe(10);
    expect(response.usage.outputTokens).toBe(20);
  });

  it("should handle system messages", async () => {
    const adapter = new AnthropicAdapter("test-key");
    const response = await adapter.chat([
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "Hello" },
    ]);

    expect(response.content).toBe("Hello! How can I help?");
  });

  it("should handle tool use responses", async () => {
    const { default: MockAnthropic } = await import("@anthropic-ai/sdk");
    const adapter = new AnthropicAdapter("test-key");

    // Override mock for tool use
    const mockInstance = (adapter as any).client;
    mockInstance.messages.create = vi.fn().mockResolvedValue({
      content: [
        { type: "text", text: "Let me search for that." },
        {
          type: "tool_use",
          id: "tool_123",
          name: "web_search",
          input: { query: "weather today" },
        },
      ],
      usage: { input_tokens: 15, output_tokens: 30 },
    });

    const response = await adapter.chat(
      [{ role: "user", content: "What's the weather?" }],
      [
        {
          name: "web_search",
          description: "Search the web",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
          },
        },
      ],
    );

    expect(response.content).toBe("Let me search for that.");
    expect(response.toolCalls).toHaveLength(1);
    expect(response.toolCalls[0].name).toBe("web_search");
    expect(response.toolCalls[0].arguments).toEqual({
      query: "weather today",
    });
  });

  it("should wrap errors in ProviderError", async () => {
    const adapter = new AnthropicAdapter("test-key");
    const mockInstance = (adapter as any).client;
    mockInstance.messages.create = vi
      .fn()
      .mockRejectedValue(new Error("Rate limited"));

    await expect(
      adapter.chat([{ role: "user", content: "Hello" }]),
    ).rejects.toThrow(ProviderError);
  });

  it("should stream responses", async () => {
    const adapter = new AnthropicAdapter("test-key");
    const responses: any[] = [];

    for await (const response of adapter.stream([
      { role: "user", content: "Hello" },
    ])) {
      responses.push(response);
    }

    expect(responses).toHaveLength(1);
    expect(responses[0].content).toBe("Hello! How can I help?");
  });
});
