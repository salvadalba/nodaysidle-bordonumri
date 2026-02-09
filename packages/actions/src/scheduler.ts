import {
  PermissionLevel,
  type ActionWorker,
  type ActionRequest,
  type ActionResult,
  type ToolDefinition,
} from "@agentpilot/core";
import cron from "node-cron";
import type { AgentPilotDb } from "@agentpilot/db";
import {
  createScheduledTask,
  getAllScheduledTasks,
  deleteScheduledTask,
} from "@agentpilot/db";

export class SchedulerWorker implements ActionWorker {
  type = "scheduler" as const;
  requiredLevel = PermissionLevel.Modify;

  constructor(private db: AgentPilotDb) {}

  async execute(request: ActionRequest): Promise<ActionResult> {
    try {
      switch (request.operation) {
        case "schedule_task": {
          const name = request.params.name as string;
          const cronExpr = request.params.cron as string;
          const prompt = request.params.prompt as string;
          if (!name || !cronExpr || !prompt) {
            return { success: false, error: "Missing name, cron, or prompt" };
          }
          if (!cron.validate(cronExpr)) {
            return { success: false, error: `Invalid cron expression: "${cronExpr}". Use 5 fields: minute hour day-of-month month day-of-week` };
          }
          const id = createScheduledTask(this.db, {
            name,
            cronExpression: cronExpr,
            prompt,
            channelType: request.channelType,
            channelId: request.channelId,
            userId: request.userId,
          });
          return {
            success: true,
            data: { id, name, cron: cronExpr, prompt, message: `Scheduled task "${name}" created with cron "${cronExpr}"` },
          };
        }

        case "list_scheduled_tasks": {
          const tasks = getAllScheduledTasks(this.db, request.userId);
          const taskList = tasks.map((t) => ({
            id: t.id,
            name: t.name,
            cron: t.cronExpression,
            prompt: t.prompt,
            enabled: t.enabled,
            lastRun: t.lastRun?.toISOString() ?? "never",
          }));
          return { success: true, data: { tasks: taskList, count: taskList.length } };
        }

        case "cancel_task": {
          const id = request.params.id as string;
          if (!id) {
            return { success: false, error: "Missing task id" };
          }
          deleteScheduledTask(this.db, id);
          return { success: true, data: { id, message: `Task ${id} cancelled` } };
        }

        default:
          return { success: false, error: `Unknown operation: ${request.operation}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message ?? String(err) };
    }
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: "schedule_task",
        description:
          "Schedule a recurring task using a cron expression. The prompt will be executed by the agent at each scheduled time and the result sent to the user.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Short name for the task (e.g. 'daily-summary')" },
            cron: {
              type: "string",
              description:
                "Cron expression (5 fields: minute hour day-of-month month day-of-week). Examples: '0 15 * * *' = daily at 15:00, '*/30 * * * *' = every 30 min, '0 9 * * 1' = Mondays at 9:00",
            },
            prompt: {
              type: "string",
              description: "The instruction to execute at each scheduled time (e.g. 'Summarize my notes and send me a brief overview')",
            },
          },
          required: ["name", "cron", "prompt"],
        },
      },
      {
        name: "list_scheduled_tasks",
        description: "List all scheduled tasks for the current user",
        parameters: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "cancel_task",
        description: "Cancel/delete a scheduled task by its ID",
        parameters: {
          type: "object",
          properties: {
            id: { type: "string", description: "The task ID to cancel" },
          },
          required: ["id"],
        },
      },
    ];
  }
}
