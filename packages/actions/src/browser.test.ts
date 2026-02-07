import { describe, it, expect } from "vitest";
import { BrowserWorker } from "./browser.js";
import type { ActionRequest } from "@agentpilot/core";

function makeRequest(
  operation: string,
  params: Record<string, unknown> = {},
): ActionRequest {
  return {
    type: "browser",
    operation,
    params,
    sessionId: "sess-1",
    channelType: "telegram",
    channelId: "chat-1",
    userId: "user-1",
  };
}

describe("BrowserWorker", () => {
  const worker = new BrowserWorker();

  it("should return error when no URL provided", async () => {
    const result = await worker.execute(makeRequest("browse_web", {}));
    expect(result.success).toBe(false);
    expect(result.error).toContain("No URL");
  });

  it("should return error when no search query provided", async () => {
    const result = await worker.execute(makeRequest("web_search", {}));
    expect(result.success).toBe(false);
    expect(result.error).toContain("No search query");
  });

  it("should return error for unknown operation", async () => {
    const result = await worker.execute(makeRequest("screenshot", {}));
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown");
  });

  it("should provide tool definitions", () => {
    const tools = worker.getTools();
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toContain("browse_web");
    expect(tools.map((t) => t.name)).toContain("web_search");
  });

  it("should have ReadOnly permission level", () => {
    expect(worker.requiredLevel).toBe(0); // PermissionLevel.ReadOnly
  });
});
