/**
 * Supreme Intelligence Orchestrator Server Functions
 * 
 * Server-side functions for orchestrating cross-domain intelligence,
 * running proof scenarios, and managing approval workflows.
 */

import type { OrchestrationResult, ProofScenarioInput, ProofScenarioOutput } from "@/business-intelligence/supreme/types";
import { SupremeIntelligenceOrchestrator } from "@/business-intelligence/supreme/service";
import { approvalPolicyEngine } from "@/business-intelligence/supreme/approval-policy";
import { communicationHubEventPublisher, communicationHub } from "@/business-intelligence/supreme/communication-hub";
import { generateCorrelationId } from "@/lib/event-fabric/correlation-id";
import { generateCausationId } from "@/lib/event-fabric/causation-id";
import type { CRMKpiSnapshot } from "@/lib/crm.functions";
import { supabase } from "@/integrations/supabase/client";
import { CustomerIntelligenceService } from "@/business-intelligence/customer/service";
import { InventoryIntelligenceService } from "@/business-intelligence/inventory/service";
import type { ICustomerRepository } from "@/business-intelligence/customer/repository";
import type { IInventoryRepository } from "@/business-intelligence/inventory/repository";
import { SupabaseCustomerRepository } from "@/lib/customer.functions";
import { SupabaseInventoryRepository } from "@/lib/bi.functions";
import { MarketIntelligenceService } from "@/business-intelligence/market/service";
import { SupabaseMarketRepository } from "@/business-intelligence/market/repository";
import { MarketRiskEvaluator } from "@/decision-engine/market/market-risk-evaluator";

/** Server function context */
interface ServerFunctionContext {
  workspaceId: string;
  userId: string;
  userRoles: string[];
  correlationId?: string;
  causationId?: string;
}

/** Orchestration request */
export interface OrchestrationRequest {
  workspaceId: string;
  correlationId?: string;
  causationId?: string;
  dryRun?: boolean;
}

/** Orchestration response */
export interface OrchestrationResponse {
  success: boolean;
  orchestrationId?: string;
  result?: OrchestrationResult;
  error?: string;
  traceId?: string;
}

/** Proof scenario request */
export interface ProofScenarioRequest {
  workspaceId: string;
  customerId: string;
  customerCity: string;
  customerPropertyType: string;
  leadId?: string;
  assetIds?: string[];
  correlationId?: string;
  causationId?: string;
  dryRun?: boolean;
}

/** Proof scenario response */
export interface ProofScenarioResponse {
  success: boolean;
  result?: ProofScenarioOutput;
  error?: string;
}

/** Approval decision request */
export interface ApprovalDecisionRequest {
  approvalRequestId: string;
  recommendationId: string;
  decision: "approved" | "rejected";
  approverId: string;
  approverRole: string;
  reason?: string;
  actionsApproved?: string[];
  actionsRejected?: string[];
}

/** Approval decision response */
export interface ApprovalDecisionResponse {
  success: boolean;
  workflowStatus?: "approved" | "rejected" | "partially_approved" | "pending";
  executableActions?: string[];
  error?: string;
}

/**
 * Run the Supreme Intelligence Orchestration
 */
