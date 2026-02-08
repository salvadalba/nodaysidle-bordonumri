import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AIProvider, ChannelType, PermissionLevel } from "./types.js";

export interface AgentPilotConfig {
  masterPasswordHash?: string;
  ai: {
    primary: AIProvider;
    anthropicApiKey?: string;
    geminiApiKey?: string;
    openRouterApiKey?: string;
    model?: string;
  };
  channels: {
    telegram?: { botToken: string };
    discord?: { botToken: string };
    simplex?: { cliPath: string };
  };
  permissions: {
    defaultLevel: PermissionLevel;
    channelOverrides: Record<
      string,
      { level: PermissionLevel; allowedActions: string[] }
    >;
  };
  server: {
    port: number;
    host: string;
    dashboardPort: number;
  };
  database: {
    path: string;
  };
}

const DEFAULT_CONFIG: AgentPilotConfig = {
  ai: {
    primary: "anthropic",
  },
  channels: {},
  permissions: {
    defaultLevel: 0,
    channelOverrides: {},
  },
  server: {
    port: 3100,
    host: "127.0.0.1",
    dashboardPort: 3000,
  },
  database: {
    path: join(getConfigDir(), "agentpilot.db"),
  },
};

export function getConfigDir(): string {
  const dir = join(homedir(), ".agentpilot");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export function loadConfig(): AgentPilotConfig {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<AgentPilotConfig>;
  return mergeConfig(DEFAULT_CONFIG, parsed);
}

export function saveConfig(config: AgentPilotConfig): void {
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

function mergeConfig(
  defaults: AgentPilotConfig,
  overrides: Partial<AgentPilotConfig>,
): AgentPilotConfig {
  return {
    ...defaults,
    ...overrides,
    ai: { ...defaults.ai, ...overrides.ai },
    channels: { ...defaults.channels, ...overrides.channels },
    permissions: { ...defaults.permissions, ...overrides.permissions },
    server: { ...defaults.server, ...overrides.server },
    database: { ...defaults.database, ...overrides.database },
  };
}
