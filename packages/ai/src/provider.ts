import type { AIProvider, AIProviderAdapter } from "@agentpilot/core";
import { AnthropicAdapter } from "./anthropic.js";
import { GeminiAdapter } from "./gemini.js";
import { OpenRouterAdapter } from "./openrouter.js";

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
    case "openrouter":
      return new OpenRouterAdapter(apiKey, model);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