export async function runSupremeOrchestration(
  request: OrchestrationRequest,
  context: ServerFunctionContext,
): Promise<OrchestrationResponse> {
  try {
    // Validate workspace access
    if (request.workspaceId !== context.workspaceId) {
      return {
        success: false,
        error: "Workspace ID mismatch",
      };
    }

    // Check user permissions
    if (!context.userRoles.includes("admin") && !context.userRoles.includes("manager")) {
      return {
        success: false,
        error: "Insufficient permissions to run orchestration",
      };
    }

    // Create orchestrator instance (in production, this would be injected)
    const orchestrator = await createOrchestratorInstance(context.workspaceId);

    // Run orchestration
    const correlationId = request.correlationId ?? generateCorrelationId();
    const causationId = request.causationId ?? generateCausationId();

    const result = await orchestrator.orchestrate(
      request.workspaceId,
      correlationId,
      causationId,
      request.dryRun ?? false,
    );

    // Publish events and send notifications
    await publishOrchestrationEvents(result);

    return {
      success: true,
      orchestrationId: result.orchestrationId,
      result,
      traceId: result.trace.traceId,
    };
  } catch (error) {
    console.error("Supreme orchestration failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Run the proof scenario
 */
export async function runProofScenario(
  request: ProofScenarioRequest,
  context: ServerFunctionContext,
): Promise<ProofScenarioResponse> {
  try {
    // Validate workspace access
    if (request.workspaceId !== context.workspaceId) {
      return {
        success: false,
        error: "Workspace ID mismatch",
      };
    }

    // Check user permissions
    if (!context.userRoles.includes("admin") && !context.userRoles.includes("manager") && !context.userRoles.includes("senior_agent")) {
      return {
        success: false,
        error: "Insufficient permissions to run proof scenario",
      };
    }

    // Create orchestrator instance
    const orchestrator = await createOrchestratorInstance(context.workspaceId);

    // Run proof scenario
    const correlationId = request.correlationId ?? generateCorrelationId();
    const causationId = request.causationId ?? generateCausationId();

    const input: ProofScenarioInput = {
      workspaceId: request.workspaceId,
      correlationId,
      causationId,
      customerId: request.customerId,
      customerCity: request.customerCity,
      customerPropertyType: request.customerPropertyType,
      leadId: request.leadId,
      assetIds: request.assetIds,
      dryRun: request.dryRun ?? true,
    };

    const result = await orchestrator.runProofScenario(input);

    // Publish proof scenario event
    await publishProofScenarioEvent(result);

    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error("Proof scenario failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process approval decision
 */
export async function processApprovalDecision(
  request: ApprovalDecisionRequest,
  context: ServerFunctionContext,
): Promise<ApprovalDecisionResponse> {
  try {
    // Check user can approve
    const canApprove = approvalPolicyEngine.canUserApprove(context.userRoles, [request.approverRole]);
    if (!canApprove) {
      return {
        success: false,
        error: "User does not have required role to approve",
      };
    }

    // In a real implementation, we would:
    // 1. Load the approval workflow state from persistence
    // 2. Process the decision
    // 3. Save the updated state
    // 4. Notify stakeholders
    // 5. Return executable actions

    // For now, simulate the workflow
    const workflowStatus = request.decision === "approved" ? "approved" : "rejected";
    const executableActions = request.decision === "approved" 
      ? (request.actionsApproved ?? []) 
      : [];

    // Send approval decision notification
    await communicationHubEventPublisher.hub.notifyApprovalDecision(
      request.approvalRequestId,
      request.decision,
      request.approverId,
      request.reason,
    );

    return {
      success: true,
      workflowStatus,
      executableActions,
    };
  } catch (error) {
    console.error("Approval decision processing failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get orchestration status
 */
export async function getOrchestrationStatus(
  orchestrationId: string,
  context: ServerFunctionContext,
): Promise<{ success: boolean; result?: OrchestrationResult; error?: string }> {
  try {
    // In a real implementation, this would fetch from persistence
    // For now, return not found
    return {
      success: false,
      error: "Orchestration not found - persistence not implemented",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get approval request status
 */
export async function getApprovalRequestStatus(
  approvalRequestId: string,
  context: ServerFunctionContext,
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    // In a real implementation, this would fetch from persistence
    return {
      success: false,
      error: "Approval request not found - persistence not implemented",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ─── Private helper functions ────────────────────────────────────────

async function createOrchestratorInstance(workspaceId: string): Promise<SupremeIntelligenceOrchestrator> {
  // In a real implementation, these would be properly injected services

  const customerRepository = new SupabaseCustomerRepository(supabase);
  const realCustomerService = new CustomerIntelligenceService(customerRepository);

  const inventoryRepository = new SupabaseInventoryRepository(supabase);
  const realInventoryService = new InventoryIntelligenceService(inventoryRepository);

  const marketRepository = new SupabaseMarketRepository(supabase);
  const realMarketService = new MarketIntelligenceService(marketRepository);
  const realMarketRiskEvaluator = new MarketRiskEvaluator();

  const mockGetCRMKPIs = async (): Promise<CRMKpiSnapshot> => ({
    pipelineValueInr: 0,
    activeLeads: 0,
    conversionRatePct: 0,
    averageResponseSeconds: 0,
  });

  return new SupremeIntelligenceOrchestrator(
    realCustomerService,
    realInventoryService,
    realMarketService,
    realMarketRiskEvaluator,
    mockGetCRMKPIs,
  );
}

async function publishOrchestrationEvents(result: OrchestrationResult): Promise<void> {
  // Publish completion event
  // In a real implementation, this would use the event fabric
  console.log(`Orchestration completed: ${result.orchestrationId}`);
  console.log(`Decisions: ${result.decisions.length}, Recommendations: ${result.recommendations.length}`);
  console.log(`Correlations: ${result.correlations.length}, Approval Requests: ${result.approvalRequests.length}`);

  // Publish approval requests if any
  for (const approvalRequest of result.approvalRequests) {
    const recommendation = result.recommendations.find(r => 
      `approval-${r.recommendationId}` === approvalRequest.requestId
    );
    if (recommendation) {
      await communicationHubEventPublisher.publishApprovalRequest(approvalRequest, recommendation);
    }
  }

  // Publish recommendations
  for (const recommendation of result.recommendations) {
    await communicationHubEventPublisher.publishRecommendation(recommendation);
  }
}

async function publishProofScenarioEvent(result: ProofScenarioOutput): Promise<void> {
  console.log(`Proof scenario completed: ${result.scenario}`);
  console.log(`Customer at risk: ${result.customerAtRisk}`);
  console.log(`CRM weak engagement: ${result.crmWeakEngagement}`);
  console.log(`Matching inventory: ${result.matchingInventoryAvailable}`);
  console.log(`Market momentum: ${result.marketPositiveMomentum}`);
  console.log(`Approval required: ${result.approvalRequired}`);
}