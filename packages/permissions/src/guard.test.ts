import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@agentpilot/db/src/schema.js";
import { setPermission } from "@agentpilot/db/src/queries.js";
import { PermissionGuard } from "./guard.js";
import {
  PermissionLevel,
  PermissionDeniedError,
  type ActionRequest,
} from "@agentpilot/core";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  sqlite.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY, channel_type TEXT NOT NULL, channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL, metadata TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE messages (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
      role TEXT NOT NULL, content TEXT NOT NULL, tool_calls TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE permissions (
      id TEXT PRIMARY KEY, channel_type TEXT NOT NULL, channel_id TEXT NOT NULL,
      user_id TEXT, action_type TEXT NOT NULL, level INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE audit_log (
      id TEXT PRIMARY KEY, session_id TEXT REFERENCES sessions(id),
      channel_type TEXT NOT NULL, channel_id TEXT NOT NULL, user_id TEXT NOT NULL,
      action_type TEXT NOT NULL, operation TEXT NOT NULL, input TEXT, output TEXT,
      permission_level INTEGER NOT NULL, confirmation_required INTEGER NOT NULL,
      confirmed INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE settings (
      id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, value TEXT NOT NULL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
  `);

  return db;
}

function makeRequest(overrides: Partial<ActionRequest> = {}): ActionRequest {
  return {
    type: "browser",
    operation: "browse_web",
    params: {},
    sessionId: "sess-1",
    channelType: "telegram",
    channelId: "chat-123",
    userId: "user-1",
    ...overrides,
  };
}

describe("PermissionGuard", () => {
  let db: ReturnType<typeof createTestDb>;
  let guard: PermissionGuard;

  beforeEach(() => {
    db = createTestDb();
    guard = new PermissionGuard(db, PermissionLevel.ReadOnly);
  });

  describe("check()", () => {
    it("should allow browser access at ReadOnly level", async () => {
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        actionType: "browser",
        level: PermissionLevel.ReadOnly,
      });

      const result = await guard.check(makeRequest({ type: "browser" }));
      expect(result.allowed).toBe(true);
      expect(result.confirmationRequired).toBe(false);
    });

    it("should deny email at ReadOnly level", async () => {
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        actionType: "email",
        level: PermissionLevel.ReadOnly,
      });

      await expect(
        guard.check(makeRequest({ type: "email" })),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it("should allow email at Communicate level", async () => {
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        actionType: "email",
        level: PermissionLevel.Communicate,
      });

      const result = await guard.check(makeRequest({ type: "email" }));
      expect(result.allowed).toBe(true);
    });

    it("should deny files at ReadOnly level", async () => {
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        actionType: "files",
        level: PermissionLevel.ReadOnly,
      });

      await expect(
        guard.check(makeRequest({ type: "files" })),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it("should allow files at Modify level", async () => {
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        actionType: "files",
        level: PermissionLevel.Modify,
      });

      const result = await guard.check(makeRequest({ type: "files" }));
      expect(result.allowed).toBe(true);
    });

    it("should deny shell at Modify level", async () => {
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        actionType: "shell",
        level: PermissionLevel.Modify,
      });

      await expect(
        guard.check(makeRequest({ type: "shell" })),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it("should allow shell at Execute level", async () => {
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        actionType: "shell",
        level: PermissionLevel.Execute,
      });

      const result = await guard.check(makeRequest({ type: "shell" }));
      expect(result.allowed).toBe(true);
    });

    it("should require confirmation for destructive operations", async () => {
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        actionType: "files",
        level: PermissionLevel.Modify,
      });

      const result = await guard.check(
        makeRequest({ type: "files", operation: "delete_file" }),
      );
      expect(result.allowed).toBe(true);
      expect(result.confirmationRequired).toBe(true);
      expect(result.confirmationMessage).toContain("confirmation");
    });

    it("should require confirmation for send_email", async () => {
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        actionType: "email",
        level: PermissionLevel.Communicate,
      });

      const result = await guard.check(
        makeRequest({ type: "email", operation: "send_email" }),
      );
      expect(result.confirmationRequired).toBe(true);
    });

    it("should require confirmation for shell_exec", async () => {
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        actionType: "shell",
        level: PermissionLevel.Execute,
      });

      const result = await guard.check(
        makeRequest({ type: "shell", operation: "shell_exec" }),
      );
      expect(result.confirmationRequired).toBe(true);
    });

    it("should use default level when no permission set", async () => {
      // Default is ReadOnly, browser requires ReadOnly -> should pass
      const result = await guard.check(makeRequest({ type: "browser" }));
      expect(result.allowed).toBe(true);
    });

    it("should deny when default level is insufficient", async () => {
      // Default is ReadOnly, shell requires Execute -> should fail
      await expect(
        guard.check(makeRequest({ type: "shell" })),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  describe("per-user permissions", () => {
    it("should prioritize user-specific over channel-level", async () => {
      // Channel level: ReadOnly for shell
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        actionType: "shell",
        level: PermissionLevel.ReadOnly,
      });

      // User-specific: Execute for shell
      setPermission(db, {
        channelType: "telegram",
        channelId: "chat-123",
        userId: "user-1",
        actionType: "shell",
        level: PermissionLevel.Execute,
      });

      const result = await guard.check(
        makeRequest({ type: "shell", userId: "user-1" }),
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("different channels have different permissions", () => {
    it("should scope permissions per channel", async () => {
      // Telegram: Execute level for shell
      setPermission(db, {
        channelType: "telegram",
        channelId: "tg-123",
        actionType: "shell",
        level: PermissionLevel.Execute,
      });

      // Discord: ReadOnly level for shell
      setPermission(db, {
        channelType: "discord",
        channelId: "dc-456",
        actionType: "shell",
        level: PermissionLevel.ReadOnly,
      });

      // Telegram should work
      const tgResult = await guard.check(
        makeRequest({
          type: "shell",
          channelType: "telegram",
          channelId: "tg-123",
        }),
      );
      expect(tgResult.allowed).toBe(true);

      // Discord should fail
      await expect(
        guard.check(
          makeRequest({
            type: "shell",
            channelType: "discord",
            channelId: "dc-456",
          }),
        ),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  describe("Admin level", () => {
    it("should allow everything at Admin level", async () => {
      for (const actionType of ["browser", "email", "files", "shell"] as const) {
        setPermission(db, {
          channelType: "telegram",
          channelId: "chat-123",
          actionType,
          level: PermissionLevel.Admin,
        });
      }

      for (const type of ["browser", "email", "files", "shell"] as const) {
        const result = await guard.check(makeRequest({ type }));
        expect(result.allowed).toBe(true);
      }
    });
  });
});
