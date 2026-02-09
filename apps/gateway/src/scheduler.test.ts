import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SchedulerEngine } from "./scheduler.js";
import { createTestDb, type AgentPilotDb, createScheduledTask } from "@agentpilot/db";
import type { AgentEngine } from "./agent.js";

function createMockAgent() {
  return {
    handleMessage: vi.fn().mockImplementation(async (_msg, sendReply) => {
      await sendReply("Scheduled response");
    }),
  } as unknown as AgentEngine;
}

describe("SchedulerEngine", () => {
  let db: AgentPilotDb;
  let mockAgent: ReturnType<typeof createMockAgent>;
  let sendReply: ReturnType<typeof vi.fn>;
  let scheduler: SchedulerEngine;

  beforeEach(() => {
    db = createTestDb();
    mockAgent = createMockAgent();
    sendReply = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    scheduler?.stop();
  });

  it("should load tasks from DB on start", () => {
    // Create a task in DB
    createScheduledTask(db, {
      name: "test-task",
      cronExpression: "0 9 * * *",
      prompt: "Hello",
      channelType: "telegram",
      channelId: "chat-1",
      userId: "user-1",
    });

    const logMessages: string[] = [];
    scheduler = new SchedulerEngine({
      db,
      agent: mockAgent,
      sendReply,
      log: (msg) => logMessages.push(msg),
    });
    scheduler.start();

    expect(logMessages).toContain("Loaded 1 scheduled task(s)");
  });

  it("should start with no tasks when DB is empty", () => {
    const logMessages: string[] = [];
    scheduler = new SchedulerEngine({
      db,
      agent: mockAgent,
      sendReply,
      log: (msg) => logMessages.push(msg),
    });
    scheduler.start();

    expect(logMessages).toContain("Loaded 0 scheduled task(s)");
  });

  it("should stop all jobs cleanly", () => {
    createScheduledTask(db, {
      name: "task-1",
      cronExpression: "* * * * *",
      prompt: "Every minute",
      channelType: "telegram",
      channelId: "chat-1",
      userId: "user-1",
    });

    const logMessages: string[] = [];
    scheduler = new SchedulerEngine({
      db,
      agent: mockAgent,
      sendReply,
      log: (msg) => logMessages.push(msg),
    });
    scheduler.start();
    scheduler.stop();

    expect(logMessages).toContain("All jobs stopped");
  });

  it("should reload tasks from DB", () => {
    const logMessages: string[] = [];
    scheduler = new SchedulerEngine({
      db,
      agent: mockAgent,
      sendReply,
      log: (msg) => logMessages.push(msg),
    });
    scheduler.start();

    // Add a task after start
    createScheduledTask(db, {
      name: "new-task",
      cronExpression: "0 12 * * *",
      prompt: "Noon task",
      channelType: "telegram",
      channelId: "chat-1",
      userId: "user-1",
    });

    scheduler.reload();
    expect(logMessages).toContain("Loaded 1 scheduled task(s)");
  });

  it("should remove a specific job", () => {
    const taskId = createScheduledTask(db, {
      name: "removable",
      cronExpression: "0 8 * * *",
      prompt: "Morning",
      channelType: "telegram",
      channelId: "chat-1",
      userId: "user-1",
    });

    scheduler = new SchedulerEngine({
      db,
      agent: mockAgent,
      sendReply,
    });
    scheduler.start();
    scheduler.removeJob(taskId);

    // Should not throw when removing non-existent job
    scheduler.removeJob("non-existent-id");
  });
});
