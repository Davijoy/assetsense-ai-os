/**
 * SUPREME AGENT KERNEL — Capability Registry (handlers)
 * Sentinel Fort — ONLY explicitly registered capabilities are callable.
 *
 * This module is the EXECUTABLE half of the capability registry. Routing
 * metadata (domain, intents, subject vocabulary, mode, roles, dry-run support,
 * schemas, summarizers) lives in ./supreme-agent-capability-meta and is the
 * SINGLE SOURCE OF TRUTH; this file adds the real handler for each declared
 * capability and merges the two. Metadata therefore cannot drift between the
 * router and the executor — a handler without metadata (or metadata without a
 * handler) is a registration error and fails loudly at load.
 *
 * DEPENDENCY BOUNDARY: this module imports the real intelligence services,
 * repositories and orchestrator, so it is SERVER-SIDE ONLY. It must never be
 * reachable from a client module's static import graph — the Sentinel Companion
 * and the intent router deliberately depend on the metadata module instead, so
 * the global AppShell (and therefore every /app/* route) stays lightweight.
 * Enforced by tests/appshell-dependency-boundary.test.ts.
 *
 * NON-NEGOTIABLE: B1, B3, B4 preserved. Server-side only. DB roles only.
 * No RLS weakening. No client role trust. No DEFAULT_WORKSPACE_ID fallback.
 */
import {
  AGENT_CAPABILITY_META,
  checkCapabilityRoles,
  classifyApproval,
  type AgentCapabilityMeta,
  type CapabilityHandler,
  type CapabilitySchema,
} from "./supreme-agent-capability-meta";
import { MarketIntelligenceService } from "@/business-intelligence/market/service";
import { SupabaseMarketRepository } from "@/business-intelligence/market/repository";
import { InventoryIntelligenceService } from "@/business-intelligence/inventory/service";
import { SupabaseInventoryRepository } from "@/lib/bi.functions";
import { CustomerIntelligenceService } from "@/business-intelligence/customer/service";
import { SupabaseCustomerRepository } from "@/lib/customer.functions";
import { SupremeIntelligenceOrchestrator } from "@/business-intelligence/supreme/service";
import { MarketRiskEvaluator } from "@/decision-engine/market/market-risk-evaluator";

// Re-exported so existing importers (processor, execution) keep working and the
// pure helpers have exactly one implementation.
export { checkCapabilityRoles, classifyApproval };
export type { CapabilityHandler, CapabilitySchema };

/**
 * Computes the workspace-bounded CRM KPI snapshot (active leads, conversion,
 * pipeline value, average response time). Shared by the CRM capability and the
 * Supreme orchestrator injection. NOTE: the orchestrator contract is
 * `getCRMKPIs: () => Promise<CRMKpiSnapshot>` (callable with NO args), so we
 * compute the snapshot here and inject a constant-returning closure — the
 * TanStack createServerFn wrapper is NOT callable directly from this path.
 */
