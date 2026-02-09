import type {
  AIProviderAdapter,
  AIMessage,
  AIResponse,
  ToolDefinition,
  ToolCall,
} from "@agentpilot/core";
import { ProviderError } from "@agentpilot/core";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
}

interface OpenRouterTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class OpenRouterAdapter implements AIProviderAdapter {
  provider = "openrouter" as const;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model ?? "anthropic/claude-haiku-4.5";
  }

  async chat(
    messages: AIMessage[],
    tools?: ToolDefinition[],
  ): Promise<AIResponse> {
    try {
      const openRouterMessages: OpenRouterMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const openRouterTools: OpenRouterTool[] | undefined = tools?.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));

      const body: Record<string, unknown> = {
        model: this.model,
        messages: openRouterMessages,
        max_tokens: 4096,
      };

      if (openRouterTools?.length) {
        body.tools = openRouterTools;
        body.tool_choice = "auto";
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API ${response.status}: ${errText}`);
      }

      const data = await response.json() as any;
      const choice = data.choices?.[0];

      if (!choice) {
        throw new Error("No response from OpenRouter");
      }

      const content = choice.message?.content ?? "";
      const toolCalls: ToolCall[] = (choice.message?.tool_calls ?? []).map(
        (tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        }),
      );

      return {
        content,
        toolCalls,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
      };
    } catch (err) {
      throw new ProviderError(
        "openrouter",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async *stream(
    messages: AIMessage[],
    tools?: ToolDefinition[],
  ): AsyncIterable<AIResponse> {
    const response = await this.chat(messages, tools);
    yield response;
  }
}
