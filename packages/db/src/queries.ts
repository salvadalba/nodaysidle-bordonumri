import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { AgentPilotDb } from "./client.js";
import {
  sessions,
  messages,
  permissions,
  auditLog,
  settings,
  scheduledTasks,
} from "./schema.js";
import type {
  ChannelType,
  ActionType,
  PermissionLevel,
} from "@agentpilot/core";

// --- Sessions ---

export function createSession(
  db: AgentPilotDb,
  data: { channelType: ChannelType; channelId: string; userId: string },
) {
  const now = new Date();
  const id = randomUUID();
  db.insert(sessions).values({
    id,
    channelType: data.channelType,
    channelId: data.channelId,
    userId: data.userId,
    createdAt: now,
    updatedAt: now,
  }).run();
  return id;
}

export function getSession(db: AgentPilotDb, id: string) {
  return db.select().from(sessions).where(eq(sessions.id, id)).get();
}

export function getSessionByChannel(
  db: AgentPilotDb,
  channelType: ChannelType,
  channelId: string,
  userId: string,
) {
  return db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.channelType, channelType),
        eq(sessions.channelId, channelId),
        eq(sessions.userId, userId),
      ),
    )
    .get();
}

// --- Messages ---

export function addMessage(
  db: AgentPilotDb,
  data: {
    sessionId: string;
    role: "user" | "assistant" | "system";
    content: string;
    toolCalls?: unknown;
  },
) {
  const id = randomUUID();
  db.insert(messages).values({
    id,
    sessionId: data.sessionId,
    role: data.role,
    content: data.content,
    toolCalls: data.toolCalls ?? null,
    createdAt: new Date(),
  }).run();
  return id;
}

export function getMessages(db: AgentPilotDb, sessionId: string, limit = 100) {
  // Get the most recent N messages, then return in chronological order
  const rows = db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .all();
  return rows.reverse();
}

// --- Permissions ---

export function setPermission(
  db: AgentPilotDb,
  data: {
    channelType: ChannelType;
    channelId: string;
    userId?: string;
    actionType: ActionType;
    level: PermissionLevel;
  },
) {
  const id = randomUUID();
  db.insert(permissions).values({
    id,
    channelType: data.channelType,
    channelId: data.channelId,
    userId: data.userId ?? null,
    actionType: data.actionType,
    level: data.level,
    createdAt: new Date(),
  }).run();
  return id;
}

export function getPermission(
  db: AgentPilotDb,
  channelType: ChannelType,
  channelId: string,
  userId: string,
  actionType: ActionType,
) {
  // Check user-specific permission first
  const userPerm = db
    .select()
    .from(permissions)
    .where(
      and(
        eq(permissions.channelType, channelType),
        eq(permissions.channelId, channelId),
        eq(permissions.userId, userId),
        eq(permissions.actionType, actionType),
      ),
    )
    .get();
  if (userPerm) return userPerm;

  // Fall back to channel-level permission
  return db
    .select()
    .from(permissions)
    .where(
      and(
        eq(permissions.channelType, channelType),
        eq(permissions.channelId, channelId),
        eq(permissions.actionType, actionType),
      ),
    )
    .get();
}

// --- Audit Log ---

export function logAudit(
  db: AgentPilotDb,
  data: {
    sessionId?: string;
    channelType: ChannelType;
    channelId: string;
    userId: string;
    actionType: ActionType;
    operation: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    permissionLevel: PermissionLevel;
    confirmationRequired: boolean;
    confirmed: boolean;
  },
) {
  const id = randomUUID();
  db.insert(auditLog).values({
    id,
    sessionId: data.sessionId ?? null,
    channelType: data.channelType,
    channelId: data.channelId,
    userId: data.userId,
    actionType: data.actionType,
    operation: data.operation,
    input: data.input,
    output: data.output,
    permissionLevel: data.permissionLevel,
    confirmationRequired: data.confirmationRequired,
    confirmed: data.confirmed,
    createdAt: new Date(),
  }).run();
  return id;
}

export function getAuditLog(db: AgentPilotDb, limit = 50) {
  return db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .all();
}

// --- Settings ---

export function setSetting(db: AgentPilotDb, key: string, value: string) {
  const now = new Date();
  const existing = db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .get();

  if (existing) {
    db.update(settings)
      .set({ value, updatedAt: now })
      .where(eq(settings.key, key))
      .run();
    return existing.id;
  }

  const id = randomUUID();
  db.insert(settings).values({
    id,
    key,
    value,
    createdAt: now,
    updatedAt: now,
  }).run();
  return id;
}

export function getSetting(db: AgentPilotDb, key: string) {
  return db.select().from(settings).where(eq(settings.key, key)).get();
}

// --- Scheduled Tasks ---

export function createScheduledTask(
  db: AgentPilotDb,
  data: {
    name: string;
    cronExpression: string;
    prompt: string;
    channelType: string;
    channelId: string;
    userId: string;
  },
) {
  const id = randomUUID();
  db.insert(scheduledTasks).values({
    id,
    name: data.name,
    cronExpression: data.cronExpression,
    prompt: data.prompt,
    channelType: data.channelType,
    channelId: data.channelId,
    userId: data.userId,
    enabled: true,
    createdAt: new Date(),
  }).run();
  return id;
}

export function getScheduledTasks(db: AgentPilotDb) {
  return db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.enabled, true))
    .all();
}

export function getAllScheduledTasks(db: AgentPilotDb, userId?: string) {
  if (userId) {
    return db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.userId, userId))
      .all();
  }
  return db.select().from(scheduledTasks).all();
}

export function deleteScheduledTask(db: AgentPilotDb, id: string) {
  db.delete(scheduledTasks).where(eq(scheduledTasks.id, id)).run();
}

export function updateScheduledTaskLastRun(db: AgentPilotDb, id: string) {
  db.update(scheduledTasks)
    .set({ lastRun: new Date() })
    .where(eq(scheduledTasks.id, id))
    .run();
}
