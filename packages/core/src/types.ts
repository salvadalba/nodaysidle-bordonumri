// --- Channels ---

export type ChannelType = "telegram" | "discord" | "simplex";

export interface ChannelMessage {
  id: string;
  channelType: ChannelType;
  channelId: string;
  userId: string;
  content: string;
  attachments?: Attachment[];
  timestamp: Date;
}

export interface Attachment {
  type: "image" | "file" | "audio" | "video";
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface ChannelAdapter {
  type: ChannelType;
  start(): Promise<void>;
  stop(): Promise<void>;
  sendMessage(channelId: string, content: string): Promise<void>;
  onMessage(handler: (message: ChannelMessage) => void): void;
}

// --- AI Providers ---

export type AIProvider = "anthropic" | "gemini";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCall[];
}

export interface AIResponse {
  content: string;
  toolCalls: ToolCall[];
  usage: { inputTokens: number; outputTokens: number };
}

export interface AIProviderAdapter {
  provider: AIProvider;
  chat(messages: AIMessage[], tools?: ToolDefinition[]): Promise<AIResponse>;
  stream(
    messages: AIMessage[],
    tools?: ToolDefinition[],
  ): AsyncIterable<AIResponse>;
}

// --- Permissions ---

export enum PermissionLevel {
  ReadOnly = 0,
  Communicate = 1,
  Modify = 2,
  Execute = 3,
  Admin = 4,
}

export interface PermissionRule {
  id: string;
  channelType: ChannelType;
  channelId: string;
  userId?: string;
  actionType: ActionType;
  level: PermissionLevel;
}

// --- Actions ---

export type ActionType = "email" | "browser" | "files" | "shell";

export interface ActionRequest {
  type: ActionType;
  operation: string;
  params: Record<string, unknown>;
  sessionId: string;
  channelType: ChannelType;
  channelId: string;
  userId: string;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  confirmationRequired?: boolean;
  confirmationMessage?: string;
}

export interface ActionWorker {
  type: ActionType;
  requiredLevel: PermissionLevel;
  execute(request: ActionRequest): Promise<ActionResult>;
  getTools(): ToolDefinition[];
}

// --- Sessions ---

export interface Session {
  id: string;
  channelType: ChannelType;
  channelId: string;
  userId: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Audit ---

export interface AuditEntry {
  id: string;
  sessionId: string;
  channelType: ChannelType;
  channelId: string;
  userId: string;
  actionType: ActionType;
  operation: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  permissionLevel: PermissionLevel;
  confirmationRequired: boolean;
  confirmed: boolean;
  createdAt: Date;
}
