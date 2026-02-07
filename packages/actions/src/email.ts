import {
  PermissionLevel,
  type ActionWorker,
  type ActionRequest,
  type ActionResult,
  type ToolDefinition,
} from "@agentpilot/core";

export class EmailWorker implements ActionWorker {
  type = "email" as const;
  requiredLevel = PermissionLevel.Communicate;

  async execute(request: ActionRequest): Promise<ActionResult> {
    // TODO: Phase 4 - implement with IMAP/SMTP or Gmail API
    return {
      success: false,
      error: "Email worker not yet implemented",
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: "read_emails",
        description: "Read recent emails from inbox",
        parameters: {
          type: "object",
          properties: {
            folder: { type: "string", description: "Email folder", default: "INBOX" },
            limit: { type: "number", description: "Max emails to return", default: 10 },
          },
        },
      },
      {
        name: "send_email",
        description: "Send an email to a recipient",
        parameters: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient email address" },
            subject: { type: "string", description: "Email subject" },
            body: { type: "string", description: "Email body" },
          },
          required: ["to", "subject", "body"],
        },
      },
    ];
  }
}
