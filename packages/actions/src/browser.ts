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
    const operation = request.operation;

    try {
      switch (operation) {
        case "browse_web": {
          const url = request.params.url as string;
          if (!url) {
            return { success: false, error: "No URL provided" };
          }

          const res = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; AgentPilot/0.1; +https://github.com/salvadalba/nodaysidle-bordonumri)",
              Accept: "text/html,application/xhtml+xml,*/*",
            },
            signal: AbortSignal.timeout(15000),
          });

          if (!res.ok) {
            return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
          }

          const html = await res.text();
          const title = extractTitle(html);
          const text = extractText(html).slice(0, 5000);

          return {
            success: true,
            data: { url, title, content: text },
          };
        }

        case "web_search": {
          const query = request.params.query as string;
          if (!query) {
            return { success: false, error: "No search query provided" };
          }

          // Use DuckDuckGo HTML for search
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
          const res = await fetch(searchUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,*/*",
            },
            signal: AbortSignal.timeout(15000),
          });

          if (!res.ok) {
            return { success: false, error: `Search failed: HTTP ${res.status}` };
          }

          const html = await res.text();
          const results = extractSearchResults(html);

          return {
            success: true,
            data: { query, results },
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
        name: "browse_web",
        description:
          "Navigate to a URL and extract the page title and text content",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "Full URL to navigate to (must include https://)" },
          },
          required: ["url"],
        },
      },
      {
        name: "web_search",
        description:
          "Search the web using DuckDuckGo and return top results with titles, URLs, and snippets",
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

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : "";
}

function extractText(html: string): string {
  // Remove script, style, nav, footer, header tags
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "");

  // Remove all HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  // Decode entities and normalize whitespace
  cleaned = decodeHtmlEntities(cleaned);
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

function extractSearchResults(
  html: string,
): { title: string; url: string; snippet: string }[] {
  const results: { title: string; url: string; snippet: string }[] = [];

  // DuckDuckGo HTML results are in <a class="result__a"> tags
  const resultBlocks = html.split(/class="result__body"/gi);

  for (let i = 1; i < resultBlocks.length && results.length < 8; i++) {
    const block = resultBlocks[i];

    // Extract URL from result__a link
    const urlMatch = block.match(/href="([^"]+)"[^>]*class="result__a"/i)
      || block.match(/class="result__a"[^>]*href="([^"]+)"/i)
      || block.match(/href="(https?:\/\/[^"]+)"/i);

    // Extract title from result__a
    const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/i);

    // Extract snippet from result__snippet
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/[a-z]/i);

    if (urlMatch) {
      let url = urlMatch[1];
      // DuckDuckGo wraps URLs in a redirect
      const uddgMatch = url.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        url = decodeURIComponent(uddgMatch[1]);
      }

      results.push({
        title: titleMatch ? stripTags(titleMatch[1]).trim() : "",
        url,
        snippet: snippetMatch ? stripTags(snippetMatch[1]).trim() : "",
      });
    }
  }

  return results;
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ""));
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)));
}
