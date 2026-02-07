import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { loadConfig } from "@agentpilot/core";

const config = loadConfig();

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(websocket);

// Health check
app.get("/health", async () => ({ status: "ok", version: "0.1.0" }));

// WebSocket for real-time dashboard updates
app.register(async (fastify) => {
  fastify.get("/ws", { websocket: true }, (socket, req) => {
    socket.on("message", (message) => {
      // TODO: Phase 6 - handle WebSocket messages
      socket.send(JSON.stringify({ type: "ack" }));
    });
  });
});

// API routes placeholder
app.get("/api/sessions", async () => {
  // TODO: Phase 6
  return [];
});

app.get("/api/audit", async () => {
  // TODO: Phase 6
  return [];
});

app.get("/api/permissions", async () => {
  // TODO: Phase 6
  return [];
});

const start = async () => {
  try {
    await app.listen({ port: config.server.port, host: config.server.host });
    console.log(
      `AgentPilot gateway running on http://${config.server.host}:${config.server.port}`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
