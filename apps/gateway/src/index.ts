import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { loadConfig, validateConfig } from "@agentpilot/core";
import { TelegramAdapter } from "@agentpilot/channels";
import { DiscordAdapter } from "@agentpilot/channels";
import { SimpleXAdapter } from "@agentpilot/channels";
import { getDb, runMigrations } from "@agentpilot/db";
import { getAuditLog } from "@agentpilot/db";
import { AgentEngine, type AgentEvent } from "./agent.js";
import { SchedulerEngine } from "./scheduler.js";
import type { ChannelAdapter, ChannelMessage } from "@agentpilot/core";
import type { WebSocket } from "ws";

const config = loadConfig();

// Validate config - warn on issues but don't crash (allow partial configs)
const configIssues = validateConfig(config);
if (configIssues.length > 0) {
  for (const issue of configIssues) {
    console.warn(`[Config] ${issue}`);
  }
}

// Ensure all tables exist before connecting
runMigrations(config.database.path);

const db = getDb(config.database.path);
const app = Fastify({ logger: true });

// Track connected dashboard WebSocket clients
const dashboardClients = new Set<WebSocket>();

// Initialize agent engine
let agent: AgentEngine | null = null;

if (config.ai.anthropicApiKey || config.ai.geminiApiKey || config.ai.openRouterApiKey) {
  agent = new AgentEngine(db, config);
  await agent.initSkills();

  // Forward agent events to dashboard + reload scheduler on task changes
  agent.onEvent((event: AgentEvent) => {
    const payload = JSON.stringify(event);
    for (const client of dashboardClients) {
      if (client.readyState === 1) {
        // OPEN
        client.send(payload);
      }
    }

    // Reload scheduler when tasks are created/cancelled
    if (
      event.type === "action" &&
      scheduler &&
      (event.data.tool === "schedule_task" || event.data.tool === "cancel_task")
    ) {
      // Reload after a short delay so the DB write completes first
      setTimeout(() => scheduler!.reload(), 500);
    }
  });
}

// Initialize channel adapters
const channels: ChannelAdapter[] = [];

if (config.channels.telegram?.botToken) {
  const telegram = new TelegramAdapter(config.channels.telegram.botToken);
  telegram.onMessage((msg) => handleIncomingMessage(msg, telegram));
  channels.push(telegram);
}

if (config.channels.discord?.botToken) {
  const discord = new DiscordAdapter(config.channels.discord.botToken);
  discord.onMessage((msg) => handleIncomingMessage(msg, discord));
  channels.push(discord);
}

if (config.channels.simplex?.cliPath) {
  const simplex = new SimpleXAdapter(config.channels.simplex.cliPath);
  simplex.onMessage((msg) => handleIncomingMessage(msg, simplex));
  channels.push(simplex);
}

// Initialize scheduler
let scheduler: SchedulerEngine | null = null;

if (agent) {
  scheduler = new SchedulerEngine({
    db,
    agent,
    log: (msg) => app.log.info(`[Scheduler] ${msg}`),
    logError: (msg) => app.log.error(`[Scheduler] ${msg}`),
    sendReply: async (channelType, channelId, content) => {
      const adapter = channels.find((c) => c.type === channelType);
      if (adapter) {
        await adapter.sendMessage(channelId, content);
      } else {
        app.log.error(`[Scheduler] No adapter found for channel type: ${channelType}`);
      }
    },
  });
}

async function handleIncomingMessage(
  message: ChannelMessage,
  adapter: ChannelAdapter,
) {
  if (!agent) {
    await adapter.sendMessage(
      message.channelId,
      "AgentPilot is not configured. Please set up an AI provider in the dashboard.",
    );
    return;
  }

  await agent.handleMessage(message, async (content: string) => {
    await adapter.sendMessage(message.channelId, content);
  });
}

// Register plugins
await app.register(cors, { origin: true });
await app.register(websocket);

// --- REST API ---

app.get("/health", async () => ({
  status: "ok",
  version: "0.1.0",
  channels: channels.map((c) => c.type),
  aiProvider: config.ai.primary,
  agentReady: agent !== null,
}));

app.get("/api/audit", async (request) => {
  const query = request.query as { limit?: string };
  const limit = parseInt(query.limit ?? "50", 10);
  return getAuditLog(db, limit);
});

app.get("/api/config", async () => ({
  ai: {
    primary: config.ai.primary,
    hasAnthropicKey: !!config.ai.anthropicApiKey,
    hasGeminiKey: !!config.ai.geminiApiKey,
  },
  channels: {
    telegram: !!config.channels.telegram?.botToken,
    discord: !!config.channels.discord?.botToken,
    simplex: !!config.channels.simplex?.cliPath,
  },
  server: config.server,
}));

app.get("/api/channels", async () =>
  channels.map((c) => ({
    type: c.type,
    connected: true,
  })),
);

// --- WebSocket for dashboard real-time updates ---

app.register(async (fastify) => {
  fastify.get("/ws", { websocket: true }, (socket, req) => {
    dashboardClients.add(socket);

    socket.on("close", () => {
      dashboardClients.delete(socket);
    });

    socket.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
        }
      } catch {
        // Ignore invalid messages
      }
    });

    // Send welcome
    socket.send(
      JSON.stringify({
        type: "connected",
        channels: channels.map((c) => c.type),
        agentReady: agent !== null,
      }),
    );
  });
});

// --- Start ---

const start = async () => {
  try {
    // Start all channel adapters
    for (const channel of channels) {
      try {
        await channel.start();
        app.log.info(`${channel.type} adapter started`);
      } catch (err) {
        app.log.error(err, `Failed to start ${channel.type}`);
      }
    }

    // Start scheduler after channels are ready
    if (scheduler) {
      scheduler.start();
    }

    await app.listen({ port: config.server.port, host: config.server.host });
    app.log.info(`AgentPilot Gateway running on http://${config.server.host}:${config.server.port}`);
    app.log.info(`Channels: ${channels.map((c) => c.type).join(", ") || "none configured"}`);
    app.log.info(`AI: ${config.ai.primary}${agent ? " (ready)" : " (no API key)"}`);
    app.log.info(`Scheduler: ${scheduler ? "active" : "disabled"}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  app.log.info("Shutting down...");
  if (scheduler) {
    scheduler.stop();
  }
  for (const channel of channels) {
    await channel.stop();
  }
  await app.close();
  process.exit(0);
});

start();
