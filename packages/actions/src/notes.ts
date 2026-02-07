import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  appendFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  PermissionLevel,
  type ActionWorker,
  type ActionRequest,
  type ActionResult,
  type ToolDefinition,
} from "@agentpilot/core";

export class NotesWorker implements ActionWorker {
  type = "notes" as const;
  requiredLevel = PermissionLevel.Modify;
  private notesDir: string;

  constructor(notesDir?: string) {
    this.notesDir = notesDir ?? join(process.env.HOME ?? "~", ".agentpilot", "notes");
    if (!existsSync(this.notesDir)) {
      mkdirSync(this.notesDir, { recursive: true });
    }
  }

  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
  }

  private notePath(name: string): string {
    return join(this.notesDir, `${this.sanitizeName(name)}.md`);
  }

  async execute(request: ActionRequest): Promise<ActionResult> {
    const operation = request.operation;

    try {
      switch (operation) {
        case "create_note": {
          const name = request.params.name as string;
          const content = request.params.content as string;
          if (!name || !content) {
            return { success: false, error: "Missing name or content" };
          }
          const path = this.notePath(name);
          const header = `# ${name}\n_Created: ${new Date().toISOString()}_\n\n`;
          writeFileSync(path, header + content, "utf-8");
          return { success: true, data: { name, path } };
        }

        case "append_note": {
          const name = request.params.name as string;
          const content = request.params.content as string;
          if (!name || !content) {
            return { success: false, error: "Missing name or content" };
          }
          const path = this.notePath(name);
          if (!existsSync(path)) {
            return { success: false, error: `Note "${name}" not found` };
          }
          appendFileSync(path, `\n\n---\n_Updated: ${new Date().toISOString()}_\n\n${content}`, "utf-8");
          return { success: true, data: { name, path } };
        }

        case "read_note": {
          const name = request.params.name as string;
          if (!name) {
            return { success: false, error: "Missing note name" };
          }
          const path = this.notePath(name);
          if (!existsSync(path)) {
            return { success: false, error: `Note "${name}" not found` };
          }
          const content = readFileSync(path, "utf-8");
          return { success: true, data: { name, content } };
        }

        case "list_notes": {
          const files = readdirSync(this.notesDir)
            .filter((f) => f.endsWith(".md"))
            .map((f) => f.replace(/\.md$/, ""));
          return { success: true, data: { notes: files, count: files.length } };
        }

        case "search_notes": {
          const query = (request.params.query as string)?.toLowerCase();
          if (!query) {
            return { success: false, error: "Missing search query" };
          }
          const files = readdirSync(this.notesDir).filter((f) =>
            f.endsWith(".md"),
          );
          const matches: { name: string; preview: string }[] = [];
          for (const file of files) {
            const content = readFileSync(join(this.notesDir, file), "utf-8");
            if (content.toLowerCase().includes(query)) {
              const idx = content.toLowerCase().indexOf(query);
              const start = Math.max(0, idx - 50);
              const end = Math.min(content.length, idx + query.length + 50);
              matches.push({
                name: file.replace(/\.md$/, ""),
                preview: `...${content.slice(start, end)}...`,
              });
            }
          }
          return { success: true, data: { query, matches, count: matches.length } };
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
        name: "create_note",
        description: "Create a new note with a name and content",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Note name/title" },
            content: { type: "string", description: "Note content (markdown)" },
          },
          required: ["name", "content"],
        },
      },
      {
        name: "append_note",
        description: "Append content to an existing note",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Note name to append to" },
            content: { type: "string", description: "Content to append" },
          },
          required: ["name", "content"],
        },
      },
      {
        name: "read_note",
        description: "Read the contents of a note",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Note name to read" },
          },
          required: ["name"],
        },
      },
      {
        name: "list_notes",
        description: "List all saved notes",
        parameters: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "search_notes",
        description: "Search through notes by keyword",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search term" },
          },
          required: ["query"],
        },
      },
    ];
  }
}
