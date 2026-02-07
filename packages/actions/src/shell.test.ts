import { describe, it, expect } from "vitest";
import { ShellWorker } from "./shell.js";
import { tmpdir } from "node:os";
import type { ActionRequest } from "@agentpilot/core";

function makeRequest(params: Record<string, unknown> = {}): ActionRequest {
  return {
    type: "shell",
    operation: "shell_exec",
    params,
    sessionId: "sess-1",
    channelType: "telegram",
    channelId: "chat-1",
    userId: "user-1",
  };
}

describe("ShellWorker", () => {
  const worker = new ShellWorker(tmpdir());

  it("should execute a simple command", async () => {
    const result = await worker.execute(makeRequest({ command: "echo hello" }));
    expect(result.success).toBe(true);
    expect((result.data as any).stdout).toBe("hello");
  });

  it("should capture stderr", async () => {
    const result = await worker.execute(
      makeRequest({ command: "echo error >&2" }),
    );
    expect(result.success).toBe(true);
    expect((result.data as any).stderr).toBe("error");
  });

  it("should return failure for missing command", async () => {
    const result = await worker.execute(makeRequest({}));
    expect(result.success).toBe(false);
    expect(result.error).toContain("No command");
  });

  it("should block rm -rf /", async () => {
    const result = await worker.execute(
      makeRequest({ command: "rm -rf /" }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("blocked");
  });

  it("should block sudo commands", async () => {
    const result = await worker.execute(
      makeRequest({ command: "sudo rm something" }),
    );
    expect(result.success).toBe(false);
    expect(result.confirmationRequired).toBe(true);
  });

  it("should block dd if= commands", async () => {
    const result = await worker.execute(
      makeRequest({ command: "dd if=/dev/zero of=/dev/sda" }),
    );
    expect(result.success).toBe(false);
  });

  it("should handle command failure gracefully", async () => {
    const result = await worker.execute(
      makeRequest({ command: "exit 1" }),
    );
    expect(result.success).toBe(false);
  });

  it("should respect custom cwd", async () => {
    const result = await worker.execute(
      makeRequest({ command: "pwd", cwd: tmpdir() }),
    );
    expect(result.success).toBe(true);
    // macOS resolves tmpdir to /private/var/folders/...
    expect((result.data as any).cwd).toBe(tmpdir());
  });

  it("should provide tool definitions", () => {
    const tools = worker.getTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("shell_exec");
  });

  it("should have Execute permission level", () => {
    expect(worker.requiredLevel).toBe(3); // PermissionLevel.Execute
  });
});
