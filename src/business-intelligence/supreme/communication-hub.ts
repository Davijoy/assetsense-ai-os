/**
 * Supreme Intelligence Orchestrator - Communication Hub Integration
 * 
 * Connects coordinated recommendations and approval workflows to the
 * Communication Hub for multi-channel delivery (in-app, email, WhatsApp, SMS, calls).
 */

import type { CoordinatedRecommendation, ApprovalRequest, ProposedAction } from "./types";
import type { EvidenceItem } from "../shared/evidence-item";
import type { Event } from "@/lib/event-fabric/event";
import { SUPREME_EVENT_TYPES, createSupremeApprovalRequestedEvent } from "@/lib/event-fabric/supreme-events";

/** Communication channel types */
export type CommunicationChannel = "in_app" | "email" | "whatsapp" | "sms" | "call";

/** Communication message */
export interface CommunicationMessage {
  messageId: string;
  channel: CommunicationChannel;
  recipientId: string;
  recipientType: "user" | "role" | "external";
  subject: string;
  body: string;
  priority: "low" | "normal" | "high" | "urgent";
  metadata: Record<string, unknown>;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  correlationId: string;
  causationId: string;
}

/** Approval notification payload */
export interface ApprovalNotificationPayload {
  approvalRequestId: string;
  recommendationId: string;
  title: string;
  description: string;
  proposedActions: ProposedAction[];
  evidence: EvidenceItem[];
  expiresAt: string;
  approverRoles: string[];
  requiredApprovals: number;
  workspaceId: string;
  correlationId: string;
  causationId: string;
}

/** Recommendation notification payload */
export interface RecommendationNotificationPayload {
  recommendationId: string;
  title: string;
  businessReason: string;
  affectedSegment: string;
  recommendedAction: string;
  expectedImpact: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  sourceDomains: ("customer" | "inventory" | "market" | "crm")[];
  approvalRequired: boolean;
  approvalRequestId?: string;
  workspaceId: string;
  correlationId: string;
  causationId: string;
}

/** Communication Hub interface */
export interface ICommunicationHub {
  /** Send a message via specified channel */
  sendMessage(message: Omit<CommunicationMessage, "messageId" | "status" | "sentAt" | "deliveredAt" | "readAt">): Promise<CommunicationMessage>;
  
  /** Send approval request notification to approvers */
  notifyApprovalRequest(payload: ApprovalNotificationPayload): Promise<CommunicationMessage[]>;
  
  /** Send recommendation notification to stakeholders */
  notifyRecommendation(payload: RecommendationNotificationPayload): Promise<CommunicationMessage[]>;
  
  /** Send approval decision notification */
  notifyApprovalDecision(
    approvalRequestId: string,
    decision: "approved" | "rejected",
    approverId: string,
    reason?: string,
  ): Promise<CommunicationMessage[]>;
  
  /** Get message status */
  getMessageStatus(messageId: string): Promise<CommunicationMessage | null>;
  
  /** Get messages for a correlation ID */
  getMessagesByCorrelation(correlationId: string): Promise<CommunicationMessage[]>;
}

/** In-memory Communication Hub implementation (replace with real implementation) */
export class InMemoryCommunicationHub implements ICommunicationHub {
  private messages: Map<string, CommunicationMessage> = new Map();
  private messageIndexByCorrelation: Map<string, Set<string>> = new Map();

  async sendMessage(message: Omit<CommunicationMessage, "messageId" | "status" | "sentAt" | "deliveredAt" | "readAt">): Promise<CommunicationMessage> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const fullMessage: CommunicationMessage = {
      ...message,
      messageId,
      status: "pending",
      sentAt: new Date().toISOString(),
    };

    this.messages.set(messageId, fullMessage);
    
    // Index by correlation ID
    if (!this.messageIndexByCorrelation.has(message.correlationId)) {
      this.messageIndexByCorrelation.set(message.correlationId, new Set());
    }
    this.messageIndexByCorrelation.get(message.correlationId)!.add(messageId);

    // Simulate delivery
    setTimeout(() => {
      const msg = this.messages.get(messageId);
      if (msg) {
        msg.status = "delivered";
        msg.deliveredAt = new Date().toISOString();
      }
    }, 100);

