import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir, hostname, userInfo } from "node:os";
import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from "node:crypto";
import type { AIProvider, ChannelType, PermissionLevel } from "./types.js";

export interface AgentPilotConfig {
  masterPasswordHash?: string;
  ai: {
    primary: AIProvider;
    anthropicApiKey?: string;
    geminiApiKey?: string;
    openRouterApiKey?: string;
    model?: string;
    maxIterations?: number;
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

export class ConfigValidationError extends Error {
  constructor(public issues: string[]) {
    super(`Invalid config: ${issues.join("; ")}`);
    this.name = "ConfigValidationError";
  }
}

export function validateConfig(config: AgentPilotConfig): string[] {
  const issues: string[] = [];

  // AI provider must be valid
  const validProviders: AIProvider[] = ["anthropic", "gemini", "openrouter"];
  if (!validProviders.includes(config.ai.primary)) {
    issues.push(`Invalid AI provider: "${config.ai.primary}". Must be one of: ${validProviders.join(", ")}`);
  }

  // Must have at least one API key
  if (!config.ai.anthropicApiKey && !config.ai.geminiApiKey && !config.ai.openRouterApiKey) {
    issues.push("No AI API key configured. Set at least one of: anthropicApiKey, geminiApiKey, openRouterApiKey");
  }

  // The selected provider must have its key
  if (config.ai.primary === "anthropic" && !config.ai.anthropicApiKey) {
    issues.push('Primary AI is "anthropic" but anthropicApiKey is missing');
  }
  if (config.ai.primary === "gemini" && !config.ai.geminiApiKey) {
    issues.push('Primary AI is "gemini" but geminiApiKey is missing');
  }
  if (config.ai.primary === "openrouter" && !config.ai.openRouterApiKey) {
    issues.push('Primary AI is "openrouter" but openRouterApiKey is missing');
  }

  // Server port must be valid
  if (config.server.port < 1 || config.server.port > 65535) {
    issues.push(`Invalid server port: ${config.server.port}`);
  }

  // maxIterations must be positive if set
  if (config.ai.maxIterations !== undefined && config.ai.maxIterations < 1) {
    issues.push(`maxIterations must be >= 1, got ${config.ai.maxIterations}`);
  }

  return issues;
}

export function loadConfig(): AgentPilotConfig {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<AgentPilotConfig>;
  const config = mergeConfig(DEFAULT_CONFIG, parsed);
  return decryptConfig(config);
}

export function saveConfig(config: AgentPilotConfig): void {
  const configPath = getConfigPath();
  const encrypted = encryptConfig(config);
  writeFileSync(configPath, JSON.stringify(encrypted, null, 2), "utf-8");
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

// --- Config encryption ---
// Uses machine-specific key derivation (hostname + username) for zero-config encryption.
// Not meant to protect against a targeted attacker with shell access,
// but prevents casual exposure of API keys in plaintext config files.

const SENSITIVE_KEYS = [
  "anthropicApiKey",
  "geminiApiKey",
  "openRouterApiKey",
] as const;

const SENSITIVE_CHANNEL_KEYS = ["botToken"] as const;

const ENC_PREFIX = "enc:";

function deriveKey(): Buffer {
  const salt = `agentpilot-${hostname()}-${userInfo().username}`;
  return scryptSync(salt, "agentpilot-salt", 32);
}

function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decrypt(encryptedValue: string): string {
  if (!encryptedValue.startsWith(ENC_PREFIX)) return encryptedValue;
  const key = deriveKey();
  const data = Buffer.from(encryptedValue.slice(ENC_PREFIX.length), "base64");
  const iv = data.subarray(0, 16);
  const authTag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8");
}

/** Encrypt sensitive fields in config before saving */
function encryptConfig(config: AgentPilotConfig): AgentPilotConfig {
  const encrypted = JSON.parse(JSON.stringify(config)) as AgentPilotConfig;

  for (const key of SENSITIVE_KEYS) {
    const val = encrypted.ai[key];
    if (val && !val.startsWith(ENC_PREFIX)) {
      (encrypted.ai as any)[key] = encrypt(val);
    }
  }

  for (const [, channelConf] of Object.entries(encrypted.channels)) {
    if (channelConf && "botToken" in channelConf && !channelConf.botToken.startsWith(ENC_PREFIX)) {
      channelConf.botToken = encrypt(channelConf.botToken);
    }
  }

  return encrypted;
}

/** Decrypt sensitive fields in config after loading */
function decryptConfig(config: AgentPilotConfig): AgentPilotConfig {
  for (const key of SENSITIVE_KEYS) {
    const val = config.ai[key];
    if (val && val.startsWith(ENC_PREFIX)) {
      try {
        (config.ai as any)[key] = decrypt(val);
      } catch {
        // If decryption fails (different machine?), leave as-is
      }
    }
  }

  for (const [, channelConf] of Object.entries(config.channels)) {
    if (channelConf && "botToken" in channelConf && channelConf.botToken.startsWith(ENC_PREFIX)) {
      try {
        channelConf.botToken = decrypt(channelConf.botToken);
      } catch {
        // If decryption fails, leave as-is
      }
    }
  }

  return config;
}
