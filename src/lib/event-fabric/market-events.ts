/**
 * Market domain and intelligence events for the Event Fabric.
 *
 * These events flow through the complete market intelligence cycle:
 *
 * 1. MARKET.DataIngested           (INTEGRATION) — External agent data received
 * 2. MARKET.SnapshotRequested      (DOMAIN)       — UI/scheduler requests snapshot
 * 3. MARKET.SnapshotProcessed      (INTELLIGENCE) — BI completed processing
 * 4. MARKET.RiskDetected           (DECISION)     — Decision engine found risk
 * 5. MARKET.RecommendationCreated  (EXECUTION)    — Recommendation delivered
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

export interface MarketDataIngestedPayload {
  workspaceId: string;
  source: "magicbricks" | "99acres" | "housing" | "rera" | "trend_analyzer" | "computed";
  dataType: "listings" | "trends" | "compliance";
  recordCount: number;
  ingestedAt: string;
  correlationId: string;
}

export interface MarketSnapshotRequestedPayload {
  workspaceId: string;
  requestedBy: string;
  requestedAt: string;
  filters?: {
    cities?: string[];
    propertyTypes?: string[];
    dateRange?: { from: string; to: string };
  };
}

export interface MarketSnapshotProcessedPayload {
  workspaceId: string;
  totalListings: number;
  totalTrends: number;
  totalCompliance: number;
  citiesCovered: string[];
  propertyTypesCovered: string[];
  avgPricePerSqft: number;
  medianPricePerSqft: number;
  priceChangePct: number;
  demandIndex: number;
  topOpportunities: number;
  generatedAt: string;
}

export interface MarketRiskDetectedPayload {
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

export interface MarketRecommendationCreatedPayload {
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

// ─── Event Classes ────────────────────────────────────────────────

/**
 * Published when external market data is ingested from the real estate agent.
 * Classification: INTEGRATION
 */
export class MarketDataIngestedEvent implements Event {
  public readonly metadata: EventMetadata;
  public readonly payload: MarketDataIngestedPayload;

  constructor(
    metadata: EventMetadata,
    payload: MarketDataIngestedPayload,
  ) {
    this.metadata = {
      ...metadata,
      eventType: "MARKET.DataIngested",
      classification: EventClassification.INTEGRATION,
      priority: EventPriority.MEDIUM,
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      causationId: metadata.causationId ?? generateCausationId(),
    };
    this.payload = payload;
  }
}

/**
 * Published when a market snapshot is requested by the UI or a scheduled job.
 * Classification: DOMAIN
 */
export class MarketSnapshotRequestedEvent extends BaseDomainEvent {
  constructor(
    metadata: EventMetadata,
    payload: MarketSnapshotRequestedPayload,
  ) {
    const domainMetadata: EventMetadata = {
      ...metadata,
      eventType: "MARKET.SnapshotRequested",
      classification: EventClassification.DOMAIN,
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      causationId: metadata.causationId ?? generateCausationId(),
    };
    super(domainMetadata, payload);
  }
}

/**
 * Published when the BI layer has finished processing market data.
 * Classification: INTELLIGENCE
 */
export class MarketSnapshotProcessedEvent extends BaseIntelligenceEvent<MarketSnapshotProcessedPayload> {
  constructor(
    metadata: EventMetadata,
    payload: MarketSnapshotProcessedPayload,
  ) {
    const intelligenceMetadata: EventMetadata = {
      ...metadata,
      eventType: "MARKET.SnapshotProcessed",
      classification: EventClassification.INTELLIGENCE,
      priority: EventPriority.MEDIUM,
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      causationId: metadata.causationId ?? generateCausationId(),
    };
    super(intelligenceMetadata, payload);
  }
}

/**
 * Published when the Decision Engine detects a market risk or opportunity.
 * Classification: DECISION
 */
export class MarketRiskDetectedEvent extends BaseDecisionEvent<MarketRiskDetectedPayload> {
  constructor(
    metadata: EventMetadata,
    payload: MarketRiskDetectedPayload,
  ) {
    const decisionMetadata: EventMetadata = {
      ...metadata,
      eventType: "MARKET.RiskDetected",
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
export class MarketRecommendationCreatedEvent implements Event {
  public readonly metadata: EventMetadata;
  public readonly payload: MarketRecommendationCreatedPayload;

  constructor(
    metadata: EventMetadata,
    payload: MarketRecommendationCreatedPayload,
  ) {
    this.metadata = {
      ...metadata,
      eventType: "MARKET.RecommendationCreated",
      classification: EventClassification.EXECUTION,
      priority: EventPriority.MEDIUM,
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      causationId: metadata.causationId ?? generateCausationId(),
    };
    this.payload = payload;
  }
}