    return fullMessage;
  }

  async notifyApprovalRequest(payload: ApprovalNotificationPayload): Promise<CommunicationMessage[]> {
    const messages: CommunicationMessage[] = [];

    // Create in-app notification for each approver role
    for (const role of payload.approverRoles) {
      const message = await this.sendMessage({
        channel: "in_app",
        recipientId: role,
        recipientType: "role",
        subject: `Approval Required: ${payload.title}`,
        body: this.formatApprovalRequestBody(payload),
        priority: "high",
        metadata: {
          approvalRequestId: payload.approvalRequestId,
          recommendationId: payload.recommendationId,
          type: "approval_request",
          actions: payload.proposedActions.map(a => a.actionId),
        },
        correlationId: payload.correlationId,
        causationId: payload.causationId,
      });
      messages.push(message);
    }

    // Also send email for high-priority approvals
    if (payload.proposedActions.some(a => a.requiresHumanApproval)) {
      for (const role of payload.approverRoles) {
        const message = await this.sendMessage({
          channel: "email",
          recipientId: role,
          recipientType: "role",
          subject: `Approval Required: ${payload.title}`,
          body: this.formatApprovalRequestEmail(payload),
          priority: "high",
          metadata: {
            approvalRequestId: payload.approvalRequestId,
            recommendationId: payload.recommendationId,
            type: "approval_request",
          },
          correlationId: payload.correlationId,
          causationId: payload.causationId,
        });
        messages.push(message);
      }
    }

    return messages;
  }

  async notifyRecommendation(payload: RecommendationNotificationPayload): Promise<CommunicationMessage[]> {
    const messages: CommunicationMessage[] = [];

    // In-app notification for relevant roles
    const targetRoles = this.getTargetRolesForRecommendation(payload);
    
    for (const role of targetRoles) {
      const message = await this.sendMessage({
        channel: "in_app",
        recipientId: role,
        recipientType: "role",
        subject: `New Recommendation: ${payload.title}`,
        body: this.formatRecommendationBody(payload),
        priority: this.mapPriorityToCommunication(payload.priority),
        metadata: {
          recommendationId: payload.recommendationId,
          type: "recommendation",
          approvalRequired: payload.approvalRequired,
          approvalRequestId: payload.approvalRequestId,
          sourceDomains: payload.sourceDomains,
        },
        correlationId: payload.correlationId,
        causationId: payload.causationId,
      });
      messages.push(message);
    }

    // For CRITICAL recommendations, also send WhatsApp/SMS to managers
    if (payload.priority === "CRITICAL") {
      for (const role of ["manager", "admin"]) {
        const message = await this.sendMessage({
          channel: "whatsapp",
          recipientId: role,
          recipientType: "role",
          subject: `CRITICAL: ${payload.title}`,
          body: this.formatCriticalRecommendationWhatsApp(payload),
          priority: "urgent",
          metadata: {
            recommendationId: payload.recommendationId,
            type: "recommendation_critical",
          },
          correlationId: payload.correlationId,
          causationId: payload.causationId,
        });
        messages.push(message);
      }
    }

    return messages;
  }

  async notifyApprovalDecision(
    approvalRequestId: string,
    decision: "approved" | "rejected",
    approverId: string,
    reason?: string,
  ): Promise<CommunicationMessage[]> {
    const messages: CommunicationMessage[] = [];

    // Find the original approval request message to get correlation ID
    const originalMessages = Array.from(this.messages.values()).filter(
      m => m.metadata.approvalRequestId === approvalRequestId
    );

    const correlationId = originalMessages[0]?.correlationId ?? "unknown";
    const causationId = originalMessages[0]?.causationId ?? "unknown";

    // Notify the requester and relevant stakeholders
    const message = await this.sendMessage({
      channel: "in_app",
      recipientId: "requester",
      recipientType: "role",
      subject: `Approval ${decision === "approved" ? "Granted" : "Denied"}: ${approvalRequestId}`,
      body: `Approval request ${approvalRequestId} has been ${decision} by ${approverId}.${reason ? ` Reason: ${reason}` : ""}`,
      priority: "normal",
      metadata: {
        approvalRequestId,
        decision,
        approverId,
        reason,
        type: "approval_decision",
      },
      correlationId,
      causationId,
    });
    messages.push(message);

    return messages;
  }

  async getMessageStatus(messageId: string): Promise<CommunicationMessage | null> {
    return this.messages.get(messageId) ?? null;
  }

  async getMessagesByCorrelation(correlationId: string): Promise<CommunicationMessage[]> {
    const messageIds = this.messageIndexByCorrelation.get(correlationId) ?? new Set();
    return Array.from(messageIds).map(id => this.messages.get(id)!).filter(Boolean);
  }

  // ─── Private formatting methods ────────────────────────────────────

  private formatApprovalRequestBody(payload: ApprovalNotificationPayload): string {
    return `
**Approval Request**

**Title:** ${payload.title}
**Description:** ${payload.description}
**Expires:** ${new Date(payload.expiresAt).toLocaleString()}
**Required Approvals:** ${payload.requiredApprovals}

**Proposed Actions:**
${payload.proposedActions.map(a => `- ${a.type.toUpperCase()}: ${a.description} (Target: ${a.targetEntity})`).join("\n")}

**Evidence:**
${payload.evidence.map(e => `- ${e.factor}: ${JSON.stringify(e.value)} (Impact: ${e.impact}, Confidence: ${e.confidence})`).join("\n")}

Please review and approve/reject this request.
    `.trim();
  }

  private formatApprovalRequestEmail(payload: ApprovalNotificationPayload): string {
    return `
<html>
<body>
<h2>Approval Required: ${payload.title}</h2>
<p><strong>Description:</strong> ${payload.description}</p>
<p><strong>Expires:</strong> ${new Date(payload.expiresAt).toLocaleString()}</p>
<p><strong>Required Approvals:</strong> ${payload.requiredApprovals}</p>

<h3>Proposed Actions:</h3>
<ul>
${payload.proposedActions.map(a => `<li><strong>${a.type.toUpperCase()}</strong>: ${a.description} (Target: ${a.targetEntity})</li>`).join("")}
</ul>

<h3>Evidence:</h3>
<ul>
${payload.evidence.map(e => `<li><strong>${e.factor}</strong>: ${JSON.stringify(e.value)} (Impact: ${e.impact}, Confidence: ${e.confidence})</li>`).join("")}
</ul>

<p>Please log in to the system to approve or reject this request.</p>
</body>
</html>
    `.trim();
  }

  private formatRecommendationBody(payload: RecommendationNotificationPayload): string {
    return `
**New Coordinated Recommendation**

**Title:** ${payload.title}
**Priority:** ${payload.priority}
**Confidence:** ${(payload.confidence * 100).toFixed(0)}%
**Source Domains:** ${payload.sourceDomains.join(", ")}

**Business Reason:** ${payload.businessReason}
**Affected Segment:** ${payload.affectedSegment}
**Recommended Action:** ${payload.recommendedAction}
**Expected Impact:** ${payload.expectedImpact}

${payload.approvalRequired ? `⚠️ **Approval Required** - Approval Request ID: ${payload.approvalRequestId}` : "✅ No approval required"}

View details in the Intelligence Dashboard.
    `.trim();
  }

  private formatCriticalRecommendationWhatsApp(payload: RecommendationNotificationPayload): string {
    return `🚨 *CRITICAL RECOMMENDATION*

*${payload.title}*

Priority: ${payload.priority} | Confidence: ${(payload.confidence * 100).toFixed(0)}%
Domains: ${payload.sourceDomains.join(", ")}

${payload.businessReason}

Action: ${payload.recommendedAction}
Impact: ${payload.expectedImpact}

${payload.approvalRequired ? "⚠️ Approval required" : "✅ Auto-approved"}

Check dashboard for details.`;
  }

  private getTargetRolesForRecommendation(payload: RecommendationNotificationPayload): string[] {
    const roles = new Set<string>();
    
    // Always notify agents and senior agents
    roles.add("agent");
    roles.add("senior_agent");
    
    // Add domain-specific roles
    if (payload.sourceDomains.includes("customer")) {
      roles.add("customer_success");
    }
    if (payload.sourceDomains.includes("inventory")) {
      roles.add("sales");
      roles.add("inventory_manager");
    }
    if (payload.sourceDomains.includes("market")) {
      roles.add("market_analyst");
      roles.add("pricing_manager");
    }
    if (payload.sourceDomains.includes("crm")) {
      roles.add("crm_admin");
      roles.add("sales_manager");
    }
    
    // For high priority, notify managers
    if (payload.priority === "HIGH" || payload.priority === "CRITICAL") {
      roles.add("manager");
      roles.add("admin");
    }
    
    return Array.from(roles);
  }

  private mapPriorityToCommunication(priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"): "low" | "normal" | "high" | "urgent" {
    switch (priority) {
      case "CRITICAL": return "urgent";
      case "HIGH": return "high";
      case "MEDIUM": return "normal";
      case "LOW": return "low";
    }
  }
}

