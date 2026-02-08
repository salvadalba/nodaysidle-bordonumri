const DEFAULT_GATEWAY = "http://localhost:3100";

function getGatewayUrl(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("agentpilot_gateway_url");
    if (stored) return stored;
  }
  return process.env.NEXT_PUBLIC_GATEWAY_URL || DEFAULT_GATEWAY;
}

function getWsUrl(): string {
  const base = getGatewayUrl();
  return base.replace(/^http/, "ws") + "/ws";
}

export function setGatewayUrl(url: string) {
  const clean = url.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    localStorage.setItem("agentpilot_gateway_url", clean);
  }
}

export function getStoredGatewayUrl(): string {
  return getGatewayUrl();
}

// Use getters so the URL is always fresh from localStorage
export const GATEWAY_URL_GETTER = getGatewayUrl;
export const WS_URL_GETTER = getWsUrl;
// Keep backward compat exports for static reads
export const GATEWAY_URL = DEFAULT_GATEWAY;
export const WS_URL = DEFAULT_GATEWAY.replace(/^http/, "ws") + "/ws";

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
  const url = getGatewayUrl();
  const res = await fetch(`${url}${path}`, { cache: "no-store" });
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
