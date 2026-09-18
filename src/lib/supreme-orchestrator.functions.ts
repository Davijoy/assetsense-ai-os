/**
 * Supreme Intelligence Orchestrator Server Functions
 * 
 * Server-side functions for orchestrating cross-domain intelligence,
 * running proof scenarios, and managing approval workflows.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireRoles } from "@/integrations/supabase/role-middleware";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";
import { z } from "zod";
import type { OrchestrationResult, ProofScenarioInput, ProofScenarioOutput } from "@/business-intelligence/supreme/types";
import { SupremeIntelligenceOrchestrator } from "@/business-intelligence/supreme/service";
import { approvalPolicyEngine } from "@/business-intelligence/supreme/approval-policy";
import { communicationHubEventPublisher, communicationHub } from "@/business-intelligence/supreme/communication-hub";
import { generateCorrelationId } from "@/lib/event-fabric/correlation-id";
import { generateCausationId } from "@/lib/event-fabric/causation-id";
import { getCRMKPIs } from "@/lib/crm.functions";
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

// Re-export the single-sourced execution authorization policy so consumers and
// the test suite share the exact allow-set enforced by the server functions.
export { ORCHESTRATION_EXEC_ROLES, canExecuteSupreme } from "@/business-intelligence/supreme/authorization";

/** Orchestration request */
export interface OrchestrationRequest {
  workspaceId: string;
  correlationId?: string;
  causationId?: string;
  dryRun?: boolean;
  /**
   * SENTINEL FORT handoff (advisory identity/experience context only).
   * NEVER used for authorization — server-side DB-backed roles remain
   * the sole authority. The orchestrator may read it to tailor reasoning;
   * it does not alter RBAC, workspace isolation or dry-run safety.
   */
  sentinelContext?: {
    persona?: string | null;
    intent?: string | null;
    objectiveLabel?: string | null;
    experiencePriorities?: readonly string[];
  } | null;
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

// Server-fn input schemas — type the createServerFn input so the framework
// propagates the correct caller-facing input type (and any runtime fields).
const OrchestrationRequestSchema = z.object({
  workspaceId: z.string().min(1),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  dryRun: z.boolean().optional(),
});

const ProofScenarioRequestSchema = z.object({
  workspaceId: z.string().min(1),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  customerId: z.string().min(1),
  customerCity: z.string().min(1),
  customerPropertyType: z.string().min(1),
  leadId: z.string().optional(),
  assetIds: z.array(z.string()).optional(),
  dryRun: z.boolean().optional(),
});

/** Approval decision response */
export interface ApprovalDecisionResponse {
  success: boolean;
  workflowStatus?: "approved" | "rejected" | "partially_approved" | "pending";
  executableActions?: string[];
  error?: string;
}

/**
 * Run the Supreme Intelligence Orchestration
 *
 * AUTHORIZATION: enforced SERVER-SIDE via the canonical `requireAdminOrManager`
 * middleware (src/integrations/supabase/role-middleware.ts), which resolves the
 * caller from the bearer token and reads roles from the DB-backed
 * `public.user_roles` table. Authorization no longer trusts any caller-supplied
 * role value — only server-resolved DB roles. Only `admin` / `manager` may
 * execute — NOT viewer/builder/developer/agent.
 *
 * B1: the active workspace is resolved SERVER-SIDE via the RLS-safe
 * `current_workspace_id` RPC; a client-supplied workspaceId is only used to
 * detect a mismatch and is never trusted as the boundary.
 */
export const runSupremeOrchestration = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager"])])
  .validator(OrchestrationRequestSchema)
  // Handler returns the payload untyped — TanStack's compile-time
  // ValidateSerializableMapped guard rejects OrchestrationResult's
  // `Record<string, ...>` fields (the SAME pre-existing limitation carried by
  // getBISnapshot / getCustomerBISnapshot / ingestMarketData). Callers re-type
  // the response as OrchestrationResponse; the payload is JSON-serializable.
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const request = data as OrchestrationRequest;

    const resolvedWorkspaceId = await getCurrentWorkspaceId(supabase);
    if (!resolvedWorkspaceId) {
      return { success: false, error: "No active workspace membership" };
    }
    if (request.workspaceId && request.workspaceId !== resolvedWorkspaceId) {
      return { success: false, error: "Workspace ID mismatch" };
    }
    const workspaceId = resolvedWorkspaceId;