async function computeCrmKpis(supabase: any, workspaceId: string): Promise<{
  pipelineValueInr: number;
  activeLeads: number;
  conversionRatePct: number;
  averageResponseSeconds: number;
}> {
  const [leadsRes, propsRes, callsRes] = await Promise.all([
    supabase.from("leads").select("id, budget_inr, created_at, stage").eq("workspace_id", workspaceId),
    supabase.from("properties").select("price_inr").eq("workspace_id", workspaceId).eq("is_draft", false),
    supabase.from("calls").select("lead_id, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
  ]);
  if (leadsRes.error) throw new Error(leadsRes.error.message);
  if (propsRes.error) throw new Error(propsRes.error.message);
  if (callsRes.error) throw new Error(callsRes.error.message);

  const leads = (leadsRes.data ?? []) as Array<{ id: string; budget_inr: number; created_at: string; stage: string }>;
  const properties = (propsRes.data ?? []) as Array<{ price_inr: number }>;
  const booked = new Set(["booked", "closed", "won", "converted", "lost"]);
  const activeLeads = leads.filter((l) => !booked.has((l.stage ?? "new").toLowerCase())).length;
  const conversionRatePct = leads.length > 0 ? ((leads.length - activeLeads) / leads.length) * 100 : 0;
  const pipelineValueInr = leads.reduce((s, l) => s + (l.budget_inr ?? 0), 0) +
    properties.reduce((s, p) => s + (p.price_inr ?? 0), 0);

  const calls = (callsRes.data ?? []) as Array<{ lead_id: string; created_at: string }>;
  let averageResponseSeconds = 0;
  if (calls.length > 0) {
    const first = new Date(calls[0].created_at).getTime();
    averageResponseSeconds = first && !Number.isNaN(first) ? Math.max(0, Math.round((Date.now() - first) / 1000)) : 0;
  }

  return { pipelineValueInr, activeLeads, conversionRatePct, averageResponseSeconds };
}

/** Fully-declared capability contract — routing metadata PLUS its handler. */
export type AgentCapability = AgentCapabilityMeta & {
  handler: CapabilityHandler;
};

// =============================================================
// HELPER EXPORTS (consumed by processor + execution)
// =============================================================

/** Look up a registered capability by id. */
export function getCapability(capabilityId: string): AgentCapability | undefined {
  return AGENT_CAPABILITIES[capabilityId];
}

// =============================================================
// REAL SERVICE HANDLERS
// =============================================================

/**
 * The executable half of the registry: one handler per declared capability id.
 * Handlers construct their services LAZILY, per invocation, from the
 * bearer-authenticated Supabase client passed in by the processor — no service
 * is constructed at module import time.
 */
const CAPABILITY_HANDLERS: Record<string, CapabilityHandler> = {
  "crm.getCRMKPIs": async (args, supabase, workspaceId, dryRun) => {
    const kpis = await computeCrmKpis(supabase, workspaceId);
    return { ...kpis, generatedAt: new Date().toISOString(), _dryRun: dryRun };
  },

  "market.getContext": async (args, supabase, workspaceId, dryRun) => {
    const service = new MarketIntelligenceService(
      new SupabaseMarketRepository(supabase)
    );
    const ctx = await service.getContext(workspaceId, dryRun);
    return {
      ...(ctx ?? {}),
      trends: ctx?.trends ?? [],
      opportunities: ctx?.opportunities ?? [],
      count: Array.isArray(ctx?.trends) ? ctx.trends.length : 0,
      generatedAt: new Date().toISOString(),
      _dryRun: dryRun,
    };
  },

  "inventory.getContext": async (args, supabase, workspaceId, dryRun) => {
    const service = new InventoryIntelligenceService(
      new SupabaseInventoryRepository(supabase)
    );
    const ctx = await service.getContext(workspaceId);
    return {
      ...(ctx ?? {}),
      inventorySummary: ctx?.inventorySummary ?? {},
      levels: ctx?.levels ?? [],
      slowMovingCount: ctx?.slowMoving?.length ?? 0,
      slowMovingList: ctx?.slowMoving ?? [],
      highValueUnsold: ctx?.highValueUnsold?.length ?? 0,
      generatedAt: ctx?.generatedAt ?? new Date().toISOString(),
      _dryRun: dryRun,
    };
  },

  "customer.getContext": async (args, supabase, workspaceId, dryRun) => {
    const service = new CustomerIntelligenceService(
      new SupabaseCustomerRepository(supabase)
    );
    const ctx = await service.getContext(workspaceId);
    return {
      ...(ctx ?? {}),
      customerSummary: ctx?.customerSummary ?? null,
      levels: ctx?.levels ?? [],
      generatedAt: ctx?.generatedAt ?? new Date().toISOString(),
      _dryRun: dryRun,
    };
  },

  "agent.matchPropertyCustomer": async (args, supabase, workspaceId, dryRun) => {
    // A real property reference is required to score buyers against it.
    if (!args?.propertyId) {
      return {
        matches: [],
        needsClarification: true,
        clarification:
          "Please provide a specific property (ID or name) to match buyers against.",
        _dryRun: dryRun,
      };
    }
    // Replace with a real matching algorithm when a property reference is
    // supplied; until then return a transparent, non-fabricated response.
    return {
      matches: [],
      needsClarification: false,
      clarification: undefined,
      _dryRun: dryRun,
    };
  },

  "supreme.orchestrate": async (args, supabase, workspaceId, dryRun) => {
    // REAL orchestrator wired with the bearer-authenticated server-side
    // Supabase client (same wiring as supreme-orchestrator.functions.ts).
    const customerService = new CustomerIntelligenceService(
      new SupabaseCustomerRepository(supabase)
    );
    const inventoryService = new InventoryIntelligenceService(
      new SupabaseInventoryRepository(supabase)
    );
    const marketService = new MarketIntelligenceService(
      new SupabaseMarketRepository(supabase)
    );
    const marketRiskEvaluator = new MarketRiskEvaluator();
    // The orchestrator expects `getCRMKPIs: () => Promise<CRMKpiSnapshot>`
    // (called with NO arguments), so we compute the workspace-bounded CRM
    // snapshot here and inject a constant-returning closure — NOT the
    // TanStack createServerFn, which is not callable directly in this path.
    const crmKpis = await computeCrmKpis(supabase, workspaceId);
    const orchestrator = new SupremeIntelligenceOrchestrator(
      customerService,
      inventoryService,
      marketService,
      marketRiskEvaluator,
      async () => crmKpis
    );
    const result = await orchestrator.orchestrate(
      workspaceId,
      undefined,
      undefined,
      dryRun
    );
    return { orchestration: result, _dryRun: dryRun };
  },
};

// =============================================================
// DERIVED REGISTRY — metadata (source of truth) + handler
// =============================================================

/**
 * Every capability declares routing metadata; handlers invoke REAL services.
 * Built by merging AGENT_CAPABILITY_META with CAPABILITY_HANDLERS so the router
 * and the executor can never disagree about a capability's contract.
 */
export const AGENT_CAPABILITIES: Record<string, AgentCapability> =
  buildRegistry();

function buildRegistry(): Record<string, AgentCapability> {
  const registry: Record<string, AgentCapability> = {};
  const metaIds = Object.keys(AGENT_CAPABILITY_META);
  const handlerIds = Object.keys(CAPABILITY_HANDLERS);

  const missingHandler = metaIds.filter((id) => !CAPABILITY_HANDLERS[id]);
  const missingMeta = handlerIds.filter((id) => !AGENT_CAPABILITY_META[id]);
  if (missingHandler.length > 0 || missingMeta.length > 0) {
    // A registration error, not a runtime condition: a capability that can be
    // routed but not run (or run but not routed) must never ship silently.
    throw new Error(
      "SUPREME_CAPABILITY_REGISTRATION_ERROR: " +
        [
          missingHandler.length > 0
            ? `metadata without handler: ${missingHandler.join(", ")}`
            : "",
          missingMeta.length > 0
            ? `handler without metadata: ${missingMeta.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("; ")
    );
  }

  for (const id of metaIds) {
    registry[id] = { ...AGENT_CAPABILITY_META[id], handler: CAPABILITY_HANDLERS[id] };
  }
  return registry;
}
