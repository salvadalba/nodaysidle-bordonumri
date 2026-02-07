import { describe, it, expect } from "vitest";
import {
  AgentPilotError,
  PermissionDeniedError,
  ConfirmationRequiredError,
  ProviderError,
  ChannelError,
} from "./errors.js";

describe("Errors", () => {
  it("should create AgentPilotError", () => {
    const err = new AgentPilotError("test", "TEST_CODE");
    expect(err.message).toBe("test");
    expect(err.code).toBe("TEST_CODE");
    expect(err.name).toBe("AgentPilotError");
  });

  it("should create PermissionDeniedError with level info", () => {
    const err = new PermissionDeniedError("shell:exec", 3, 1);
    expect(err.code).toBe("PERMISSION_DENIED");
    expect(err.message).toContain("level 3");
    expect(err.message).toContain("level is 1");
  });

  it("should create ConfirmationRequiredError", () => {
    const err = new ConfirmationRequiredError("rm", "Are you sure?");
    expect(err.code).toBe("CONFIRMATION_REQUIRED");
    expect(err.confirmationMessage).toBe("Are you sure?");
  });

  it("should create ProviderError", () => {
    const err = new ProviderError("anthropic", "rate limited");
    expect(err.code).toBe("PROVIDER_ERROR");
    expect(err.message).toContain("anthropic");
  });

  it("should create ChannelError", () => {
    const err = new ChannelError("telegram", "connection failed");
    expect(err.code).toBe("CHANNEL_ERROR");
    expect(err.message).toContain("telegram");
  });

  it("should be instanceof Error", () => {
    const err = new AgentPilotError("test", "TEST");
    expect(err instanceof Error).toBe(true);
    expect(err instanceof AgentPilotError).toBe(true);
  });
});
