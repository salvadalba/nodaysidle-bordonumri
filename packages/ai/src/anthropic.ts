import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProviderAdapter,
  AIMessage,
  AIResponse,
  ToolDefinition,
  ToolCall,
} from "@agentpilot/core";
import { ProviderError } from "@agentpilot/core";

export class AnthropicAdapter implements AIProviderAdapter {
  provider = "anthropic" as const;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model ?? "claude-haiku-4-5-20251001";
  }

  async chat(
    messages: AIMessage[],
    tools?: ToolDefinition[],
  ): Promise<AIResponse> {
    try {
      const systemMsg = messages.find((m) => m.role === "system");
      const chatMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemMsg?.content,
        messages: chatMessages,
        tools: tools?.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters as Anthropic.Tool["input_schema"],
        })),
      });

      const textContent = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as Anthropic.TextBlock).text)
        .join("");

      const toolCalls: ToolCall[] = response.content
        .filter((b) => b.type === "tool_use")
        .map((b) => {
          const block = b as Anthropic.ToolUseBlock;
          return {
            id: block.id,
            name: block.name,
            arguments: block.input as Record<string, unknown>,
          };
        });

      return {
        content: textContent,
        toolCalls,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (err) {
      throw new ProviderError(
        "anthropic",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async *stream(
    messages: AIMessage[],
    tools?: ToolDefinition[],
  ): AsyncIterable<AIResponse> {
    // Simplified: for MVP, just yield the full response
    const response = await this.chat(messages, tools);
    yield response;
  }
}
