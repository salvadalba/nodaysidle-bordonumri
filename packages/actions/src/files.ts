import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { join, resolve, relative } from "node:path";
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
  private rootDir: string;

  constructor(rootDir?: string) {
    this.rootDir = rootDir ?? process.cwd();
  }

  private validatePath(inputPath: string): string {
    const resolved = resolve(this.rootDir, inputPath);
    const rel = relative(this.rootDir, resolved);
    if (rel.startsWith("..") || resolve(resolved) !== resolved) {
      throw new Error(
        `Path traversal blocked: "${inputPath}" resolves outside allowed root`,
      );
    }
    return resolved;
  }

  async execute(request: ActionRequest): Promise<ActionResult> {
    const operation = request.operation;

    try {
      switch (operation) {
        case "read_file": {
          const path = this.validatePath(request.params.path as string);
          if (!existsSync(path)) {
            return { success: false, error: `File not found: ${path}` };
          }
          const content = readFileSync(path, "utf-8");
          return { success: true, data: { path, content, size: content.length } };
        }

        case "write_file": {
          const path = this.validatePath(request.params.path as string);
          const content = request.params.content as string;
          const dir = resolve(path, "..");
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          writeFileSync(path, content, "utf-8");
          return { success: true, data: { path, bytesWritten: content.length } };
        }

        case "list_files": {
          const path = this.validatePath(
            (request.params.path as string) ?? ".",
          );
          if (!existsSync(path)) {
            return { success: false, error: `Directory not found: ${path}` };
          }
          const entries = readdirSync(path).map((name) => {
            const fullPath = join(path, name);
            const stat = statSync(fullPath);
            return {
              name,
              type: stat.isDirectory() ? "directory" : "file",
              size: stat.size,
              modified: stat.mtime.toISOString(),
            };
          });
          return { success: true, data: { path, entries } };
        }

        case "move_file": {
          const from = this.validatePath(request.params.from as string);
          const to = this.validatePath(request.params.to as string);
          if (!existsSync(from)) {
            return { success: false, error: `Source not found: ${from}` };
          }
          renameSync(from, to);
          return { success: true, data: { from, to } };
        }

        case "delete_file": {
          const path = this.validatePath(request.params.path as string);
          if (!existsSync(path)) {
            return { success: false, error: `File not found: ${path}` };
          }
          return {
            success: true,
            confirmationRequired: true,
            confirmationMessage: `Delete "${path}"? This cannot be undone.`,
            data: { path },
          };
        }

        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message ?? String(err) };
    }
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: "read_file",
        description: "Read the contents of a file",
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
        description: "Write content to a file (creates directories as needed)",
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
        description: "List files and directories in a path",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Directory path (defaults to root)",
            },
          },
        },
      },
      {
        name: "move_file",
        description: "Move or rename a file",
        parameters: {
          type: "object",
          properties: {
            from: { type: "string", description: "Source path" },
            to: { type: "string", description: "Destination path" },
          },
          required: ["from", "to"],
        },
      },
      {
        name: "delete_file",
        description: "Delete a file (requires confirmation)",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to delete" },
          },
          required: ["path"],
        },
      },
    ];
  }
}
