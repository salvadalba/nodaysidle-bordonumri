import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentEngine, type AgentEvent } from "./agent.js";
import { createTestDb, type AgentPilotDb } from "@agentpilot/db";
import { PermissionLevel } from "@agentpilot/core";
import type { AgentPilotConfig } from "@agentpilot/core";

// Mock the AI provider module
vi.mock("@agentpilot/ai", () => {
  const mockChat = vi.fn();
  return {
    createProvider: vi.fn(() => ({
      provider: "anthropic",
      chat: mockChat,
      async *stream() {
        yield { content: "", toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 } };
      },
    })),
    _mockChat: mockChat,
  };
});

// Mock the action workers
vi.mock("@agentpilot/actions", () => {
  const makeWorker = (type: string, tools: string[]) => ({
    type,
    requiredLevel: 0,
    getTools: () =>
      tools.map((name) => ({
        name,
        description: `${name} tool`,
        parameters: {},
      })),
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: { result: `${type} executed` },
    }),
  });

  return {
    BrowserWorker: vi.fn(() => makeWorker("browser", ["browse_web", "web_search"])),
    EmailWorker: vi.fn(() => makeWorker("email", ["send_email", "read_emails"])),
    FilesWorker: vi.fn(() => makeWorker("files", ["read_file", "write_file", "list_files"])),
    NotesWorker: vi.fn(() => makeWorker("notes", ["create_note", "read_note", "list_notes"])),
    ShellWorker: vi.fn(() => makeWorker("shell", ["shell_exec"])),
  };
});

function getTestConfig(): AgentPilotConfig {
  return {
    ai: {
      primary: "anthropic",
      anthropicApiKey: "test-key",
      model: "claude-sonnet-4-5-20250929",
    },
    channels: {},
    permissions: {
      defaultLevel: PermissionLevel.Admin,
      channelOverrides: {},
    },
    server: { port: 3100, host: "127.0.0.1", dashboardPort: 3000 },
    database: { path: ":memory:" },
  };
}