    try {
      // Real services wired with the bearer-authenticated server Supabase client.
      const orchestrator = await createOrchestratorInstance(supabase);

      // Run orchestration
      const correlationId = request.correlationId ?? generateCorrelationId();
      const causationId = request.causationId ?? generateCausationId();

      const result = await orchestrator.orchestrate(
        workspaceId,
        correlationId,
        causationId,
        request.dryRun ?? false,
      );

      // Publish events and send notifications — SAFETY: skipped in dry-run so no
      // approvals, recommendations, or communication-hub events are dispatched
      // and no external actions execute (DB MUTATIONS=0, NOTIFICATIONS=0,
      // EXTERNAL ACTIONS=0, COMMUNICATION DISPATCHES=0). Orchestration,
      // correlations, decisions, recommendations and evidence remain produced
      // in-memory for the caller.
      if (!(request.dryRun ?? false)) {
        await publishOrchestrationEvents(result);
      }

      return {
        success: true,
        orchestrationId: result.orchestrationId,
        result,
        traceId: result.trace.traceId,
      } as any;
    } catch (error) {
      console.error("Supreme orchestration failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

/**
 * Run the proof scenario
 *
 * AUTHORIZATION: enforced SERVER-SIDE via the same canonical
 * `requireAdminOrManager` middleware (DB-backed `public.user_roles`). No caller-
 * supplied role value is trusted. Only `admin` / `manager` may execute — NOT
 * viewer/builder/developer/agent.
 */
export const runProofScenario = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager"])])
  .validator(ProofScenarioRequestSchema)
  // Handler returns the payload untyped — see note on runSupremeOrchestration
  // (TanStack ValidateSerializableMapped guard vs Record<...> fields).
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const request = data as ProofScenarioRequest;

    const resolvedWorkspaceId = await getCurrentWorkspaceId(supabase);
    if (!resolvedWorkspaceId) {
      return { success: false, error: "No active workspace membership" };
    }
    if (request.workspaceId && request.workspaceId !== resolvedWorkspaceId) {
      return { success: false, error: "Workspace ID mismatch" };
    }
    const workspaceId = resolvedWorkspaceId;

    try {
      // Real services wired with the bearer-authenticated server Supabase client.
      const orchestrator = await createOrchestratorInstance(supabase);

      // Run proof scenario
      const correlationId = request.correlationId ?? generateCorrelationId();
      const causationId = request.causationId ?? generateCausationId();

      const input: ProofScenarioInput = {
        workspaceId,
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
      } as any;
    } catch (error) {
      console.error("Proof scenario failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

/**
 * Typed caller aliases.
 *
 * TanStack Start's caller-visible type for a middleware'd + validated server fn
 * resolves to the internal FetcherDataOptions wrapper in this version. These
 * aliases type the invocation as the canonical TanStack shape
 * `{ data: <payload> }` (see src/lib/api/example.functions.ts) so call sites
 * MUST pass the `{ data: ... }` envelope — a bare payload will not compile.
 * Runtime call is unchanged and still runs server-side under the
 * requireRoles([admin, manager]) DB-backed middleware.
 */
export const invokeSupremeOrchestration = runSupremeOrchestration as unknown as (
  input: { data: OrchestrationRequest },
) => Promise<OrchestrationResponse>;

export const invokeSupremeProofScenario = runProofScenario as unknown as (
  input: { data: ProofScenarioRequest },
) => Promise<ProofScenarioResponse>;

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

async function createOrchestratorInstance(supabase: any): Promise<SupremeIntelligenceOrchestrator> {
  // Real services wired with the bearer-authenticated server-side Supabase client.
  const customerRepository = new SupabaseCustomerRepository(supabase);
  const realCustomerService = new CustomerIntelligenceService(customerRepository);

  const inventoryRepository = new SupabaseInventoryRepository(supabase);
  const realInventoryService = new InventoryIntelligenceService(inventoryRepository);

  const marketRepository = new SupabaseMarketRepository(supabase);
  const realMarketService = new MarketIntelligenceService(marketRepository);
  const realMarketRiskEvaluator = new MarketRiskEvaluator();

  return new SupremeIntelligenceOrchestrator(
    realCustomerService,
    realInventoryService,
    realMarketService,
    realMarketRiskEvaluator,
    getCRMKPIs,
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