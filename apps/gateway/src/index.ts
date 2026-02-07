import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { loadConfig } from "@agentpilot/core";
import { TelegramAdapter } from "@agentpilot/channels";
import { DiscordAdapter } from "@agentpilot/channels";
import { SimpleXAdapter } from "@agentpilot/channels";
import { getDb, runMigrations } from "@agentpilot/db";
import { getAuditLog } from "@agentpilot/db";
import { AgentEngine, type AgentEvent } from "./agent.js";
import type { ChannelAdapter, ChannelMessage } from "@agentpilot/core";
import type { WebSocket } from "ws";

const config = loadConfig();

// Ensure all tables exist before connecting
runMigrations(config.database.path);

const db = getDb(config.database.path);
const app = Fastify({ logger: true });

// Track connected dashboard WebSocket clients
const dashboardClients = new Set<WebSocket>();

// Initialize agent engine
let agent: AgentEngine | null = null;

if (config.ai.anthropicApiKey || config.ai.geminiApiKey) {
  agent = new AgentEngine(db, config);

  // Forward agent events to dashboard
  agent.onEvent((event: AgentEvent) => {
    const payload = JSON.stringify(event);
    for (const client of dashboardClients) {
      if (client.readyState === 1) {
        // OPEN
        client.send(payload);
      }
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
        console.log(`[Gateway] ${channel.type} adapter started`);
      } catch (err) {
        console.error(`[Gateway] Failed to start ${channel.type}:`, err);
      }
    }

    await app.listen({ port: config.server.port, host: config.server.host });
    console.log(
      `\n🚀 AgentPilot Gateway running on http://${config.server.host}:${config.server.port}`,
    );
    console.log(`   Channels: ${channels.map((c) => c.type).join(", ") || "none configured"}`);
    console.log(`   AI: ${config.ai.primary}${agent ? " (ready)" : " (no API key)"}`);
    console.log(`   Dashboard: http://localhost:${config.server.dashboardPort}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[Gateway] Shutting down...");
  for (const channel of channels) {
    await channel.stop();
  }
  await app.close();
  process.exit(0);
});

start();
