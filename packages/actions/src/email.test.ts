import { describe, it, expect } from "vitest";
import { EmailWorker } from "./email.js";
import type { ActionRequest } from "@agentpilot/core";

function makeRequest(
  operation: string,
  params: Record<string, unknown> = {},
): ActionRequest {
  return {
    type: "email",
    operation,
    params,
    sessionId: "sess-1",
    channelType: "telegram",
    channelId: "chat-1",
    userId: "user-1",
  };
}

describe("EmailWorker", () => {
  describe("send_email", () => {
    it("should require SMTP config", async () => {
      const worker = new EmailWorker({});
      const result = await worker.execute(
        makeRequest("send_email", {
          to: "test@example.com",
          subject: "Hi",
          body: "Hello",
        }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("SMTP not configured");
    });

    it("should require all fields", async () => {
      const worker = new EmailWorker({});
      const result = await worker.execute(
        makeRequest("send_email", { to: "test@example.com" }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing required");
    });

    it("should require confirmation when SMTP is configured", async () => {
      const worker = new EmailWorker({
        smtp: {
          host: "smtp.test.com",
          port: 587,
          secure: false,
          auth: { user: "test", pass: "pass" },
        },
      });
      const result = await worker.execute(
        makeRequest("send_email", {
          to: "recipient@example.com",
          subject: "Test Subject",
          body: "Test body content",
        }),
      );
      expect(result.success).toBe(true);
      expect(result.confirmationRequired).toBe(true);
      expect(result.confirmationMessage).toContain("recipient@example.com");
    });
  });

  describe("read_emails", () => {
    it("should require IMAP config", async () => {
      const worker = new EmailWorker({});
      const result = await worker.execute(makeRequest("read_emails"));
      expect(result.success).toBe(false);
      expect(result.error).toContain("IMAP not configured");
    });
  });

  describe("search_emails", () => {
    it("should require IMAP config", async () => {
      const worker = new EmailWorker({});
      const result = await worker.execute(
        makeRequest("search_emails", { query: "invoice" }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("IMAP not configured");
    });

    it("should require query param", async () => {
      const worker = new EmailWorker({
        imap: {
          host: "imap.test.com",
          port: 993,
          tls: true,
          auth: { user: "test", pass: "pass" },
        },
      });
      const result = await worker.execute(makeRequest("search_emails", {}));
      expect(result.success).toBe(false);
      expect(result.error).toContain("No search query");
    });
  });

  describe("unknown operation", () => {
    it("should return error", async () => {
      const worker = new EmailWorker({});
      const result = await worker.execute(makeRequest("forward_all", {}));
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown");
    });
  });

  it("should provide tool definitions", () => {
    const worker = new EmailWorker({});
    const tools = worker.getTools();
    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.name)).toContain("send_email");
    expect(tools.map((t) => t.name)).toContain("read_emails");
  });

  it("should have Communicate permission level", () => {
    const worker = new EmailWorker({});
    expect(worker.requiredLevel).toBe(1); // PermissionLevel.Communicate
  });
});
