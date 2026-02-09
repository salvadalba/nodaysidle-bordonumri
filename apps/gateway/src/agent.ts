import { createProvider } from "@agentpilot/ai";
import { PermissionGuard } from "@agentpilot/permissions";
import {
  BrowserWorker,
  EmailWorker,
  FilesWorker,
  NotesWorker,
  SchedulerWorker,
  ShellWorker,
} from "@agentpilot/actions";
import {
  createSession,
  getSessionByChannel,
  addMessage,
  getMessages,
  type AgentPilotDb,
} from "@agentpilot/db";
import type {
  AIProviderAdapter,
  AIMessage,
  ChannelMessage,
  ActionType,
  ActionWorker,
  ToolDefinition,
} from "@agentpilot/core";
import type { AgentPilotConfig } from "@agentpilot/core";
import { existsSync, mkdirSync, watch } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface AgentEvent {
  type: "thinking" | "action" | "response" | "error" | "confirmation";
  sessionId: string;
  channelType: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

interface PendingConfirmation {
  toolName: string;
  args: Record<string, unknown>;
  sessionId: string;
  message: ChannelMessage;
  confirmationMessage: string;
}

export class AgentEngine {
  private provider: AIProviderAdapter;
  private guard: PermissionGuard;
  private workers: Map<string, ActionWorker> = new Map();
  private allTools: ToolDefinition[] = [];
  private eventListeners: ((event: AgentEvent) => void)[] = [];
  private pendingConfirmations = new Map<string, PendingConfirmation>();
  private skillsCache: string = "";
  private skillsLoaded = false;

  constructor(
    private db: AgentPilotDb,
    private config: AgentPilotConfig,
  ) {
    // Initialize AI provider
    const apiKey =
      config.ai.primary === "anthropic"
        ? config.ai.anthropicApiKey!
        : config.ai.primary === "openrouter"
          ? config.ai.openRouterApiKey!
          : config.ai.geminiApiKey!;
    this.provider = createProvider(config.ai.primary, apiKey, config.ai.model);

    // Initialize permission guard
    this.guard = new PermissionGuard(db, config.permissions.defaultLevel);

    // Initialize workers
    const workers: ActionWorker[] = [
      new BrowserWorker(),
      new EmailWorker(),
      new FilesWorker(),
      new NotesWorker(),
      new SchedulerWorker(db),
      new ShellWorker(),
    ];

    for (const worker of workers) {
      this.workers.set(worker.type, worker);
      this.allTools.push(...worker.getTools());
    }
  }

  onEvent(listener: (event: AgentEvent) => void) {
    this.eventListeners.push(listener);
  }

  private emit(event: AgentEvent) {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  async handleMessage(
    message: ChannelMessage,
    sendReply: (content: string) => Promise<void>,
  ): Promise<void> {
    // Check for pending confirmation responses
    const confirmationKey = `${message.channelType}:${message.channelId}:${message.userId}`;
    const pending = this.pendingConfirmations.get(confirmationKey);
    if (pending) {
      this.pendingConfirmations.delete(confirmationKey);
      const answer = message.content.trim().toLowerCase();
      if (answer === "yes" || answer === "y") {
        // Execute the confirmed action
        const result = await this.executeConfirmedTool(
          pending.toolName,
          pending.args,
          pending.sessionId,
          pending.message,
        );
        await this.guard.logAction(
          {
            type: this.getWorkerForTool(pending.toolName) as ActionType,
            operation: pending.toolName,
            params: pending.args,
            sessionId: pending.sessionId,
            channelType: pending.message.channelType,
            channelId: pending.message.channelId,
            userId: pending.message.userId,
          },
          result as any,
          true,
          true,
        );
        await sendReply(`Confirmed. ${typeof result === "object" && result && "data" in result ? JSON.stringify((result as any).data) : "Done."}`);
        return;
      } else {
        await sendReply("Action cancelled.");
        return;
      }
    }

    // Get or create session
    let session = getSessionByChannel(
      this.db,
      message.channelType,
      message.channelId,
      message.userId,
    );

    let sessionId: string;
    if (!session) {
      sessionId = createSession(this.db, {
        channelType: message.channelType,
        channelId: message.channelId,
        userId: message.userId,
      });
    } else {
      sessionId = session.id;
    }

    // Store user message
    addMessage(this.db, {
      sessionId,
      role: "user",
      content: message.content,
    });

    // Build conversation history
    const dbMessages = getMessages(this.db, sessionId);
    const aiMessages: AIMessage[] = [
      {
        role: "system",
        content: this.buildSystemPrompt(message),
      },
      ...dbMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    this.emit({
      type: "thinking",
      sessionId,
      channelType: message.channelType,
      data: { message: message.content },
      timestamp: new Date(),
    });

    try {
      // Agent loop: call AI, execute tools, repeat until done
      let iterations = 0;
      const maxIterations = this.config.ai.maxIterations ?? 10;

      while (iterations < maxIterations) {
        iterations++;

        const response = await this.provider.chat(aiMessages, this.allTools);

        console.log(`[agent] iteration ${iterations}: toolCalls=${response.toolCalls.length}, content=${response.content?.slice(0, 80) ?? "(empty)"}`);


        // If no tool calls, we have the final response
        if (response.toolCalls.length === 0) {
          const reply = response.content?.trim() || "Done.";

          addMessage(this.db, {
            sessionId,
            role: "assistant",
            content: reply,
          });

          this.emit({
            type: "response",
            sessionId,
            channelType: message.channelType,
            data: { content: reply },
            timestamp: new Date(),
          });

          await sendReply(reply);
          return;
        }

        // Execute tool calls
        const toolResults: string[] = [];

        for (const toolCall of response.toolCalls) {
          this.emit({
            type: "action",
            sessionId,
            channelType: message.channelType,
            data: {
              tool: toolCall.name,
              arguments: toolCall.arguments,
            },
            timestamp: new Date(),
          });

          const result = await this.executeTool(
            toolCall.name,
            toolCall.arguments,
            sessionId,
            message,
            sendReply,
          );

          toolResults.push(
            `Tool "${toolCall.name}" result: ${JSON.stringify(result)}`,
          );
        }

        // Add assistant message with tool calls
        if (response.content) {
          aiMessages.push({
            role: "assistant",
            content: response.content,
          });
        }

        // Add tool results as user message (for next iteration)
        aiMessages.push({
          role: "user",
          content: toolResults.join("\n\n"),
        });
      }

      // Max iterations reached
      await sendReply(
        "I've reached the maximum number of steps for this task. Here's what I've done so far - let me know if you'd like me to continue.",
      );
    } catch (err: any) {
      const errorMsg = `Sorry, I encountered an error: ${err.message || "Unknown error"}`;

      this.emit({
        type: "error",
        sessionId,
        channelType: message.channelType,
        data: { error: err.message },
        timestamp: new Date(),
      });

      await sendReply(errorMsg);
    }
  }

  private async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    sessionId: string,
    message: ChannelMessage,
    sendReply: (content: string) => Promise<void>,
  ): Promise<unknown> {
    // Find which worker handles this tool
    const workerType = this.getWorkerForTool(toolName);
    if (!workerType) {
      return { error: `Unknown tool: ${toolName}` };
    }

    const worker = this.workers.get(workerType);
    if (!worker) {
      return { error: `Worker not found: ${workerType}` };
    }

    // Check permissions
    const request = {
      type: workerType as ActionType,
      operation: toolName,
      params: args,
      sessionId,
      channelType: message.channelType as any,
      channelId: message.channelId,
      userId: message.userId,
    };

    try {
      const permCheck = await this.guard.check(request);

      if (permCheck.confirmationRequired) {
        const confirmationKey = `${message.channelType}:${message.channelId}:${message.userId}`;
        this.pendingConfirmations.set(confirmationKey, {
          toolName,
          args,
          sessionId,
          message,
          confirmationMessage: permCheck.confirmationMessage!,
        });

        this.emit({
          type: "confirmation",
          sessionId,
          channelType: message.channelType,
          data: {
            action: toolName,
            message: permCheck.confirmationMessage,
          },
          timestamp: new Date(),
        });

        await sendReply(
          `⚠️ ${permCheck.confirmationMessage}\nReply "yes" to confirm or anything else to cancel.`,
        );

        // Log the action as pending confirmation
        await this.guard.logAction(request, { pending: true }, true, false);
        return { status: "awaiting_confirmation", message: permCheck.confirmationMessage };
      }
    } catch (err: any) {
      if (err.code === "PERMISSION_DENIED") {
        await this.guard.logAction(
          request,
          { denied: true, error: err.message },
          false,
          false,
        );
        return { error: err.message };
      }
      throw err;
    }

    // Execute the action
    const result = await worker.execute(request);

    // Log to audit
    await this.guard.logAction(
      request,
      result as any,
      result.confirmationRequired ?? false,
      !result.confirmationRequired,
    );

    return result;
  }

  private async executeConfirmedTool(
    toolName: string,
    args: Record<string, unknown>,
    sessionId: string,
    message: ChannelMessage,
  ): Promise<unknown> {
    const workerType = this.getWorkerForTool(toolName);
    if (!workerType) return { error: `Unknown tool: ${toolName}` };
    const worker = this.workers.get(workerType);
    if (!worker) return { error: `Worker not found: ${workerType}` };
    const request = {
      type: workerType as ActionType,
      operation: toolName,
      params: args,
      sessionId,
      channelType: message.channelType as any,
      channelId: message.channelId,
      userId: message.userId,
    };
    return worker.execute(request);
  }

  private getWorkerForTool(toolName: string): string | null {
    for (const [type, worker] of this.workers) {
      const tools = worker.getTools();
      if (tools.some((t) => t.name === toolName)) {
        return type;
      }
    }
    return null;
  }

  /** Load skills from disk and start watching for changes */
  async initSkills(): Promise<void> {
    const skillsDir = join(process.env.HOME ?? "~", ".agentpilot", "skills");
    if (!existsSync(skillsDir)) {
      mkdirSync(skillsDir, { recursive: true });
    }

    await this.reloadSkills(skillsDir);
    this.skillsLoaded = true;

    // Watch for changes and reload automatically
    try {
      watch(skillsDir, { persistent: false }, () => {
        this.reloadSkills(skillsDir).catch(() => {});
      });
    } catch {
      // Watcher failed - skills still loaded from initial read
    }
  }

  private async reloadSkills(skillsDir: string): Promise<void> {
    try {
      const files = (await readdir(skillsDir)).filter((f) => f.endsWith(".md"));
      if (files.length === 0) {
        this.skillsCache = "";
        return;
      }

      const skills: string[] = [];
      for (const file of files) {
        try {
          const content = await readFile(join(skillsDir, file), "utf-8");
          skills.push(content);
        } catch {
          // Skip unreadable files
        }
      }

      if (skills.length === 0) {
        this.skillsCache = "";
        return;
      }
      this.skillsCache = `\n\nSKILLS (follow these instructions when relevant):\n${skills.join("\n\n---\n\n")}`;
    } catch {
      this.skillsCache = "";
    }
  }

  private buildSystemPrompt(message: ChannelMessage): string {
    const skillsContent = this.skillsCache;

    return `You are AgentPilot, a local CLI assistant daemon running on this macOS machine. You have full shell access and local tools. You MUST use your tools to fulfill requests — never say you "can't", "don't have access", or "unable to". You CAN do it, use your tools.

Connected via: ${message.channelType} | User: ${message.userId}
Environment: macOS, home=/Users/archuser, shell=fish (Kitty.app terminal)
Timezone: Europe/Ljubljana (CET, UTC+1)
Storage: Home at /Users/archuser, external SSD (Samsung T7) at /Volumes/omarchyuser (projects live here)

TOOLS — always use these, never apologize or suggest websites instead:
- shell_exec(command, cwd) — run ANY bash/shell command locally. This is your most powerful tool.
- write_file(path, content) — create or overwrite a file
- read_file(path) — read file contents
- delete_file(path) — delete a file (requires user confirmation)
- list_files(path) — list a directory
- move_file(from, to) — move/rename a file
- browse_web(url) — fetch a webpage and extract text
- web_search(query) — search DuckDuckGo
- create_note(name, content), append_note(name, content), read_note(name), list_notes(), search_notes(query) — notes
- schedule_task(name, cron, prompt) — schedule a recurring task
- list_scheduled_tasks() — list all scheduled tasks
- cancel_task(id) — cancel a scheduled task

CRITICAL RULES:
1. ALWAYS use tools to answer questions. For weather: shell_exec("curl -s 'https://wttr.in/CITY?format=3'"). For time: shell_exec("date"). For system info: shell_exec("top -l 1 | head -10"). NEVER give a text-only answer when a tool call would give real data.
2. Use absolute paths. Files are in /Users/archuser/ and /Volumes/omarchyuser/.
3. Be concise. After completing a task, briefly confirm what you did with the actual result.
4. For downloads, save to ~/Downloads/ by default.
5. Never suggest the user "visit a website" or "check manually" — YOU do it with your tools.
6. The user's text editor is Noteworthy.app. Use shell_exec("open -a Noteworthy file.txt").
7. Kitty.app terminal with fish shell. Use fish-compatible syntax for shell commands.${skillsContent}`;
  }
}
