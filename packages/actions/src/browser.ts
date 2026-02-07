import {
  PermissionLevel,
  type ActionWorker,
  type ActionRequest,
  type ActionResult,
  type ToolDefinition,
} from "@agentpilot/core";

export class BrowserWorker implements ActionWorker {
  type = "browser" as const;
  requiredLevel = PermissionLevel.ReadOnly;

  async execute(request: ActionRequest): Promise<ActionResult> {
    // TODO: Phase 4 - implement with Playwright
    return {
      success: false,
      error: "Browser worker not yet implemented",
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: "browse_web",
        description: "Navigate to a URL and extract page content",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to navigate to" },
            extract: {
              type: "string",
              description: "What to extract from the page",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "web_search",
        description: "Search the web for information",
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
