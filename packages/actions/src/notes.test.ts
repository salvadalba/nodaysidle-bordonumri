import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NotesWorker } from "./notes.js";
import { mkdtempSync, rmSync } from "node:fs";
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

describe("NotesWorker", () => {
  let testDir: string;
  let worker: NotesWorker;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "agentpilot-notes-"));
    worker = new NotesWorker(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("create_note", () => {
    it("should create a note", async () => {
      const result = await worker.execute(
        makeRequest("create_note", { name: "shopping", content: "Buy milk" }),
      );
      expect(result.success).toBe(true);
      expect((result.data as any).name).toBe("shopping");
    });

    it("should fail without name", async () => {
      const result = await worker.execute(
        makeRequest("create_note", { content: "orphan" }),
      );
      expect(result.success).toBe(false);
    });
  });

  describe("read_note", () => {
    it("should read an existing note", async () => {
      await worker.execute(
        makeRequest("create_note", { name: "todo", content: "Do laundry" }),
      );
      const result = await worker.execute(
        makeRequest("read_note", { name: "todo" }),
      );
      expect(result.success).toBe(true);
      expect((result.data as any).content).toContain("Do laundry");
    });

    it("should fail for nonexistent note", async () => {
      const result = await worker.execute(
        makeRequest("read_note", { name: "ghost" }),
      );
      expect(result.success).toBe(false);
    });
  });

  describe("append_note", () => {
    it("should append to an existing note", async () => {
      await worker.execute(
        makeRequest("create_note", { name: "log", content: "Entry 1" }),
      );
      await worker.execute(
        makeRequest("append_note", { name: "log", content: "Entry 2" }),
      );
      const result = await worker.execute(
        makeRequest("read_note", { name: "log" }),
      );
      expect((result.data as any).content).toContain("Entry 1");
      expect((result.data as any).content).toContain("Entry 2");
    });

    it("should fail for nonexistent note", async () => {
      const result = await worker.execute(
        makeRequest("append_note", { name: "nope", content: "hello" }),
      );
      expect(result.success).toBe(false);
    });
  });

  describe("list_notes", () => {
    it("should list all notes", async () => {
      await worker.execute(
        makeRequest("create_note", { name: "a", content: "first" }),
      );
      await worker.execute(
        makeRequest("create_note", { name: "b", content: "second" }),
      );
      const result = await worker.execute(makeRequest("list_notes"));
      expect(result.success).toBe(true);
      expect((result.data as any).count).toBe(2);
    });

    it("should return empty list when no notes", async () => {
      const result = await worker.execute(makeRequest("list_notes"));
      expect(result.success).toBe(true);
      expect((result.data as any).count).toBe(0);
    });
  });

  describe("search_notes", () => {
    it("should find notes containing query", async () => {
      await worker.execute(
        makeRequest("create_note", { name: "recipe", content: "pasta with garlic" }),
      );
      await worker.execute(
        makeRequest("create_note", { name: "todo", content: "buy bread" }),
      );
      const result = await worker.execute(
        makeRequest("search_notes", { query: "garlic" }),
      );
      expect(result.success).toBe(true);
      expect((result.data as any).count).toBe(1);
      expect((result.data as any).matches[0].name).toBe("recipe");
    });

    it("should return empty for no matches", async () => {
      await worker.execute(
        makeRequest("create_note", { name: "a", content: "hello" }),
      );
      const result = await worker.execute(
        makeRequest("search_notes", { query: "zzzzzz" }),
      );
      expect(result.success).toBe(true);
      expect((result.data as any).count).toBe(0);
    });
  });

  it("should provide tool definitions", () => {
    const tools = worker.getTools();
    expect(tools).toHaveLength(5);
    expect(tools.map((t) => t.name)).toContain("create_note");
    expect(tools.map((t) => t.name)).toContain("search_notes");
  });
});
