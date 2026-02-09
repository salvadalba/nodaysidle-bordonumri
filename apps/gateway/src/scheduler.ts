import cron, { type ScheduledTask } from "node-cron";
import type { AgentPilotDb } from "@agentpilot/db";
import {
  getScheduledTasks,
  updateScheduledTaskLastRun,
} from "@agentpilot/db";
import type { ChannelMessage } from "@agentpilot/core";
import type { AgentEngine } from "./agent.js";

interface SchedulerOptions {
  db: AgentPilotDb;
  agent: AgentEngine;
  sendReply: (channelType: string, channelId: string, content: string) => Promise<void>;
  log?: (msg: string) => void;
  logError?: (msg: string) => void;
}

export class SchedulerEngine {
  private jobs = new Map<string, ScheduledTask>();
  private db: AgentPilotDb;
  private agent: AgentEngine;
  private sendReply: SchedulerOptions["sendReply"];
  private log?: (msg: string) => void;
  private logError?: (msg: string) => void;

  constructor(opts: SchedulerOptions) {
    this.db = opts.db;
    this.agent = opts.agent;
    this.sendReply = opts.sendReply;
    this.log = opts.log;
    this.logError = opts.logError;
  }

  /** Load all enabled tasks from DB and start their cron jobs */
  start() {
    const tasks = getScheduledTasks(this.db);
    for (const task of tasks) {
      this.registerJob(task.id, task.cronExpression, task.prompt, {
        channelType: task.channelType,
        channelId: task.channelId,
        userId: task.userId,
      });
    }
    this.log?.(`Loaded ${tasks.length} scheduled task(s)`);
  }

  /** Register a single cron job */
  registerJob(
    taskId: string,
    cronExpression: string,
    prompt: string,
    channel: { channelType: string; channelId: string; userId: string },
  ) {
    // Destroy existing job if re-registering
    if (this.jobs.has(taskId)) {
      this.jobs.get(taskId)!.stop();
    }

    const job = cron.schedule(cronExpression, async () => {
      this.log?.(`Firing task ${taskId}: "${prompt.slice(0, 60)}..."`);

      const syntheticMessage: ChannelMessage = {
        id: `sched_${taskId}_${Date.now()}`,
        channelType: channel.channelType as any,
        channelId: channel.channelId,
        userId: channel.userId,
        content: prompt,
        timestamp: new Date(),
      };

      try {
        await this.agent.handleMessage(syntheticMessage, async (content) => {
          await this.sendReply(channel.channelType, channel.channelId, content);
        });
        updateScheduledTaskLastRun(this.db, taskId);
      } catch (err) {
        this.logError?.(`Error executing task ${taskId}: ${err}`);
      }
    });

    this.jobs.set(taskId, job);
  }

  /** Remove a cron job */
  removeJob(taskId: string) {
    const job = this.jobs.get(taskId);
    if (job) {
      job.stop();
      this.jobs.delete(taskId);
    }
  }

  /** Reload all jobs from DB (useful after schedule_task / cancel_task) */
  reload() {
    // Stop all existing jobs
    for (const [, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    this.start();
  }

  /** Stop all jobs on shutdown */
  stop() {
    for (const [, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    this.log?.("All jobs stopped");
  }
}
