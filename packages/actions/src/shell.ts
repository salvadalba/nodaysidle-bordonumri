import {
  PermissionLevel,
  type ActionWorker,
  type ActionRequest,
  type ActionResult,
  type ToolDefinition,
} from "@agentpilot/core";

export class ShellWorker implements ActionWorker {
  type = "shell" as const;
  requiredLevel = PermissionLevel.Execute;

  async execute(request: ActionRequest): Promise<ActionResult> {
    // TODO: Phase 4 - implement with child_process
    return {
      success: false,
      error: "Shell worker not yet implemented",
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: "shell_exec",
        description: "Execute a shell command",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string", description: "Shell command to execute" },
            cwd: { type: "string", description: "Working directory" },
            timeout: { type: "number", description: "Timeout in ms", default: 30000 },
          },
          required: ["command"],
        },
      },
    ];
  }
}