describe("AgentEngine", () => {
  let db: AgentPilotDb;
  let engine: AgentEngine;
  let mockChat: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    db = createTestDb();
    const config = getTestConfig();
    engine = new AgentEngine(db, config);

    // Get the mock chat function
    const { _mockChat } = await import("@agentpilot/ai");
    mockChat = _mockChat as ReturnType<typeof vi.fn>;
    mockChat.mockReset();
  });

  it("should handle a simple text response with no tool calls", async () => {
    mockChat.mockResolvedValueOnce({
      content: "Hello! How can I help?",
      toolCalls: [],
      usage: { inputTokens: 100, outputTokens: 20 },
    });

    const replies: string[] = [];
    await engine.handleMessage(
      {
        id: "msg-1",
        channelType: "telegram",
        channelId: "chat-123",
        userId: "user-1",
        content: "Hello",
        timestamp: new Date(),
      },
      async (content) => {
        replies.push(content);
      },
    );

    expect(replies).toHaveLength(1);
    expect(replies[0]).toBe("Hello! How can I help?");
    expect(mockChat).toHaveBeenCalledTimes(1);
  });

  it("should execute tool calls and loop back to AI", async () => {
    // First call: AI wants to use a tool
    mockChat.mockResolvedValueOnce({
      content: "Let me check that for you.",
      toolCalls: [
        { id: "tc-1", name: "list_files", arguments: { path: "/home" } },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    // Second call: AI responds with final answer
    mockChat.mockResolvedValueOnce({
      content: "Here are your files: README.md, package.json",
      toolCalls: [],
      usage: { inputTokens: 200, outputTokens: 30 },
    });

    const replies: string[] = [];
    await engine.handleMessage(
      {
        id: "msg-2",
        channelType: "telegram",
        channelId: "chat-123",
        userId: "user-1",
        content: "List my files",
        timestamp: new Date(),
      },
      async (content) => {
        replies.push(content);
      },
    );

    expect(replies).toHaveLength(1);
    expect(replies[0]).toBe("Here are your files: README.md, package.json");
    expect(mockChat).toHaveBeenCalledTimes(2);
  });

  it("should emit events during message handling", async () => {
    mockChat.mockResolvedValueOnce({
      content: "Done!",
      toolCalls: [],
      usage: { inputTokens: 50, outputTokens: 10 },
    });

    const events: AgentEvent[] = [];
    engine.onEvent((event) => events.push(event));

    await engine.handleMessage(
      {
        id: "msg-3",
        channelType: "discord",
        channelId: "channel-1",
        userId: "user-2",
        content: "Hi",
        timestamp: new Date(),
      },
      async () => {},
    );

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].type).toBe("thinking");
    expect(events[1].type).toBe("response");
    expect(events[1].data.content).toBe("Done!");
  });

  it("should handle AI provider errors gracefully", async () => {
    mockChat.mockRejectedValueOnce(new Error("API rate limited"));

    const replies: string[] = [];
    await engine.handleMessage(
      {
        id: "msg-4",
        channelType: "telegram",
        channelId: "chat-123",
        userId: "user-1",
        content: "Do something",
        timestamp: new Date(),
      },
      async (content) => {
        replies.push(content);
      },
    );

    expect(replies).toHaveLength(1);
    expect(replies[0]).toContain("API rate limited");
  });

  it("should stop after max iterations", async () => {
    // Always return tool calls to force the loop to max out
    mockChat.mockResolvedValue({
      content: "Still working...",
      toolCalls: [
        { id: "tc-loop", name: "read_file", arguments: { path: "/tmp/test" } },
      ],
      usage: { inputTokens: 50, outputTokens: 20 },
    });

    const replies: string[] = [];
    await engine.handleMessage(
      {
        id: "msg-5",
        channelType: "telegram",
        channelId: "chat-123",
        userId: "user-1",
        content: "Keep going forever",
        timestamp: new Date(),
      },
      async (content) => {
        replies.push(content);
      },
    );

    expect(replies).toHaveLength(1);
    expect(replies[0]).toContain("maximum number of steps");
    expect(mockChat).toHaveBeenCalledTimes(10);
  });

  it("should create and reuse sessions for the same channel+user", async () => {
    mockChat.mockResolvedValue({
      content: "OK",
      toolCalls: [],
      usage: { inputTokens: 50, outputTokens: 10 },
    });

    const msg = {
      id: "msg-6",
      channelType: "telegram" as const,
      channelId: "chat-456",
      userId: "user-3",
      content: "First message",
      timestamp: new Date(),
    };

    await engine.handleMessage(msg, async () => {});
    await engine.handleMessage({ ...msg, id: "msg-7", content: "Second message" }, async () => {});

    // Both calls used the same session - the second call should have messages from the first
    const secondCallMessages = mockChat.mock.calls[1][0];
    // Should have system + first user msg + first assistant msg + second user msg
    expect(secondCallMessages.length).toBeGreaterThanOrEqual(3);
  });

  it("should handle unknown tool gracefully", async () => {
    mockChat
      .mockResolvedValueOnce({
        content: "",
        toolCalls: [
          { id: "tc-bad", name: "nonexistent_tool", arguments: {} },
        ],
        usage: { inputTokens: 50, outputTokens: 20 },
      })
      .mockResolvedValueOnce({
        content: "That tool doesn't exist.",
        toolCalls: [],
        usage: { inputTokens: 100, outputTokens: 10 },
      });

    const replies: string[] = [];
    await engine.handleMessage(
      {
        id: "msg-8",
        channelType: "telegram",
        channelId: "chat-123",
        userId: "user-1",
        content: "Use a fake tool",
        timestamp: new Date(),
      },
      async (content) => {
        replies.push(content);
      },
    );

    expect(replies).toHaveLength(1);
    // The AI should get the error result and respond
    expect(mockChat).toHaveBeenCalledTimes(2);
  });
});
