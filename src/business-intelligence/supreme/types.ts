/**
 * Supreme Intelligence Orchestrator Domain
 * Cross-domain correlation and orchestration of intelligence outputs
 */

import type { CustomerIntelligence } from "../customer/types";
import type { InventoryIntelligence } from "../inventory/types";
import type { MarketIntelligence } from "../market/types";
import type { CRMKpiSnapshot } from "@/lib/crm.functions";
import type { EvidenceItem } from "../shared/evidence-item";

/** Domain intelligence reference for correlation */
export interface DomainIntelligenceReference {
  domain: "customer" | "inventory" | "market" | "crm";
  workspaceId: string;
  correlationId: string;
  causationId: string;
  generatedAt: string;
  intelligence: CustomerIntelligence | InventoryIntelligence | MarketIntelligence | CRMKpiSnapshot;
  evidenceReferences: string[];
}

/** Supreme Intelligence Context - aggregates all domain intelligence */
export interface SupremeIntelligenceContext {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  generatedAt: string;
  customerIntelligence?: CustomerIntelligence;
  inventoryIntelligence?: InventoryIntelligence;
  marketIntelligence?: MarketIntelligence;
  crmIntelligence?: CRMKpiSnapshot;
  domainReferences: DomainIntelligenceReference[];
  crossDomainCorrelations: CrossDomainCorrelation[];
  evidenceTrail: EvidenceItem[];
}

/** Cross-domain correlation finding */
export interface CrossDomainCorrelation {
  id: string;
  type: "customer_inventory_match" | "customer_market_match" | "inventory_market_match" | "crm_customer_match" | "crm_inventory_match" | "crm_market_match" | "full_alignment";
  description: string;
  domains: ("customer" | "inventory" | "market" | "crm")[];
  confidence: number;
  evidence: EvidenceItem[];
  matchedEntities: {
    customerIds?: string[];
    assetIds?: string[];
    cities?: string[];
    propertyTypes?: string[];
    leadIds?: string[];
  };
  businessReason: string;
}

/** Coordinated decision from Supreme Intelligence */
export interface CoordinatedDecision {
  decisionId: string;
  workspaceId: string;
  correlationId: string;
  causationId: string;
  decisionType: string;
  title: string;
  explanation: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  affectedSegment: string;
  recommendedAction: string;
  expectedBusinessImpact: string;
  humanReviewRequired: boolean;
  evidence: EvidenceItem[];
  sourceDomains: ("customer" | "inventory" | "market" | "crm")[];
  domainDecisions: DomainDecisionReference[];
  createdAt: string;
}

/** Reference to a domain-level decision */
export interface DomainDecisionReference {
  domain: "customer" | "inventory" | "market" | "crm";
  decisionId: string;
  decisionType: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
}

/** Coordinated recommendation requiring approval */
export interface CoordinatedRecommendation {
  recommendationId: string;
  workspaceId: string;
  correlationId: string;
  causationId: string;
  title: string;
  businessReason: string;
  affectedSegment: string;
  recommendedAction: string;
  expectedImpact: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  supportingMetrics: Record<string, string | number | boolean | null>;
  sourceDomains: ("customer" | "inventory" | "market" | "crm")[];
  domainRecommendations: DomainRecommendationReference[];
  evidence: EvidenceItem[];
  dependencies: RecommendationDependency[];
  approvalRequirement: ApprovalRequirement;
  generatedAt: string;
  status: "pending" | "approved" | "rejected" | "executed" | "dismissed";
  dryRun: boolean;
}

/** Reference to a domain-level recommendation */
export interface DomainRecommendationReference {
  domain: "customer" | "inventory" | "market" | "crm";
  recommendationId: string;
  title: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
}

/** Dependency between recommendations */
export interface RecommendationDependency {
  recommendationId: string;
  type: "blocks" | "requires" | "enhances" | "conflicts";
  description: string;
}

/** Approval requirement for coordinated actions */
export interface ApprovalRequirement {
  required: boolean;
  reason: string;
  approverRoles: string[];
  requiredApprovals: number;
  expiresAt?: string;
  actionsRequiringApproval: ProposedAction[];
}

/** Proposed action that requires approval */
export interface ProposedAction {
  actionId: string;
  type: "call" | "whatsapp" | "email" | "sms" | "pricing_change" | "financial_action" | "contractual_commitment" | "record_deletion" | "permission_change" | "in_app_notification";
  description: string;
  targetEntity: string;
  targetEntityType: "customer" | "lead" | "inventory" | "project" | "deal";
  estimatedImpact: string;
  requiresHumanApproval: boolean;
}

/** Orchestration result */
export interface OrchestrationResult {
  orchestrationId: string;
  workspaceId: string;
  correlationId: string;
  causationId: string;
  context: SupremeIntelligenceContext;
  decisions: CoordinatedDecision[];
  recommendations: CoordinatedRecommendation[];
  correlations: CrossDomainCorrelation[];
  approvalRequests: ApprovalRequest[];
  trace: OrchestrationTrace;
  generatedAt: string;
  dryRun: boolean;
}

/** Approval request for human review */
export interface ApprovalRequest {
  requestId: string;
  recommendationId: string;
  workspaceId: string;
  correlationId: string;
  causationId: string;
  title: string;
  description: string;
  proposedActions: ProposedAction[];
  evidence: EvidenceItem[];
  requestedAt: string;
  expiresAt: string;
  status: "pending" | "approved" | "rejected" | "expired";
  approvers: string[];
  approvalsReceived: number;
  requiredApprovals: number;
}

/** Orchestration trace for auditability */
export interface OrchestrationTrace {
  traceId: string;
  steps: OrchestrationStep[];
  startTime: string;
  endTime: string;
  durationMs: number;
  domainsProcessed: ("customer" | "inventory" | "market" | "crm")[];
  eventsEmitted: string[];
  errors: OrchestrationError[];
}

/** Individual step in orchestration */
export interface OrchestrationStep {
  stepId: string;
  name: string;
  domain?: "customer" | "inventory" | "market" | "crm" | "supreme";
  status: "started" | "completed" | "failed" | "skipped";
  startTime: string;
  endTime?: string;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

/** Orchestration error */
export interface OrchestrationError {
  stepId: string;
  error: string;
  timestamp: string;
  recoverable: boolean;
}

/** Proof scenario input */
export interface ProofScenarioInput {
  workspaceId: string;
  correlationId: string;
  causationId: string;
  customerId: string;
  customerCity: string;
  customerPropertyType: string;
  leadId?: string;
  assetIds?: string[];
  dryRun?: boolean;
}

/** Proof scenario output */
export interface ProofScenarioOutput {
  scenario: "customer_at_risk_with_matching_inventory_and_market_momentum";
  workspaceId: string;
  correlationId: string;
  causationId: string;
  customerAtRisk: boolean;
  crmWeakEngagement: boolean;
  matchingInventoryAvailable: boolean;
  marketPositiveMomentum: boolean;
  coordinatedRecommendation?: CoordinatedRecommendation;
  evidenceChain: EvidenceItem[];
  approvalRequired: boolean;
  dryRun: boolean;
  generatedAt: string;
}