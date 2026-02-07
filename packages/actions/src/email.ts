import {
  PermissionLevel,
  type ActionWorker,
  type ActionRequest,
  type ActionResult,
  type ToolDefinition,
} from "@agentpilot/core";

export interface EmailConfig {
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
  };
  imap?: {
    host: string;
    port: number;
    tls: boolean;
    auth: { user: string; pass: string };
  };
  from?: string;
}

export class EmailWorker implements ActionWorker {
  type = "email" as const;
  requiredLevel = PermissionLevel.Communicate;
  private config: EmailConfig;

  constructor(config: EmailConfig = {}) {
    this.config = config;
  }

  async execute(request: ActionRequest): Promise<ActionResult> {
    const operation = request.operation;

    try {
      switch (operation) {
        case "send_email": {
          const to = request.params.to as string;
          const subject = request.params.subject as string;
          const body = request.params.body as string;

          if (!to || !subject || !body) {
            return {
              success: false,
              error: "Missing required fields: to, subject, body",
            };
          }

          if (!this.config.smtp) {
            return {
              success: false,
              error: "SMTP not configured. Set up email in Settings.",
            };
          }

          // Confirmation required for sending
          return {
            success: true,
            confirmationRequired: true,
            confirmationMessage: `Send email to "${to}" with subject "${subject}"?`,
            data: { to, subject, bodyPreview: body.slice(0, 200) },
          };
        }

        case "read_emails": {
          if (!this.config.imap) {
            return {
              success: false,
              error: "IMAP not configured. Set up email in Settings.",
            };
          }

          const folder = (request.params.folder as string) ?? "INBOX";
          const limit = (request.params.limit as number) ?? 10;

          // TODO: Implement IMAP reading
          return {
            success: false,
            error: "IMAP email reading coming in next release",
            data: { folder, limit },
          };
        }

        case "search_emails": {
          if (!this.config.imap) {
            return {
              success: false,
              error: "IMAP not configured. Set up email in Settings.",
            };
          }

          const query = request.params.query as string;
          if (!query) {
            return { success: false, error: "No search query provided" };
          }

          return {
            success: false,
            error: "Email search coming in next release",
            data: { query },
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
        name: "send_email",
        description:
          "Send an email (requires confirmation before actually sending)",
        parameters: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient email address" },
            subject: { type: "string", description: "Email subject line" },
            body: { type: "string", description: "Email body text" },
          },
          required: ["to", "subject", "body"],
        },
      },
      {
        name: "read_emails",
        description: "Read recent emails from a folder",
        parameters: {
          type: "object",
          properties: {
            folder: {
              type: "string",
              description: 'Email folder (default: "INBOX")',
            },
            limit: {
              type: "number",
              description: "Max emails to return (default: 10)",
            },
          },
        },
      },
      {
        name: "search_emails",
        description: "Search emails by keyword",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },
    ];
  }
}
