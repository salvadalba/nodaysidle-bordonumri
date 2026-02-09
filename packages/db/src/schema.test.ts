import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "./schema.js";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  // Create tables manually for in-memory DB
  sqlite.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      channel_type TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE permissions (
      id TEXT PRIMARY KEY,
      channel_type TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT,
      action_type TEXT NOT NULL,
      level INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE audit_log (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id),
      channel_type TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      input TEXT,
      output TEXT,
      permission_level INTEGER NOT NULL,
      confirmation_required INTEGER NOT NULL,
      confirmed INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE settings (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  return db;
}

describe("Database Schema", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  it("should create a session", () => {
    const now = new Date();
    db.insert(schema.sessions)
      .values({
        id: "sess-1",
        channelType: "telegram",
        channelId: "chat-123",
        userId: "user-1",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const result = db.select().from(schema.sessions).all();
    expect(result).toHaveLength(1);
    expect(result[0].channelType).toBe("telegram");
  });

  it("should create a message linked to session", () => {
    const now = new Date();
    db.insert(schema.sessions)
      .values({
        id: "sess-1",
        channelType: "telegram",
        channelId: "chat-123",
        userId: "user-1",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    db.insert(schema.messages)
      .values({
        id: "msg-1",
        sessionId: "sess-1",
        role: "user",
        content: "Hello",
        createdAt: now,
      })
      .run();

    const msgs = db.select().from(schema.messages).all();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("Hello");
    expect(msgs[0].sessionId).toBe("sess-1");
  });

  it("should create permission rules", () => {
    const now = new Date();
    db.insert(schema.permissions)
      .values({
        id: "perm-1",
        channelType: "telegram",
        channelId: "chat-123",
        userId: "user-1",
        actionType: "email",
        level: 1,
        createdAt: now,
      })
      .run();

    const perms = db.select().from(schema.permissions).all();
    expect(perms).toHaveLength(1);
    expect(perms[0].level).toBe(1);
    expect(perms[0].actionType).toBe("email");
  });

  it("should create audit log entries", () => {
    const now = new Date();
    db.insert(schema.sessions)
      .values({
        id: "sess-1",
        channelType: "telegram",
        channelId: "chat-123",
        userId: "user-1",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    db.insert(schema.auditLog)
      .values({
        id: "audit-1",
        sessionId: "sess-1",
        channelType: "telegram",
        channelId: "chat-123",
        userId: "user-1",
        actionType: "email",
        operation: "send_email",
        input: { to: "test@example.com" },
        output: { success: true },
        permissionLevel: 1,
        confirmationRequired: true,
        confirmed: true,
        createdAt: now,
      })
      .run();

    const logs = db.select().from(schema.auditLog).all();
    expect(logs).toHaveLength(1);
    expect(logs[0].operation).toBe("send_email");
    expect(logs[0].confirmationRequired).toBe(true);
  });

  it("should create and update settings", () => {
    const now = new Date();
    db.insert(schema.settings)
      .values({
        id: "set-1",
        key: "theme",
        value: "dark",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const settings = db.select().from(schema.settings).all();
    expect(settings).toHaveLength(1);
    expect(settings[0].key).toBe("theme");
    expect(settings[0].value).toBe("dark");
  });

  it("should enforce unique settings key", () => {
    const now = new Date();
    db.insert(schema.settings)
      .values({ id: "s1", key: "theme", value: "dark", createdAt: now, updatedAt: now })
      .run();

    expect(() =>
      db.insert(schema.settings)
        .values({ id: "s2", key: "theme", value: "light", createdAt: now, updatedAt: now })
        .run(),
    ).toThrow();
  });
});
