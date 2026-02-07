import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiAdapter } from "./gemini.js";
import { ProviderError } from "@agentpilot/core";

// Shared mock function that all instances use
const mockSendMessage = vi.fn();

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class MockGoogleAI {
      getGenerativeModel() {
        return {
          startChat: () => ({
            sendMessage: mockSendMessage,
          }),
        };
      }
    },
  };
});

function defaultResponse() {
  return {
    response: {
      text: () => "Hello from Gemini!",
      candidates: [
        {
          content: {
            parts: [{ text: "Hello from Gemini!" }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 8,
        candidatesTokenCount: 15,
      },
    },
  };
}

describe("GeminiAdapter", () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
    mockSendMessage.mockResolvedValue(defaultResponse());
  });

  it("should have correct provider name", () => {
    const adapter = new GeminiAdapter("test-key");
    expect(adapter.provider).toBe("gemini");
  });

  it("should call chat and return formatted response", async () => {
    const adapter = new GeminiAdapter("test-key");
    const response = await adapter.chat([
      { role: "user", content: "Hello" },
    ]);

    expect(response.content).toBe("Hello from Gemini!");
    expect(response.toolCalls).toEqual([]);
    expect(response.usage.inputTokens).toBe(8);
    expect(response.usage.outputTokens).toBe(15);
  });

  it("should handle system messages", async () => {
    const adapter = new GeminiAdapter("test-key");
    const response = await adapter.chat([
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" },
    ]);

    expect(response.content).toBe("Hello from Gemini!");
  });

  it("should handle function call responses", async () => {
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => "",
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "web_search",
                    args: { query: "weather today" },
                  },
                },
              ],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
        },
      },
    });

    const adapter = new GeminiAdapter("test-key");
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

    expect(response.toolCalls).toHaveLength(1);
    expect(response.toolCalls[0].name).toBe("web_search");
    expect(response.toolCalls[0].arguments).toEqual({ query: "weather today" });
  });

  it("should wrap errors in ProviderError", async () => {
    mockSendMessage.mockRejectedValue(new Error("Quota exceeded"));

    const adapter = new GeminiAdapter("test-key");
    await expect(
      adapter.chat([{ role: "user", content: "Hello" }]),
    ).rejects.toThrow(ProviderError);
  });

  it("should stream responses", async () => {
    const adapter = new GeminiAdapter("test-key");
    const responses: any[] = [];

    for await (const response of adapter.stream([
      { role: "user", content: "Hello" },
    ])) {
      responses.push(response);
    }

    expect(responses).toHaveLength(1);
    expect(responses[0].content).toBe("Hello from Gemini!");
  });
});
