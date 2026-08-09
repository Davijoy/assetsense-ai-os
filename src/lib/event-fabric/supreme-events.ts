/**
 * Supreme Intelligence Orchestrator Event Fabric Events
 * 
 * Events emitted by the Supreme Intelligence Orchestrator for cross-domain
 * correlation, coordinated decisions, recommendations, and approval workflows.
 */

import type { Event } from "./event";
import type { EventMetadata } from "./event-metadata";
import type { EvidenceItem } from "@/business-intelligence/shared/evidence-item";
import type {
  SupremeIntelligenceContext,
  CrossDomainCorrelation,
  CoordinatedDecision,
  CoordinatedRecommendation,
  ApprovalRequest,
  OrchestrationResult,
  ProofScenarioOutput,
} from "@/business-intelligence/supreme/types";

/** Event types for Supreme Intelligence */
export const SUPREME_EVENT_TYPES = {
  CONTEXT_BUILT: "SUPREME.ContextBuilt",
  CORRELATION_DETECTED: "SUPREME.CorrelationDetected",
  DECISION_CREATED: "SUPREME.DecisionCreated",
  RECOMMENDATION_CREATED: "SUPREME.RecommendationCreated",
  APPROVAL_REQUESTED: "SUPREME.ApprovalRequested",
  APPROVAL_GRANTED: "SUPREME.ApprovalGranted",
  APPROVAL_DENIED: "SUPREME.ApprovalDenied",
  APPROVAL_EXPIRED: "SUPREME.ApprovalExpired",
  ORCHESTRATION_COMPLETED: "SUPREME.OrchestrationCompleted",
  ORCHESTRATION_FAILED: "SUPREME.OrchestrationFailed",
  PROOF_SCENARIO_COMPLETED: "SUPREME.ProofScenarioCompleted",
  DRY_RUN_COMPLETED: "SUPREME.DryRunCompleted",
} as const;

/** Payload for SUPREME.ContextBuilt */
export interface SupremeContextBuiltPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  context: SupremeIntelligenceContext;
  domainsProcessed: ("customer" | "inventory" | "market" | "crm")[];
  generatedAt: string;
}

/** Payload for SUPREME.CorrelationDetected */
export interface SupremeCorrelationDetectedPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  correlation: CrossDomainCorrelation;
  generatedAt: string;
}

/** Payload for SUPREME.DecisionCreated */
export interface SupremeDecisionCreatedPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  decision: CoordinatedDecision;
  generatedAt: string;
}

/** Payload for SUPREME.RecommendationCreated */
export interface SupremeRecommendationCreatedPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  recommendation: CoordinatedRecommendation;
  generatedAt: string;
}

/** Payload for SUPREME.ApprovalRequested */
export interface SupremeApprovalRequestedPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  approvalRequest: ApprovalRequest;
  generatedAt: string;
}

/** Payload for SUPREME.ApprovalGranted */
export interface SupremeApprovalGrantedPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  approvalRequestId: string;
  recommendationId: string;
  approverId: string;
  approverRole: string;
  grantedAt: string;
}

/** Payload for SUPREME.ApprovalDenied */
export interface SupremeApprovalDeniedPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  approvalRequestId: string;
  recommendationId: string;
  approverId: string;
  approverRole: string;
  reason: string;
  deniedAt: string;
}

/** Payload for SUPREME.ApprovalExpired */
export interface SupremeApprovalExpiredPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  approvalRequestId: string;
  recommendationId: string;
  expiredAt: string;
}

/** Payload for SUPREME.OrchestrationCompleted */
export interface SupremeOrchestrationCompletedPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  orchestrationId: string;
  result: OrchestrationResult;
  durationMs: number;
  generatedAt: string;
}

/** Payload for SUPREME.OrchestrationFailed */
export interface SupremeOrchestrationFailedPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  orchestrationId: string;
  error: string;
  traceId: string;
  generatedAt: string;
}

/** Payload for SUPREME.ProofScenarioCompleted */
export interface SupremeProofScenarioCompletedPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  proofScenario: ProofScenarioOutput;
  generatedAt: string;
}

/** Payload for SUPREME.DryRunCompleted */
export interface SupremeDryRunCompletedPayload {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  orchestrationId: string;
  recommendations: CoordinatedRecommendation[];
  approvalRequests: ApprovalRequest[];
  generatedAt: string;
}

/** Type guards for event payloads */
export function isSupremeContextBuiltEvent(event: Event): event is Event & { payload: SupremeContextBuiltPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.CONTEXT_BUILT;
}

