export class AgentPilotError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "AgentPilotError";
  }
}

export class PermissionDeniedError extends AgentPilotError {
  constructor(action: string, requiredLevel: number, currentLevel: number) {
    super(
      `Permission denied for "${action}": requires level ${requiredLevel}, current level is ${currentLevel}`,
      "PERMISSION_DENIED",
    );
    this.name = "PermissionDeniedError";
  }
}

export class ConfirmationRequiredError extends AgentPilotError {
  constructor(
    action: string,
    public confirmationMessage: string,
  ) {
    super(
      `Action "${action}" requires user confirmation: ${confirmationMessage}`,
      "CONFIRMATION_REQUIRED",
    );
    this.name = "ConfirmationRequiredError";
  }
}

export class ProviderError extends AgentPilotError {
  constructor(provider: string, message: string) {
    super(`AI provider "${provider}" error: ${message}`, "PROVIDER_ERROR");
    this.name = "ProviderError";
  }
}

export class ChannelError extends AgentPilotError {
  constructor(channel: string, message: string) {
    super(`Channel "${channel}" error: ${message}`, "CHANNEL_ERROR");
    this.name = "ChannelError";
  }
}
