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
  private browser: any = null;

  async execute(request: ActionRequest): Promise<ActionResult> {
    const operation = request.operation;

    try {
      switch (operation) {
        case "browse_web": {
          const url = request.params.url as string;
          if (!url) {
            return { success: false, error: "No URL provided" };
          }

          // Lazy-load Playwright to avoid requiring it when not used
          const { chromium } = await import("playwright");

          if (!this.browser) {
            this.browser = await chromium.launch({ headless: true });
          }

          const page = await this.browser.newPage();
          try {
            await page.goto(url, { timeout: 15000, waitUntil: "domcontentloaded" });
            const title = await page.title();
            const text = await page.evaluate(() => {
              const body = document.body;
              // Remove scripts and styles
              body.querySelectorAll("script, style, nav, footer, header").forEach(
                (el: Element) => el.remove(),
              );
              return body.innerText?.slice(0, 5000) ?? "";
            });

            return {
              success: true,
              data: {
                url,
                title,
                content: text.trim(),
              },
            };
          } finally {
            await page.close();
          }
        }

        case "web_search": {
          const query = request.params.query as string;
          if (!query) {
            return { success: false, error: "No search query provided" };
          }

          // Use DuckDuckGo lite for search (no API key needed)
          const { chromium } = await import("playwright");

          if (!this.browser) {
            this.browser = await chromium.launch({ headless: true });
          }

          const page = await this.browser.newPage();
          try {
            const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { timeout: 15000 });
            const results = await page.evaluate(() => {
              const links = Array.from(document.querySelectorAll("a.result-link, .result-snippet"));
              return links.slice(0, 5).map((el) => ({
                text: el.textContent?.trim() ?? "",
                href: (el as HTMLAnchorElement).href ?? "",
              }));
            });

            return {
              success: true,
              data: { query, results },
            };
          } finally {
            await page.close();
          }
        }

        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message ?? String(err) };
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: "browse_web",
        description:
          "Navigate to a URL and extract the page title and text content",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to navigate to" },
          },
          required: ["url"],
        },
      },
      {
        name: "web_search",
        description:
          "Search the web using DuckDuckGo and return top results",
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
