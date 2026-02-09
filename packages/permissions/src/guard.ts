import {
  PermissionLevel,
  PermissionDeniedError,
  ConfirmationRequiredError,
  type ActionRequest,
  type ActionType,
  type ChannelType,
} from "@agentpilot/core";
import { getPermission, logAudit, type AgentPilotDb } from "@agentpilot/db";

const ACTION_REQUIRED_LEVELS: Record<ActionType, PermissionLevel> = {
  browser: PermissionLevel.ReadOnly,
  email: PermissionLevel.Communicate,
  files: PermissionLevel.Modify,
  notes: PermissionLevel.Modify,
  shell: PermissionLevel.Execute,
  scheduler: PermissionLevel.Modify,
};

const DESTRUCTIVE_OPERATIONS = new Set([
  "send_email",
  "delete_file",
]);

export class PermissionGuard {
  constructor(
    private db: AgentPilotDb,
    private defaultLevel: PermissionLevel = PermissionLevel.ReadOnly,
  ) {}

  async check(request: ActionRequest): Promise<{
    allowed: boolean;
    confirmationRequired: boolean;
    confirmationMessage?: string;
  }> {
    const requiredLevel = ACTION_REQUIRED_LEVELS[request.type];
    const currentLevel = await this.getLevel(
      request.channelType,
      request.channelId,
      request.userId,
      request.type,
    );

    if (currentLevel < requiredLevel) {
      throw new PermissionDeniedError(
        `${request.type}:${request.operation}`,
        requiredLevel,
        currentLevel,
      );
    }

    const needsConfirmation = DESTRUCTIVE_OPERATIONS.has(request.operation);

    if (needsConfirmation) {
      return {
        allowed: true,
        confirmationRequired: true,
        confirmationMessage: `Action "${request.operation}" on ${request.type} requires your confirmation. Reply "yes" to proceed.`,
      };
    }

    return { allowed: true, confirmationRequired: false };
  }

  async getLevel(
    channelType: ChannelType,
    channelId: string,
    userId: string,
    actionType: ActionType,
  ): Promise<PermissionLevel> {
    const perm = getPermission(
      this.db,
      channelType,
      channelId,
      userId,
      actionType,
    );
    return (perm?.level as PermissionLevel) ?? this.defaultLevel;
  }

  async logAction(
    request: ActionRequest,
    output: Record<string, unknown>,
    confirmationRequired: boolean,
    confirmed: boolean,
  ) {
    const level = await this.getLevel(
      request.channelType,
      request.channelId,
      request.userId,
      request.type,
    );

    logAudit(this.db, {
      sessionId: request.sessionId,
      channelType: request.channelType,
      channelId: request.channelId,
      userId: request.userId,
      actionType: request.type,
      operation: request.operation,
      input: request.params,
      output,
      permissionLevel: level,
      confirmationRequired,
      confirmed,
    });
  }
}
