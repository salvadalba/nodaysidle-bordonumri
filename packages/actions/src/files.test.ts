import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FilesWorker } from "./files.js";
import { mkdtempSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ActionRequest } from "@agentpilot/core";

function makeRequest(
  operation: string,
  params: Record<string, unknown> = {},
): ActionRequest {
  return {
    type: "files",
    operation,
    params,
    sessionId: "sess-1",
    channelType: "telegram",
    channelId: "chat-1",
    userId: "user-1",
  };
}

describe("FilesWorker", () => {
  let testDir: string;
  let worker: FilesWorker;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "agentpilot-test-"));
    worker = new FilesWorker(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("read_file", () => {
    it("should read a file", async () => {
      writeFileSync(join(testDir, "test.txt"), "hello world");
      const result = await worker.execute(
        makeRequest("read_file", { path: "test.txt" }),
      );
      expect(result.success).toBe(true);
      expect((result.data as any).content).toBe("hello world");
    });

    it("should fail for nonexistent file", async () => {
      const result = await worker.execute(
        makeRequest("read_file", { path: "nope.txt" }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("write_file", () => {
    it("should write a file", async () => {
      const result = await worker.execute(
        makeRequest("write_file", { path: "out.txt", content: "hello" }),
      );
      expect(result.success).toBe(true);
      expect(existsSync(join(testDir, "out.txt"))).toBe(true);
    });

    it("should create nested directories", async () => {
      const result = await worker.execute(
        makeRequest("write_file", {
          path: "sub/dir/file.txt",
          content: "nested",
        }),
      );
      expect(result.success).toBe(true);
      expect(existsSync(join(testDir, "sub/dir/file.txt"))).toBe(true);
    });
  });

  describe("list_files", () => {
    it("should list files in directory", async () => {
      writeFileSync(join(testDir, "a.txt"), "a");
      writeFileSync(join(testDir, "b.txt"), "b");
      mkdirSync(join(testDir, "subdir"));

      const result = await worker.execute(
        makeRequest("list_files", { path: "." }),
      );
      expect(result.success).toBe(true);
      const entries = (result.data as any).entries;
      expect(entries).toHaveLength(3);
      expect(entries.find((e: any) => e.name === "subdir").type).toBe(
        "directory",
      );
    });

    it("should fail for nonexistent directory", async () => {
      const result = await worker.execute(
        makeRequest("list_files", { path: "nope" }),
      );
      expect(result.success).toBe(false);
    });
  });

  describe("move_file", () => {
    it("should move a file", async () => {
      writeFileSync(join(testDir, "src.txt"), "content");
      const result = await worker.execute(
        makeRequest("move_file", { from: "src.txt", to: "dst.txt" }),
      );
      expect(result.success).toBe(true);
      expect(existsSync(join(testDir, "dst.txt"))).toBe(true);
      expect(existsSync(join(testDir, "src.txt"))).toBe(false);
    });
  });

  describe("delete_file", () => {
    it("should require confirmation", async () => {
      writeFileSync(join(testDir, "del.txt"), "bye");
      const result = await worker.execute(
        makeRequest("delete_file", { path: "del.txt" }),
      );
      expect(result.success).toBe(true);
      expect(result.confirmationRequired).toBe(true);
      // File should NOT be deleted yet (confirmation required)
      expect(existsSync(join(testDir, "del.txt"))).toBe(true);
    });
  });

  describe("path traversal protection", () => {
    it("should block path traversal with ..", async () => {
      const result = await worker.execute(
        makeRequest("read_file", { path: "../../etc/passwd" }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("traversal");
    });
  });

  describe("unknown operation", () => {
    it("should return error", async () => {
      const result = await worker.execute(makeRequest("banana", {}));
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown");
    });
  });

  it("should provide tool definitions", () => {
    const tools = worker.getTools();
    expect(tools).toHaveLength(5);
    expect(tools.map((t) => t.name)).toContain("read_file");
    expect(tools.map((t) => t.name)).toContain("write_file");
    expect(tools.map((t) => t.name)).toContain("delete_file");
  });
});
