/**
 * Inventory domain and intelligence events for the Event Fabric.
 *
 * These events flow through the complete inventory intelligence cycle:
 *
 * 1. INVENTORY.SnapshotRequested  (DOMAIN)
 * 2. INVENTORY.SnapshotProcessed   (INTELLIGENCE)
 * 3. INVENTORY.RiskDetected        (DECISION)
 * 4. INVENTORY.RecommendationCreated (EXECUTION)
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

export interface InventorySnapshotRequestedPayload {
  workspaceId: string;
  requestedBy: string;
  requestedAt: string;
}

export interface InventorySnapshotProcessedPayload {
  workspaceId: string;
  totalUnits: number;
  availableUnits: number;
  soldUnits: number;
  reservedUnits: number;
  blockedUnits: number;
  totalValueInr: number;
  availableValueInr: number;
  soldValueInr: number;
  availabilityPct: number;
  soldPct: number;
  absorptionPct: number;
  ageingOver90Days: number;
  slowMovingCount: number;
  highValueUnsoldCount: number;
  generatedAt: string;
}

export interface InventoryRiskDetectedPayload {
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

export interface InventoryRecommendationCreatedPayload {
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
 * Published when an inventory snapshot is requested by the UI or a scheduled job.
 * Classification: DOMAIN
 */
export class InventorySnapshotRequestedEvent extends BaseDomainEvent {
  constructor(
    metadata: EventMetadata,
    payload: InventorySnapshotRequestedPayload,
  ) {
    const domainMetadata: EventMetadata = {
      ...metadata,
      eventType: "INVENTORY.SnapshotRequested",
      classification: EventClassification.DOMAIN,
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      causationId: metadata.causationId ?? generateCausationId(),
    };
    super(domainMetadata, payload);
  }
}

/**
 * Published when the BI layer has finished processing inventory data.
 * Classification: INTELLIGENCE
 */
export class InventorySnapshotProcessedEvent extends BaseIntelligenceEvent<InventorySnapshotProcessedPayload> {
  constructor(
    metadata: EventMetadata,
    payload: InventorySnapshotProcessedPayload,
  ) {
    const intelligenceMetadata: EventMetadata = {
      ...metadata,
      eventType: "INVENTORY.SnapshotProcessed",
      classification: EventClassification.INTELLIGENCE,
      priority: EventPriority.MEDIUM,
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      causationId: metadata.causationId ?? generateCausationId(),
    };
    super(intelligenceMetadata, payload);
  }
}

/**
 * Published when the Decision Engine detects an inventory risk.
 * Classification: DECISION
 */
export class InventoryRiskDetectedEvent extends BaseDecisionEvent<InventoryRiskDetectedPayload> {
  constructor(
    metadata: EventMetadata,
    payload: InventoryRiskDetectedPayload,
  ) {
    const decisionMetadata: EventMetadata = {
      ...metadata,
      eventType: "INVENTORY.RiskDetected",
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
export class InventoryRecommendationCreatedEvent implements Event {
  public readonly metadata: EventMetadata;
  public readonly payload: InventoryRecommendationCreatedPayload;

  constructor(
    metadata: EventMetadata,
    payload: InventoryRecommendationCreatedPayload,
  ) {
    this.metadata = {
      ...metadata,
      eventType: "INVENTORY.RecommendationCreated",
      classification: EventClassification.EXECUTION,
      priority: EventPriority.MEDIUM,
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      causationId: metadata.causationId ?? generateCausationId(),
    };
    this.payload = payload;
  }
}
