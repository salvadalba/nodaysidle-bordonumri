import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { AgentPilotDb } from "./client.js";
import {
  sessions,
  messages,
  permissions,
  auditLog,
  settings,
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

export function getMessages(db: AgentPilotDb, sessionId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.createdAt)
    .all();
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
