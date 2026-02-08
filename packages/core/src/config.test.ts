import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, saveConfig, getConfigDir } from "./config.js";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Config", () => {
  it("should load config with valid values", () => {
    const config = loadConfig();
    expect(["anthropic", "gemini", "openrouter"]).toContain(config.ai.primary);
    expect(config.server.port).toBe(3100);
    expect(config.server.host).toBe("127.0.0.1");
    expect(typeof config.permissions.defaultLevel).toBe("number");
  });

  it("should have all required sections", () => {
    const config = loadConfig();
    expect(config.ai).toBeDefined();
    expect(config.channels).toBeDefined();
    expect(config.permissions).toBeDefined();
    expect(config.server).toBeDefined();
    expect(config.database).toBeDefined();
  });

  it("should get config directory", () => {
    const dir = getConfigDir();
    expect(dir).toContain(".agentpilot");
    expect(existsSync(dir)).toBe(true);
  });
});
