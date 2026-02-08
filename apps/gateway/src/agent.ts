import { createProvider } from "@agentpilot/ai";
import { PermissionGuard } from "@agentpilot/permissions";
import {
  BrowserWorker,
  EmailWorker,
  FilesWorker,
  NotesWorker,
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

export interface AgentEvent {
  type: "thinking" | "action" | "response" | "error" | "confirmation";
  sessionId: string;
  channelType: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export class AgentEngine {
  private provider: AIProviderAdapter;
  private guard: PermissionGuard;
  private workers: Map<string, ActionWorker> = new Map();
  private allTools: ToolDefinition[] = [];
  private eventListeners: ((event: AgentEvent) => void)[] = [];

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
      const maxIterations = 10;

      while (iterations < maxIterations) {
        iterations++;

        const response = await this.provider.chat(aiMessages, this.allTools);

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
          `⚠️ ${permCheck.confirmationMessage}\nReply "yes" to confirm.`,
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

  private getWorkerForTool(toolName: string): string | null {
    for (const [type, worker] of this.workers) {
      const tools = worker.getTools();
      if (tools.some((t) => t.name === toolName)) {
        return type;
      }
    }
    return null;
  }

  private buildSystemPrompt(message: ChannelMessage): string {
    return `You are AgentPilot, a personal assistant daemon running locally on this macOS machine.

Connected via: ${message.channelType} | User: ${message.userId}
Environment: macOS, home=/Users/archuser, shell=fish (Kitty.app terminal)
Storage: Home at /Users/archuser, external SSD (Samsung T7) at /Volumes/omarchyuser (projects live here)

You have these tools available:
- write_file(path, content) -- create or overwrite a file
- read_file(path) -- read file contents
- delete_file(path) -- delete a file (requires user confirmation)
- list_files(path) -- list a directory
- move_file(from, to) -- move/rename a file
- shell_exec(command, cwd) -- run any bash command locally
- browse_web(url) -- fetch a webpage
- web_search(query) -- search DuckDuckGo
- create_note(name, content), append_note(name, content), read_note(name), list_notes(), search_notes(query) -- notes

ENVIRONMENT:
- The user's notepad/text editor app is Noteworthy.app (located at /Applications/Noteworthy.app). Use shell_exec("open /Applications/Noteworthy.app") to open it, or shell_exec("open -a Noteworthy file.txt") to open a file with it.
- The terminal is Kitty.app with fish shell. When running shell commands, use fish-compatible syntax.
- To download a file from a URL, use shell_exec with curl: shell_exec("curl -L -o /Users/archuser/Downloads/filename 'https://url'")

RULES:
1. Use absolute paths. The user's files are in /Users/archuser/ and /Volumes/omarchyuser/.
2. Be concise. After completing a task, briefly confirm what you did.
3. For downloads, save to ~/Downloads/ by default unless the user specifies another location.`;
  }
}
