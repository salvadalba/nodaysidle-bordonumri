import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { ChannelAdapter, ChannelMessage } from "@agentpilot/core";
import { ChannelError } from "@agentpilot/core";

/**
 * SimpleX Chat adapter using the simplex-chat CLI.
 * Communicates via the CLI's stdin/stdout JSON API.
 *
 * Requires simplex-chat to be installed:
 *   brew install simplex-chat  (macOS)
 *   or download from https://simplex.chat
 */
export class SimpleXAdapter implements ChannelAdapter {
  type = "simplex" as const;
  private process: ChildProcess | null = null;
  private messageHandler?: (message: ChannelMessage) => void;
  private buffer = "";

  constructor(private cliPath: string = "simplex-chat") {}

  async start(): Promise<void> {
    try {
      this.process = spawn(this.cliPath, ["-e"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.process.stdout?.on("data", (data: Buffer) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        console.error(`[SimpleX] stderr: ${data.toString()}`);
      });

      this.process.on("close", (code) => {
        console.log(`[SimpleX] Process exited with code ${code}`);
        this.process = null;
      });

      console.log("[SimpleX] Adapter started");
    } catch (err) {
      throw new ChannelError(
        "simplex",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.type === "newChatItem" && event.chatItem?.content?.text) {
          const msg: ChannelMessage = {
            id: randomUUID(),
            channelType: "simplex",
            channelId: event.chatItem.chatInfo?.id ?? "unknown",
            userId: event.chatItem.chatInfo?.contactId ?? "unknown",
            content: event.chatItem.content.text,
            timestamp: new Date(),
          };

          this.messageHandler?.(msg);
        }
      } catch {
        // Not JSON, skip
      }
    }
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
    console.log("[SimpleX] Adapter stopped");
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    if (!this.process?.stdin) {
      throw new ChannelError("simplex", "SimpleX process not running");
    }

    const command = JSON.stringify({
      type: "sendMessage",
      chatId: channelId,
      message: { text: content },
    });

    this.process.stdin.write(command + "\n");
  }

  onMessage(handler: (message: ChannelMessage) => void): void {
    this.messageHandler = handler;
  }
}
