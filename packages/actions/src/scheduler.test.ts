import { describe, it, expect, beforeEach } from "vitest";
import { SchedulerWorker } from "./scheduler.js";
import { createTestDb, type AgentPilotDb } from "@agentpilot/db";
import { PermissionLevel, type ActionRequest } from "@agentpilot/core";

function makeRequest(
  operation: string,
  params: Record<string, unknown> = {},
): ActionRequest {
  return {
    type: "scheduler",
    operation,
    params,
    sessionId: "sess-1",
    channelType: "telegram",
    channelId: "chat-123",
    userId: "user-1",
  };
}

describe("SchedulerWorker", () => {
  let db: AgentPilotDb;
  let worker: SchedulerWorker;

  beforeEach(() => {
    db = createTestDb();
    worker = new SchedulerWorker(db);
  });

  it("should have correct type and required level", () => {
    expect(worker.type).toBe("scheduler");
    expect(worker.requiredLevel).toBe(PermissionLevel.Modify);
  });

  it("should expose schedule_task, list_scheduled_tasks, cancel_task tools", () => {
    const tools = worker.getTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("schedule_task");
    expect(names).toContain("list_scheduled_tasks");
    expect(names).toContain("cancel_task");
  });

  it("should create a scheduled task", async () => {
    const result = await worker.execute(
      makeRequest("schedule_task", {
        name: "daily-check",
        cron: "0 9 * * *",
        prompt: "Check the weather",
      }),
    );
    expect(result.success).toBe(true);
    expect((result.data as any).name).toBe("daily-check");
    expect((result.data as any).id).toBeDefined();
  });

  it("should reject invalid cron expression", async () => {
    const result = await worker.execute(
      makeRequest("schedule_task", {
        name: "bad-cron",
        cron: "not a cron",
        prompt: "Do something",
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid cron expression");
  });

  it("should reject missing fields", async () => {
    const result = await worker.execute(
      makeRequest("schedule_task", { name: "no-cron" }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing");
  });

  it("should list scheduled tasks", async () => {
    // Create two tasks
    await worker.execute(
      makeRequest("schedule_task", {
        name: "task-1",
        cron: "0 9 * * *",
        prompt: "First task",
      }),
    );
    await worker.execute(
      makeRequest("schedule_task", {
        name: "task-2",
        cron: "0 18 * * *",
        prompt: "Second task",
      }),
    );

    const result = await worker.execute(makeRequest("list_scheduled_tasks"));
    expect(result.success).toBe(true);
    expect((result.data as any).count).toBe(2);
    expect((result.data as any).tasks).toHaveLength(2);
  });

  it("should cancel a task", async () => {
    const createResult = await worker.execute(
      makeRequest("schedule_task", {
        name: "to-cancel",
        cron: "0 12 * * *",
        prompt: "Cancel me",
      }),
    );
    const taskId = (createResult.data as any).id;

    const cancelResult = await worker.execute(
      makeRequest("cancel_task", { id: taskId }),
    );
    expect(cancelResult.success).toBe(true);

    // Verify it's gone
    const listResult = await worker.execute(makeRequest("list_scheduled_tasks"));
    expect((listResult.data as any).count).toBe(0);
  });

  it("should reject cancel_task without id", async () => {
    const result = await worker.execute(makeRequest("cancel_task", {}));
    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing task id");
  });

  it("should handle unknown operation", async () => {
    const result = await worker.execute(makeRequest("unknown_op"));
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown operation");
  });
});
