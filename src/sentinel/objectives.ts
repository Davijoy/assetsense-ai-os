/**
 * SENTINEL FORT — Normalized Business Objective model.
 *
 * Extensible domain model mapping each objective to the existing capability
 * ids and intelligence modes it needs. CAPABILITIES / MODULES ARE ADVISORY —
 * they never widen authorization (RBAC stays server-side and DB-backed).
 */
import type {
  BusinessObjective,
  BusinessObjectiveId,
  ObjectiveContext,
  SentinelIntent,
} from "./types";

/** Capability ids are EXISTING ids from the Supreme Agent capability registry
 *  (src/lib/supreme-agent-capabilities.ts) — referenced, never duplicated. */
export type SentinelCapabilityId =
  | "crm.getCRMKPIs"
  | "market.getContext"
  | "inventory.getContext"
  | "customer.getContext"
  | "supreme.orchestrate";

/** Every example objective from the sprint brief, plus the natural extras. */
export const OBJECTIVES: Record<BusinessObjectiveId, BusinessObjective> = {
  FIND_PROPERTY: {
    id: "FIND_PROPERTY",
    label: "Find a property",
    intent: "FIND_PROPERTY",
    contextKeys: ["geography", "budget", "propertyType", "timeline", "requirements"],
    capabilities: ["market.getContext", "inventory.getContext"],
    intelligence: ["RETRIEVE", "ANALYZE"],
    actions: ["Discover matching properties", "Shortlist by budget & locality"],
  },
  IDENTIFY_INVESTMENT: {
    id: "IDENTIFY_INVESTMENT",
    label: "Identify an investment",
    intent: "EVALUATE_INVESTMENT",
    contextKeys: ["capital", "geography", "riskPreference", "investmentHorizon", "returnObjective"],
    capabilities: ["market.getContext", "inventory.getContext"],
    intelligence: ["ANALYZE", "CORRELATE", "RECOMMEND"],
    actions: ["Evaluate return potential", "Compare localities & asset classes"],
  },
  SELL_PROPERTY: {
    id: "SELL_PROPERTY",
    label: "Sell / dispose property",
    intent: "SELL_DISPOSE",
    contextKeys: ["propertyType", "geography", "timeline", "inventory"],
    capabilities: ["inventory.getContext", "market.getContext"],
    intelligence: ["RETRIEVE", "ANALYZE", "DIAGNOSE"],
    actions: ["Assess sale readiness", "Set a competitive price"],
  },
  MATCH_BUYERS_TO_INVENTORY: {
    id: "MATCH_BUYERS_TO_INVENTORY",
    label: "Match buyers to inventory",
    intent: "CLOSE_MORE_DEALS",
    contextKeys: ["buyerDemand", "inventory", "geography", "project", "requirements"],
    capabilities: ["customer.getContext", "inventory.getContext", "crm.getCRMKPIs"],
    intelligence: ["MATCH", "ANALYZE", "RECOMMEND"],
    actions: ["Match buyer to project", "Prioritize high-fit buyers"],
  },
  GENERATE_LEADS: {
    id: "GENERATE_LEADS",
    label: "Generate leads",
    intent: "GENERATE_LEADS",
    contextKeys: ["market", "geography", "customers"],
    capabilities: ["customer.getContext", "crm.getCRMKPIs"],
    intelligence: ["ANALYZE", "DIAGNOSE", "RECOMMEND"],
    actions: ["Identify high-intent prospects", "Prioritize follow-up"],
  },
  CLOSE_DEALS: {
    id: "CLOSE_DEALS",
    label: "Close more deals",
    intent: "CLOSE_MORE_DEALS",
    contextKeys: ["crm", "sales", "customers", "requirements"],
    capabilities: ["crm.getCRMKPIs", "customer.getContext"],
    intelligence: ["DIAGNOSE", "RECOMMEND"],
    actions: ["Surface active opportunities", "Drive next best action"],
  },
  OPTIMIZE_PROJECT: {
    id: "OPTIMIZE_PROJECT",
    label: "Optimize a project",
    intent: "MANAGE_INVENTORY",
    contextKeys: ["inventory", "demand", "sales", "pricing", "market", "projectPerformance"],
    capabilities: ["inventory.getContext", "market.getContext", "customer.getContext", "supreme.orchestrate"],
    intelligence: ["ANALYZE", "DIAGNOSE", "CORRELATE", "RECOMMEND"],
    actions: ["Monitor project sales velocity", "Adjust pricing for demand"],
  },
  MANAGE_INVENTORY_PERFORMANCE: {
    id: "MANAGE_INVENTORY_PERFORMANCE",
    label: "Manage inventory performance",
    intent: "MANAGE_INVENTORY",
    contextKeys: ["inventory", "project", "sales", "market"],
    capabilities: ["inventory.getContext", "market.getContext"],
    intelligence: ["ANALYZE", "DIAGNOSE"],
    actions: ["Track slow-moving units", "Rebalance inventory"],
  },
  MAKE_BUSINESS_DECISIONS: {
    id: "MAKE_BUSINESS_DECISIONS",
    label: "Make business decisions",
    intent: "MANAGE_BUSINESS",
    contextKeys: ["crm", "inventory", "customers", "market", "sales", "businessPerformance"],
    capabilities: ["crm.getCRMKPIs", "inventory.getContext", "customer.getContext", "market.getContext", "supreme.orchestrate"],
    intelligence: ["DIAGNOSE", "CORRELATE", "RECOMMEND", "DECIDE"],
    actions: ["Cross-domain business overview", "Decide next best action"],
  },
  UNDERSTAND_MARKET: {
    id: "UNDERSTAND_MARKET",
    label: "Understand the market",
    intent: "UNDERSTAND_MARKET",
    contextKeys: ["market", "geography", "pricing", "demand"],
    capabilities: ["market.getContext", "inventory.getContext"],
    intelligence: ["RETRIEVE", "ANALYZE", "CORRELATE"],
    actions: ["Read market momentum", "Spot demand trends"],
  },
  BUILD_TECHNOLOGY: {
    id: "BUILD_TECHNOLOGY",
    label: "Build / integrate technology",
    intent: "INTEGRATE_OR_BUILD",
    contextKeys: ["project", "market", "crm", "inventory"],
    capabilities: ["market.getContext", "inventory.getContext", "customer.getContext", "supreme.orchestrate"],
    intelligence: ["ANALYZE", "CORRELATE", "DECIDE"],
    actions: ["Exercise intelligence engines", "Verify model behavior"],
  },
};

export function getObjective(id: BusinessObjectiveId): BusinessObjective {
  return OBJECTIVES[id];
}

export function isObjective(id: string): id is BusinessObjectiveId {
  return id in OBJECTIVES;
}