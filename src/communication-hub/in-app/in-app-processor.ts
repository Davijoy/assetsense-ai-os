/**
 * In-App Notification Processor
 *
 * Implements the CommunicationProcessor contract to deliver inventory
 * intelligence recommendations via an in-app notification channel.
 *
 * This is a real runtime processor — it stores delivered notifications
 * in an in-memory store that the UI can query. It is structured so
 * email, WhatsApp, voice, or other providers can be added later
 * without changing consumers.
 */

import type { CommunicationRequest } from "../shared/communication-request";
import type { CommunicationResult } from "../shared/communication-result";
import type { CommunicationProcessor } from "../shared/communication-processor";
import type { DeliveryAttempt } from "../shared/delivery-attempt";

/**
 * A delivered in-app notification.
 */
export interface InAppNotification {
  id: string;
  communicationId: string;
  decisionId?: string;
  workspaceId: string;
  correlationId: string;
  title: string;
  message: string;
  priority: string;
  channel: string;
  recipientRole: string;
  sourceDecisionId?: string;
  timestamp: string;
  status: string;
  read: boolean;
  metadata: Record<string, unknown>;
}

/**
 * In-app notification processor.
 * Stores delivered notifications in a static store accessible to the UI.
 */
export class InAppNotificationProcessor implements CommunicationProcessor {
  // Static store so the UI/server can query delivered notifications
  static notifications: InAppNotification[] = [];

  static getNotifications(workspaceId: string): InAppNotification[] {
    return InAppNotificationProcessor.notifications.filter(
      (n) => n.workspaceId === workspaceId,
    );
  }

  static clear(): void {
    InAppNotificationProcessor.notifications = [];
  }

  async process(request: CommunicationRequest): Promise<CommunicationResult> {
    const now = new Date().toISOString();
    const metadata = request.metadata as Record<string, unknown>;

    const notification: InAppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      communicationId: request.communicationId,
      decisionId: request.decisionId,
      workspaceId: request.workspaceId,
      correlationId: request.correlationId,
      title: String(metadata.title ?? "Inventory Intelligence Alert"),
      message: String(metadata.message ?? ""),
      priority: request.priority,
      channel: "IN_APP_NOTIFICATION",
      recipientRole: String(metadata.recipientRole ?? "manager"),
      sourceDecisionId: request.decisionId,
      timestamp: now,
      status: "DELIVERED",
      read: false,
      metadata,
    };

    InAppNotificationProcessor.notifications.push(notification);

    const attempt: DeliveryAttempt = {
      timestamp: now,
      provider: this.getProviderName(),
      messageId: notification.id,
      success: true,
    };

    return {
      communicationId: request.communicationId,
      status: "DELIVERED",
      timestamp: now,
      attempts: [attempt],
      suppressed: false,
      retryCount: 0,
      metadata: {
        notificationId: notification.id,
        recipientRole: notification.recipientRole,
        channel: "IN_APP_NOTIFICATION",
      },
    };
  }

  getSupportedTypes(): string[] {
    return ["IN_APP_NOTIFICATION"];
  }

  getProviderName(): string {
    return "In-App Notification Service";
  }
}
