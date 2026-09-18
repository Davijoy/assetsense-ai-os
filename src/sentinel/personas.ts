/**
 * SENTINEL FORT — Persona registry.
 *
 * Maps each persona to existing Sentinel Fort modules, capability ids, and an
 * advisory landing. These are EXPERIENCE RECOMMENDATIONS ONLY. They never
 * widen authorization — the route/workspace/role gates (DB-backed) stay the
 * sole authority. Capability ids intentionally reference the EXISTING
 * registry ids in src/lib/supreme-agent-capabilities.ts (crm.getCRMKPIs,
 * market.getContext, inventory.getContext, customer.getContext,
 * supreme.orchestrate); they are not duplicated implementations.
 */
import type { BusinessObjectiveId } from "./types";
import type { SentinelCapabilityId } from "./objectives";
import type { SentinelPersona } from "./types";

export interface PersonaDefinition {
  id: SentinelPersona;
  label: string;
  /** Advisory existing route the experience prefers. */
  landing: string | null;
  /** Existing modules surfaced for this persona (advisory, priority order). */
  modules: string[];
  /** Existing capability ids this persona may engage. */
  capabilities: SentinelCapabilityId[];
  /** Intelligence reasoning modes the persona tends to benefit from. */
  intelligence: string[];
  /** Persona-aligned next-best-action labels. */
  actions: string[];
  /** Likely normalized objectives for this persona (advisory). */
  objectives: BusinessObjectiveId[];
}

export const PERSONAS: Record<SentinelPersona, PersonaDefinition> = {
  BUYER: {
    id: "BUYER",
    label: "Investor",
    landing: "/app/marketplace",
    modules: ["/app/marketplace", "/app/market"],
    capabilities: ["market.getContext"],
    intelligence: ["RETRIEVE", "ANALYZE"],
    actions: ["Discover matching properties", "Understand locality pricing"],
    objectives: ["FIND_PROPERTY", "UNDERSTAND_MARKET"],
  },
  INVESTOR: {
    id: "INVESTOR",
    label: "Investor",
    landing: "/app/market",
    modules: ["/app/market", "/app/bi", "/app/marketplace"],
    capabilities: ["market.getContext", "inventory.getContext"],
    intelligence: ["ANALYZE", "CORRELATE", "RECOMMEND"],
    actions: ["Evaluate return potential", "Compare localities"],
    objectives: ["IDENTIFY_INVESTMENT", "UNDERSTAND_MARKET"],
  },
  PROPERTY_OWNER: {
    id: "PROPERTY_OWNER",
    label: "Property Owner",
    landing: "/app/marketplace",
    modules: ["/app/marketplace", "/app/inventory"],
    capabilities: ["inventory.getContext"],
    intelligence: ["RETRIEVE", "ANALYZE"],
    actions: ["List / track owned property", "Assess sale readiness"],
    objectives: ["SELL_PROPERTY", "MANAGE_INVENTORY_PERFORMANCE"],
  },
  CHANNEL_PARTNER: {
    id: "CHANNEL_PARTNER",
    label: "Channel Partner",
    landing: "/app/crm",
    modules: ["/app/crm", "/app/marketplace", "/app/leads"],
    capabilities: ["customer.getContext", "crm.getCRMKPIs"],
    intelligence: ["MATCH", "ANALYZE", "RECOMMEND"],
    actions: ["Match investor to inventory", "Review pipeline"],
    objectives: ["MATCH_BUYERS_TO_INVENTORY", "GENERATE_LEADS"],
  },
  BROKER: {
    id: "BROKER",
    label: "Broker",
    landing: "/app/crm",
    modules: ["/app/crm", "/app/marketplace", "/app/leads"],
    capabilities: ["customer.getContext", "crm.getCRMKPIs"],
    intelligence: ["MATCH", "RECOMMEND"],
    actions: ["Match investor to inventory", "Close their deal"],
    objectives: ["MATCH_BUYERS_TO_INVENTORY", "CLOSE_DEALS"],
  },
  SALES_EXECUTIVE: {
    id: "SALES_EXECUTIVE",
    label: "Sales Executive",
    landing: "/app/leads",
    modules: ["/app/leads", "/app/crm", "/app/voice"],
    capabilities: ["crm.getCRMKPIs", "customer.getContext"],
    intelligence: ["ANALYZE", "DIAGNOSE", "RECOMMEND"],
    actions: ["Prioritize leads", "Follow up high-value investors"],
    objectives: ["GENERATE_LEADS", "CLOSE_DEALS"],
  },
  DEVELOPER: {
    id: "DEVELOPER",
    label: "Developer / Builder",
    landing: "/app/inventory",
    modules: ["/app/inventory", "/app/leads", "/app/market"],
    capabilities: ["inventory.getContext", "customer.getContext", "supreme.orchestrate"],
    intelligence: ["ANALYZE", "DIAGNOSE", "CORRELATE", "RECOMMEND"],
    actions: ["Manage inventory performance", "Track project sales"],
    objectives: ["OPTIMIZE_PROJECT", "MANAGE_INVENTORY_PERFORMANCE"],
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    label: "Enterprise / Management",
    landing: "/app/command",
    modules: ["/app/command", "/app/supreme-intelligence", "/app/bi"],
    capabilities: ["customer.getContext", "inventory.getContext", "market.getContext", "supreme.orchestrate", "crm.getCRMKPIs"],
    intelligence: ["DIAGNOSE", "CORRELATE", "RECOMMEND", "DECIDE"],
    actions: ["Cross-domain business overview", "Decide next best action"],
    objectives: ["MAKE_BUSINESS_DECISIONS"],
  },
  PLATFORM_ADMIN: {
    id: "PLATFORM_ADMIN",
    label: "Platform Administrator",
    landing: "/fort/platform",
    modules: [
      "/app/users",
      "/app/governance",
      "/app/command",
      "/app/supreme-intelligence",
    ],
    capabilities: ["supreme.orchestrate"],
    intelligence: ["ANALYZE", "DIAGNOSE"],
    actions: ["Administer workspace", "Review platform health"],
    objectives: ["MAKE_BUSINESS_DECISIONS"],
  },
  AI_TECHNOLOGY_DEVELOPER: {
    id: "AI_TECHNOLOGY_DEVELOPER",
    label: "AI / Technology Developer",
    landing: "/app/bi",
    modules: ["/app/bi", "/app/supreme-intelligence", "/app/market"],
    capabilities: ["market.getContext", "inventory.getContext", "customer.getContext", "supreme.orchestrate"],
    intelligence: ["ANALYZE", "CORRELATE", "DECIDE"],
    actions: ["Exercise intelligence engines", "Debug model behavior"],
    objectives: ["BUILD_TECHNOLOGY", "UNDERSTAND_MARKET"],
  },
  PARTNER_SERVICE_PROVIDER: {
    id: "PARTNER_SERVICE_PROVIDER",
    label: "Partner / Service Provider",
    landing: "/app/crm",
    modules: ["/app/crm", "/app/marketplace"],
    capabilities: ["crm.getCRMKPIs", "customer.getContext"],
    intelligence: ["ANALYZE", "RECOMMEND"],
    actions: ["Serve client needs", "Track shared pipeline"],
    objectives: ["GENERATE_LEADS", "MATCH_BUYERS_TO_INVENTORY"],
  },
};

export function getPersona(id: SentinelPersona): PersonaDefinition {
  return PERSONAS[id];
}

export function isPersona(value: string): value is SentinelPersona {
  return value in PERSONAS;
}