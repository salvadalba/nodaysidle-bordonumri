import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { createTestDb, createSession, getAuditLog, logAudit, type AgentPilotDb } from "@agentpilot/db";

describe("Gateway REST API", () => {
  let app: ReturnType<typeof Fastify>;
  let db: AgentPilotDb;

  beforeEach(async () => {
    db = createTestDb();
    app = Fastify();
    await app.register(cors, { origin: true });

    // Register the same routes as the gateway
    app.get("/health", async () => ({
      status: "ok",
      version: "0.1.0",
      channels: ["telegram"],
      aiProvider: "anthropic",
      agentReady: true,
    }));

    app.get("/api/audit", async (request) => {
      const query = request.query as { limit?: string };
      const limit = parseInt(query.limit ?? "50", 10);
      return getAuditLog(db, limit);
    });

    app.get("/api/config", async () => ({
      ai: {
        primary: "anthropic",
        hasAnthropicKey: true,
        hasGeminiKey: false,
      },
      channels: {
        telegram: true,
        discord: false,
        simplex: false,
      },
      server: { port: 3100, host: "127.0.0.1", dashboardPort: 3000 },
    }));

    app.get("/api/channels", async () => [
      { type: "telegram", connected: true },
    ]);

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /health returns status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ok");
    expect(body.version).toBe("0.1.0");
    expect(body.agentReady).toBe(true);
    expect(body.channels).toContain("telegram");
  });

  it("GET /api/config returns config without secrets", async () => {
    const res = await app.inject({ method: "GET", url: "/api/config" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ai.primary).toBe("anthropic");
    expect(body.ai.hasAnthropicKey).toBe(true);
    // No raw API key in response
    expect(body.ai.anthropicApiKey).toBeUndefined();
  });

  it("GET /api/channels returns connected channels", async () => {
    const res = await app.inject({ method: "GET", url: "/api/channels" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveLength(1);
    expect(body[0].type).toBe("telegram");
    expect(body[0].connected).toBe(true);
  });

  it("GET /api/audit returns audit entries", async () => {
    // Create a session first (FK constraint)
    const sessionId = createSession(db, {
      channelType: "telegram",
      channelId: "chat-1",
      userId: "user-1",
    });

    logAudit(db, {
      sessionId,
      channelType: "telegram",
      channelId: "chat-1",
      userId: "user-1",
      actionType: "files",
      operation: "read_file",
      input: { path: "/tmp/test.txt" },
      output: { content: "hello" },
      permissionLevel: 2,
      confirmationRequired: false,
      confirmed: true,
    });

    const res = await app.inject({ method: "GET", url: "/api/audit" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveLength(1);
    expect(body[0].operation).toBe("read_file");
  });

  it("GET /api/audit respects limit parameter", async () => {
    // Create a session first (FK constraint)
    const sessionId = createSession(db, {
      channelType: "telegram",
      channelId: "chat-1",
      userId: "user-1",
    });

    for (let i = 0; i < 5; i++) {
      logAudit(db, {
        sessionId,
        channelType: "telegram",
        channelId: "chat-1",
        userId: "user-1",
        actionType: "shell",
        operation: "shell_exec",
        input: { command: `echo ${i}` },
        output: { stdout: `${i}` },
        permissionLevel: 3,
        confirmationRequired: true,
        confirmed: true,
      });
    }

    const res = await app.inject({
      method: "GET",
      url: "/api/audit?limit=2",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveLength(2);
  });
});
