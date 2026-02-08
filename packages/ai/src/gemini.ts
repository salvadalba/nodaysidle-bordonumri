import { GoogleGenerativeAI, type FunctionDeclarationSchema } from "@google/generative-ai";
import type {
  AIProviderAdapter,
  AIMessage,
  AIResponse,
  ToolDefinition,
  ToolCall,
} from "@agentpilot/core";
import { ProviderError } from "@agentpilot/core";

export class GeminiAdapter implements AIProviderAdapter {
  provider = "gemini" as const;
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model ?? "gemini-2.0-flash";
  }

  async chat(
    messages: AIMessage[],
    tools?: ToolDefinition[],
  ): Promise<AIResponse> {
    try {
      const genModel = this.client.getGenerativeModel({
        model: this.model,
        tools: tools?.length
          ? [
              {
                functionDeclarations: tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters as unknown as FunctionDeclarationSchema,
                })),
              },
            ]
          : undefined,
      });

      const systemMsg = messages.find((m) => m.role === "system");
      const chatMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? ("model" as const) : ("user" as const),
          parts: [{ text: m.content }],
        }));

      const chat = genModel.startChat({
        history: chatMessages.slice(0, -1),
        systemInstruction: systemMsg
          ? { role: "user" as const, parts: [{ text: systemMsg.content }] }
          : undefined,
      });

      const lastMessage = chatMessages[chatMessages.length - 1];
      const result = await chat.sendMessage(
        lastMessage?.parts.map((p) => p.text).join("") ?? "",
      );
      const response = result.response;

      const text = response.text() ?? "";
      const toolCalls: ToolCall[] = [];

      const candidates = response.candidates ?? [];
      for (const candidate of candidates) {
        for (const part of candidate.content?.parts ?? []) {
          if ("functionCall" in part && part.functionCall) {
            toolCalls.push({
              id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              name: part.functionCall.name,
              arguments: (part.functionCall.args as Record<string, unknown>) ?? {},
            });
          }
        }
      }

      return {
        content: text,
        toolCalls,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    } catch (err) {
      throw new ProviderError(
        "gemini",
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
