import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  channelType: text("channel_type").notNull(),
  channelId: text("channel_id").notNull(),
  userId: text("user_id").notNull(),
  metadata: text("metadata", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  role: text("role").notNull(), // user | assistant | system
  content: text("content").notNull(),
  toolCalls: text("tool_calls", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey(),
  channelType: text("channel_type").notNull(),
  channelId: text("channel_id").notNull(),
  userId: text("user_id"),
  actionType: text("action_type").notNull(),
  level: integer("level").notNull(), // 0-4 PermissionLevel enum
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id),
  channelType: text("channel_type").notNull(),
  channelId: text("channel_id").notNull(),
  userId: text("user_id").notNull(),
  actionType: text("action_type").notNull(),
  operation: text("operation").notNull(),
  input: text("input", { mode: "json" }),
  output: text("output", { mode: "json" }),
  permissionLevel: integer("permission_level").notNull(),
  confirmationRequired: integer("confirmation_required", {
    mode: "boolean",
  }).notNull(),
  confirmed: integer("confirmed", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const workflows = sqliteTable("workflows", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  steps: text("steps", { mode: "json" }).notNull(),
  trigger: text("trigger"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(), // encrypted at rest
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
