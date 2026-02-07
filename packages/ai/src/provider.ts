import type { AIProvider, AIProviderAdapter } from "@agentpilot/core";
import { AnthropicAdapter } from "./anthropic.js";
import { GeminiAdapter } from "./gemini.js";

export function createProvider(
  provider: AIProvider,
  apiKey: string,
  model?: string,
): AIProviderAdapter {
  switch (provider) {
    case "anthropic":
      return new AnthropicAdapter(apiKey, model);
    case "gemini":
      return new GeminiAdapter(apiKey, model);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