/** Communication Hub event publisher */
export class CommunicationHubEventPublisher {
  constructor(public hub: ICommunicationHub) {}

  /**
   * Publish approval request event and send notifications
   */
  async publishApprovalRequest(
    approvalRequest: ApprovalRequest,
    recommendation: CoordinatedRecommendation,
  ): Promise<{ event: Event; messages: CommunicationMessage[] }> {
    const event = createSupremeApprovalRequestedEvent(
      {
        workspaceId: approvalRequest.workspaceId,
        correlationId: approvalRequest.correlationId,
        causationId: approvalRequest.correlationId, // Use correlationId as causationId fallback
        approvalRequest,
        generatedAt: new Date().toISOString(),
      },
      approvalRequest.correlationId,
      approvalRequest.correlationId, // Use correlationId as causationId fallback
    );

    const messages = await this.hub.notifyApprovalRequest({
      approvalRequestId: approvalRequest.requestId,
      recommendationId: approvalRequest.recommendationId,
      title: approvalRequest.title,
      description: approvalRequest.description,
      proposedActions: approvalRequest.proposedActions,
      evidence: approvalRequest.evidence,
      expiresAt: approvalRequest.expiresAt,
      approverRoles: approvalRequest.approvers,
      requiredApprovals: approvalRequest.requiredApprovals,
      workspaceId: approvalRequest.workspaceId,
      correlationId: approvalRequest.correlationId,
      causationId: approvalRequest.causationId,
    });

    return { event, messages };
  }

