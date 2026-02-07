import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  PermissionLevel,
  type ActionWorker,
  type ActionRequest,
  type ActionResult,
  type ToolDefinition,
} from "@agentpilot/core";

const execFileAsync = promisify(execFile);

const BLOCKED_COMMANDS = new Set([
  "rm -rf /",
  "mkfs",
  "dd if=/dev/zero",
  ":(){ :|:& };:",
  "chmod -R 777 /",
]);

const DANGEROUS_PATTERNS = [
  /\brm\s+(-rf?|--recursive)\s+\/(?!\w)/,
  /\bsudo\b/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  />\s*\/dev\/sd/,
];

export class ShellWorker implements ActionWorker {
  type = "shell" as const;
  requiredLevel = PermissionLevel.Execute;
  private allowedCwd: string;

  constructor(allowedCwd?: string) {
    this.allowedCwd = allowedCwd ?? process.cwd();
  }

  async execute(request: ActionRequest): Promise<ActionResult> {
    const command = request.params.command as string;
    const cwd = (request.params.cwd as string) ?? this.allowedCwd;
    const timeout = (request.params.timeout as number) ?? 30000;

    if (!command) {
      return { success: false, error: "No command provided" };
    }

    // Check for blocked commands
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return {
          success: false,
          error: `Command blocked: matches dangerous pattern`,
          confirmationRequired: true,
          confirmationMessage: `The command "${command}" matches a dangerous pattern. Are you absolutely sure?`,
        };
      }
    }

    if (BLOCKED_COMMANDS.has(command.trim())) {
      return { success: false, error: "Command is blocked for safety" };
    }

    try {
      const { stdout, stderr } = await execFileAsync("sh", ["-c", command], {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024, // 1MB
        env: { ...process.env, TERM: "dumb" },
      });

      return {
        success: true,
        data: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          command,
          cwd,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message ?? String(err),
        data: {
          stdout: err.stdout?.trim() ?? "",
          stderr: err.stderr?.trim() ?? "",
          exitCode: err.code,
          command,
        },
      };
    }
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: "shell_exec",
        description:
          "Execute a shell command and return stdout/stderr. Use for system tasks, running scripts, checking system info.",
        parameters: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "Shell command to execute",
            },
            cwd: {
              type: "string",
              description: "Working directory (defaults to project root)",
            },
            timeout: {
              type: "number",
              description: "Timeout in milliseconds (default: 30000)",
            },
          },
          required: ["command"],
        },
      },
    ];
  }
}
