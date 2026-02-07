const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://127.0.0.1:3100";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:3100/ws";

export { GATEWAY_URL, WS_URL };

export interface GatewayHealth {
  status: string;
  version: string;
  channels: string[];
  aiProvider: string;
  agentReady: boolean;
}

export interface GatewayConfig {
  ai: {
    primary: string;
    hasAnthropicKey: boolean;
    hasGeminiKey: boolean;
  };
  channels: {
    telegram: boolean;
    discord: boolean;
    simplex: boolean;
  };
  server: {
    port: number;
    host: string;
    dashboardPort: number;
  };
}

export interface ChannelInfo {
  type: string;
  connected: boolean;
}

export interface AuditEntry {
  id: string;
  sessionId: string | null;
  channelType: string;
  channelId: string;
  userId: string;
  actionType: string;
  operation: string;
  input: unknown;
  output: unknown;
  permissionLevel: number;
  confirmationRequired: boolean;
  confirmed: boolean;
  createdAt: string;
}

export interface AgentEvent {
  type: "thinking" | "action" | "response" | "error" | "confirmation" | "connected";
  sessionId?: string;
  channelType?: string;
  data: Record<string, unknown>;
  timestamp?: string;
  channels?: string[];
  agentReady?: boolean;
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getHealth(): Promise<GatewayHealth> {
  return fetchApi("/health");
}

export async function getConfig(): Promise<GatewayConfig> {
  return fetchApi("/api/config");
}

export async function getChannels(): Promise<ChannelInfo[]> {
  return fetchApi("/api/channels");
}

export async function getAudit(limit = 50): Promise<AuditEntry[]> {
  return fetchApi(`/api/audit?limit=${limit}`);
}