  /**
   * Publish recommendation event and send notifications
   */
  async publishRecommendation(
    recommendation: CoordinatedRecommendation,
  ): Promise<{ event: Event; messages: CommunicationMessage[] }> {
    // Create a generic event for recommendation created
    const event: Event = {
      metadata: {
        eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        eventType: SUPREME_EVENT_TYPES.RECOMMENDATION_CREATED,
        eventVersion: "1.0.0",
        timestamp: new Date().toISOString(),
        workspaceId: recommendation.workspaceId,
        correlationId: recommendation.correlationId,
        causationId: recommendation.causationId,
        classification: "INTELLIGENCE",
        priority: "MEDIUM",
        source: {
          serviceName: "supreme-intelligence-orchestrator",
          instanceId: "supreme-orchestrator-1",
          version: "1.0.0",
        },
      },
      payload: recommendation,
    };

    const messages = await this.hub.notifyRecommendation({
      recommendationId: recommendation.recommendationId,
      title: recommendation.title,
      businessReason: recommendation.businessReason,
      affectedSegment: recommendation.affectedSegment,
      recommendedAction: recommendation.recommendedAction,
      expectedImpact: recommendation.expectedImpact,
      priority: recommendation.priority,
      confidence: recommendation.confidence,
      sourceDomains: recommendation.sourceDomains,
      approvalRequired: recommendation.approvalRequirement.required,
      approvalRequestId: recommendation.approvalRequirement.required ? `approval-${recommendation.recommendationId}` : undefined,
      workspaceId: recommendation.workspaceId,
      correlationId: recommendation.correlationId,
      causationId: recommendation.causationId,
    });

    return { event, messages };
  }
}

/** Singleton instance */
export const communicationHub = new InMemoryCommunicationHub();
export const communicationHubEventPublisher = new CommunicationHubEventPublisher(communicationHub);