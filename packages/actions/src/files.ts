import {
  PermissionLevel,
  type ActionWorker,
  type ActionRequest,
  type ActionResult,
  type ToolDefinition,
} from "@agentpilot/core";

export class FilesWorker implements ActionWorker {
  type = "files" as const;
  requiredLevel = PermissionLevel.Modify;

  async execute(request: ActionRequest): Promise<ActionResult> {
    // TODO: Phase 4 - implement file operations
    return {
      success: false,
      error: "Files worker not yet implemented",
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: "read_file",
        description: "Read contents of a file",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to read" },
          },
          required: ["path"],
        },
      },
      {
        name: "write_file",
        description: "Write content to a file",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to write" },
            content: { type: "string", description: "Content to write" },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "list_files",
        description: "List files in a directory",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Directory path" },
          },
          required: ["path"],
        },
      },
    ];
  }
}
