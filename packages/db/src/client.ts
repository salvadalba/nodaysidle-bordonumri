import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

let db: ReturnType<typeof drizzle> | null = null;

export function getDb(dbPath?: string) {
  if (db) return db;
  const path = dbPath ?? ":memory:";
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  return db;
}

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const testDb = drizzle(sqlite, { schema });
  return testDb;
}

export function resetDb() {
  db = null;
}

export type AgentPilotDb = ReturnType<typeof getDb>;
