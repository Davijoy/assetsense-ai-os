/**
 * Customer domain and intelligence events for the Event Fabric.
 *
 * These events flow through the complete customer intelligence cycle:
 *
 * 1. CUSTOMER.SnapshotRequested  (DOMAIN)
 * 2. CUSTOMER.SnapshotProcessed   (INTELLIGENCE)
 * 3. CUSTOMER.RiskDetected        (DECISION)
 * 4. CUSTOMER.RecommendationCreated (EXECUTION)
 */

import { Event } from "./event";
import { EventMetadata } from "./event-metadata";
import { EventClassification } from "./event-classification";
import { EventPriority } from "./event-priority";
import { generateCorrelationId } from "./correlation-id";
import { generateCausationId } from "./causation-id";
import { BaseDomainEvent } from "./base-domain-event";
import { BaseIntelligenceEvent } from "../../business-intelligence/shared/base-intelligence-event";
import { BaseDecisionEvent } from "../../decision-engine/shared/base-decision";

// ─── Payload Types ────────────────────────────────────────────────

export interface CustomerSnapshotRequestedPayload {
  workspaceId: string;
  requestedBy: string;
  requestedAt: string;
}

export interface CustomerSnapshotProcessedPayload {
  workspaceId: string;
  totalContacts: number;
  activeContacts: number;
  newContacts: number;
  inactiveContacts: number;
  customerContacts: number;
  partnerContacts: number;
  vendorContacts: number;
  referralContacts: number;
  totalValueInr: number;
  avgEngagementScore: number;
  leadSourceDistribution: Record<string, number>;
  cityDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  generatedAt: string;
}

export interface CustomerRiskDetectedPayload {
  decisionId: string;
  workspaceId: string;
  decisionType: string;
  title: string;
  explanation: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  affectedSegment: string;
  recommendedAction: string;
  expectedBusinessImpact: string;
  humanReviewRequired: boolean;
  evidence: {
    factor: string;
    value: unknown;
    impact: number;
    confidence: number;
  }[];
  createdAt: string;
}

export interface CustomerRecommendationCreatedPayload {
  recommendationId: string;
  workspaceId: string;
  title: string;
  businessReason: string;
  affectedSegment: string;
  recommendedAction: string;
  expectedImpact: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  supportingMetrics: Record<string, unknown>;
  decisionReference: string;
  generatedAt: string;
  deliveryChannel: string;
  deliveryStatus: string;
}

// ─── Event Classes ───────────────────────────────────────────────

/**
 * Published when a customer snapshot is requested by the UI or a scheduled job.
 * Classification: DOMAIN
 */
export class CustomerSnapshotRequestedEvent extends BaseDomainEvent {
  constructor(
    metadata: EventMetadata,
    payload: CustomerSnapshotRequestedPayload,
  ) {
    const domainMetadata: EventMetadata = {
      ...metadata,
      eventType: "CUSTOMER.SnapshotRequested",
      classification: EventClassification.DOMAIN,
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      causationId: metadata.causationId ?? generateCausationId(),
    };
    super(domainMetadata, payload);
  }
}

/**
 * Published when the BI layer has finished processing customer data.
 * Classification: INTELLIGENCE
 */
export class CustomerSnapshotProcessedEvent extends BaseIntelligenceEvent<CustomerSnapshotProcessedPayload> {
  constructor(
    metadata: EventMetadata,
    payload: CustomerSnapshotProcessedPayload,
  ) {
    const intelligenceMetadata: EventMetadata = {
      ...metadata,
      eventType: "CUSTOMER.SnapshotProcessed",
      classification: EventClassification.INTELLIGENCE,
      priority: EventPriority.MEDIUM,
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      causationId: metadata.causationId ?? generateCausationId(),
    };
    super(intelligenceMetadata, payload);
  }
}

/**
 * Published when the Decision Engine detects a customer risk.
 * Classification: DECISION
 */
export class CustomerRiskDetectedEvent extends BaseDecisionEvent<CustomerRiskDetectedPayload> {
  constructor(
    metadata: EventMetadata,
    payload: CustomerRiskDetectedPayload,
  ) {
    const decisionMetadata: EventMetadata = {
      ...metadata,
      eventType: "CUSTOMER.RiskDetected",
      classification: EventClassification.DECISION,
      priority: EventPriority.HIGH,
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      causationId: metadata.causationId ?? generateCausationId(),
    };
    super(decisionMetadata, payload);
  }
}

/**
 * Published when a recommendation has been created and delivered.
 * Classification: EXECUTION
 */
export class CustomerRecommendationCreatedEvent implements Event {
  public readonly metadata: EventMetadata;
  public readonly payload: CustomerRecommendationCreatedPayload;

  constructor(
    metadata: EventMetadata,
    payload: CustomerRecommendationCreatedPayload,
  ) {
    this.metadata = {
      ...metadata,
      eventType: "CUSTOMER.RecommendationCreated",
      classification: EventClassification.EXECUTION,
      priority: EventPriority.MEDIUM,
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      causationId: metadata.causationId ?? generateCausationId(),
    };
    this.payload = payload;
  }
}