export function isSupremeCorrelationDetectedEvent(event: Event): event is Event & { payload: SupremeCorrelationDetectedPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.CORRELATION_DETECTED;
}

export function isSupremeDecisionCreatedEvent(event: Event): event is Event & { payload: SupremeDecisionCreatedPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.DECISION_CREATED;
}

export function isSupremeRecommendationCreatedEvent(event: Event): event is Event & { payload: SupremeRecommendationCreatedPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.RECOMMENDATION_CREATED;
}

export function isSupremeApprovalRequestedEvent(event: Event): event is Event & { payload: SupremeApprovalRequestedPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.APPROVAL_REQUESTED;
}

export function isSupremeApprovalGrantedEvent(event: Event): event is Event & { payload: SupremeApprovalGrantedPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.APPROVAL_GRANTED;
}

export function isSupremeApprovalDeniedEvent(event: Event): event is Event & { payload: SupremeApprovalDeniedPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.APPROVAL_DENIED;
}

export function isSupremeApprovalExpiredEvent(event: Event): event is Event & { payload: SupremeApprovalExpiredPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.APPROVAL_EXPIRED;
}

export function isSupremeOrchestrationCompletedEvent(event: Event): event is Event & { payload: SupremeOrchestrationCompletedPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.ORCHESTRATION_COMPLETED;
}

export function isSupremeOrchestrationFailedEvent(event: Event): event is Event & { payload: SupremeOrchestrationFailedPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.ORCHESTRATION_FAILED;
}

export function isSupremeProofScenarioCompletedEvent(event: Event): event is Event & { payload: SupremeProofScenarioCompletedPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.PROOF_SCENARIO_COMPLETED;
}

export function isSupremeDryRunCompletedEvent(event: Event): event is Event & { payload: SupremeDryRunCompletedPayload } {
  return event.metadata?.type === SUPREME_EVENT_TYPES.DRY_RUN_COMPLETED;
}

/** Event factory functions */
function createBaseMetadata(
  eventType: string,
  correlationId: string,
  causationId: string,
  workspaceId: string,
): EventMetadata {
  return {
    eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    eventType,
    eventVersion: "1.0.0",
    timestamp: new Date().toISOString(),
    workspaceId,
    correlationId,
    causationId,
    classification: "intelligence" as any,
    priority: "normal" as any,
    source: {
      serviceName: "supreme-intelligence-orchestrator",
      instanceId: "supreme-orchestrator-1",
      version: "1.0.0",
    },
  };
}

export function createSupremeContextBuiltEvent(
  payload: SupremeContextBuiltPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.CONTEXT_BUILT,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}

export function createSupremeCorrelationDetectedEvent(
  payload: SupremeCorrelationDetectedPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.CORRELATION_DETECTED,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}

export function createSupremeDecisionCreatedEvent(
  payload: SupremeDecisionCreatedPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.DECISION_CREATED,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}

export function createSupremeRecommendationCreatedEvent(
  payload: SupremeRecommendationCreatedPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.RECOMMENDATION_CREATED,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}

export function createSupremeApprovalRequestedEvent(
  payload: SupremeApprovalRequestedPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.APPROVAL_REQUESTED,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}

export function createSupremeApprovalGrantedEvent(
  payload: SupremeApprovalGrantedPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.APPROVAL_GRANTED,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}

export function createSupremeApprovalDeniedEvent(
  payload: SupremeApprovalDeniedPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.APPROVAL_DENIED,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}

export function createSupremeApprovalExpiredEvent(
  payload: SupremeApprovalExpiredPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.APPROVAL_EXPIRED,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}

export function createSupremeOrchestrationCompletedEvent(
  payload: SupremeOrchestrationCompletedPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.ORCHESTRATION_COMPLETED,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}

export function createSupremeOrchestrationFailedEvent(
  payload: SupremeOrchestrationFailedPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.ORCHESTRATION_FAILED,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}

export function createSupremeProofScenarioCompletedEvent(
  payload: SupremeProofScenarioCompletedPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.PROOF_SCENARIO_COMPLETED,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}

export function createSupremeDryRunCompletedEvent(
  payload: SupremeDryRunCompletedPayload,
  correlationId: string,
  causationId: string,
): Event {
  return {
    metadata: createBaseMetadata(
      SUPREME_EVENT_TYPES.DRY_RUN_COMPLETED,
      correlationId,
      causationId,
      payload.workspaceId,
    ),
    payload,
  };
}
