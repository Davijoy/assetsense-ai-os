/**
 * SUPREME AGENT KERNEL — Capability Metadata (PURE, dependency-free)
 * Sentinel Fort
 *
 * This module holds the ROUTING METADATA of every registered capability:
 * id, domain, description, intents, subject vocabulary, read/write mode,
 * required roles, dry-run support, schemas and result summarizers.
 *
 * It deliberately contains NO imports of intelligence services, repositories,
 * orchestrators or the Supabase client. This keeps the client-side AppShell
 * (and therefore every /app route) lightweight: the Sentinel Companion routes
 * prompts against this metadata WITHOUT pulling the Supreme backend into the
 * browser bundle. Real HANDLERS live in ./supreme-agent-capabilities, which
 * derives from this single source of truth — no duplication.
 *
 * NON-NEGOTIABLE: B1, B3, B4 preserved. Server-side execution only.
 * DB roles only. No RLS weakening. No client role trust.
 */
import type { AgentIntent, AgentDomain } from "./supreme-agent-types";

/** Signature of every capability handler (workspace-bounded, dry-run aware). */
export type CapabilityHandler = (
  args: any,
  supabase: any,
  workspaceId: string,
  dryRun: boolean
) => Promise<any>;

export interface CapabilitySchema {
  [field: string]: string;
}

/** Pure routing contract — everything EXCEPT the executable handler. */
export interface AgentCapabilityMeta {
  id: string;
  domain: AgentDomain;
  description: string;
  /** Intent categories this capability can answer. */
  intents: AgentIntent[];
  /** Single-token subject vocabulary (semantic terms). */
  subjects: string[];
  /** Multi-word subject phrases (used for subject phrase matching). */
  subjectPhrases?: string[];
  mode: "read" | "write" | "read/write";
  requiredRoles: string[];
  dryRunSupport: boolean;
  /** Priority/specificity hint used to break ties; higher wins. */
  priority?: number;
  /** Capability ids whose context is required before this one runs. */
  planDependencies?: string[];
  inputSchema?: CapabilitySchema;
  outputSchema?: CapabilitySchema;
  /** Concise natural-language summary of a handler result (no fabrication). */
  summarize?: (result: any) => string;
}

// =============================================================
// CAPABILITY ROUTING METADATA — SINGLE SOURCE OF TRUTH
// =============================================================

export const AGENT_CAPABILITY_META: Record<string, AgentCapabilityMeta> = {
  "crm.getCRMKPIs": {
    id: "crm.getCRMKPIs",
    domain: "crm",
    description:
      "Get CRM KPI snapshot (active leads, conversion, pipeline, response time)",
    intents: ["QUERY", "ANALYZE"],
    subjects: [
      "crm",
      "lead",
      "pipeline",
      "conversion",
      "response",
      "deal",
      "followup",
      "sales",
    ],
    subjectPhrases: [
      "conversion rate",
      "pipeline value",
      "active leads",
      "response time",
    ],
    mode: "read",
    requiredRoles: ["admin", "manager", "agent", "viewer", "builder", "developer"],
    dryRunSupport: true,
    priority: 2,
    inputSchema: { workspaceId: "string", dryRun: "boolean" },
    outputSchema: {
      activeLeads: "number",
      conversionRatePct: "number",
      pipelineValueInr: "number",
      averageResponseSeconds: "number",
      generatedAt: "string",
    },
    summarize: (r) => {
      const conv =
        typeof r.conversionRatePct === "number"
          ? r.conversionRatePct.toFixed(1)
          : "0";
      const inr =
        typeof r.pipelineValueInr === "number"
          ? r.pipelineValueInr.toLocaleString("en-IN")
          : "0";
      const resp =
        typeof r.averageResponseSeconds === "number"
          ? `${r.averageResponseSeconds}s`
          : "n/a";
      return `CRM snapshot: ${r.activeLeads ?? 0} active leads, ${conv}% conversion rate, ₹${inr} pipeline value, average response ${resp}.`;
    },
  },

  "market.getContext": {
    id: "market.getContext",
    domain: "market",
    description: "Market intelligence context (trends, opportunities, pricing)",
    intents: ["QUERY", "ANALYZE"],
    subjects: [
      "market",
      "opportunity",
      "demand",
      "price",
      "pricing",
      "trend",
      "locality",
      "growth",
    ],
    subjectPhrases: ["market opportunities", "price trend", "high demand"],
    mode: "read",
    requiredRoles: ["admin", "manager"],
    dryRunSupport: true,
    priority: 2,
    inputSchema: { workspaceId: "string", dryRun: "boolean" },
  },

  "inventory.getContext": {
    id: "inventory.getContext",
    domain: "inventory",
    description: "Inventory intelligence context (levels, slow-moving, unsold)",
    intents: ["QUERY", "ANALYZE"],
    subjects: [
      "inventory",
      "unit",
      "stock",
      "unsold",
      "available",
      "project",
      "deal",
    ],
    subjectPhrases: ["slow moving", "high value unsold", "inventory levels"],
    mode: "read",
    requiredRoles: ["admin", "manager"],
    dryRunSupport: true,
    priority: 2,
    inputSchema: { workspaceId: "string", dryRun: "boolean" },
  },
  "customer.getContext": {
    id: "customer.getContext",
    domain: "customer",
    description: "Customer intelligence context (buyers, engagement, churn risk)",
    intents: ["QUERY", "ANALYZE"],
    subjects: [
      "customer",
      "buyer",
      "contact",
      "engagement",
      "churn",
      "risk",
      "at.risk",
    ],
    subjectPhrases: ["at risk", "high value", "churn risk", "customer at risk"],
    mode: "read",
    requiredRoles: ["admin", "manager"],
    dryRunSupport: true,
    priority: 2,
    inputSchema: { workspaceId: "string", dryRun: "boolean" },
  },

  "agent.matchPropertyCustomer": {
    id: "agent.matchPropertyCustomer",
    domain: "supreme",
    description: "Match buyers to a property (budget / requirement alignment)",
    intents: ["MATCH", "SEARCH"],
    subjects: ["buyer", "match", "property", "customer", "matching"],
    subjectPhrases: ["matching this property", "buyers matching"],
    mode: "read",
    requiredRoles: ["admin", "manager"],
    dryRunSupport: true,
    priority: 3,
    planDependencies: ["inventory.getContext", "customer.getContext"],
    inputSchema: {
      propertyId: "string?",
      budgetRange: "string?",
      workspaceId: "string",
      dryRun: "boolean",
    },
    outputSchema: {
      matches: "object[]",
      needsClarification: "boolean",
      clarification: "string?",
    },
  },

  "supreme.orchestrate": {
    id: "supreme.orchestrate",
    domain: "supreme",
    description: "Cross-domain Supreme Intelligence orchestration",
    intents: ["ANALYZE", "RECOMMEND", "QUERY"],
    subjects: ["supreme", "overall", "assessment", "cross", "business"],
    subjectPhrases: [
      "business intelligence",
      "overall business",
      "overall assessment",
      "cross domain",
    ],
    mode: "read",
    requiredRoles: ["admin", "manager"],
    dryRunSupport: true,
    priority: 1,
    inputSchema: { workspaceId: "string", dryRun: "boolean" },
    outputSchema: { orchestration: "object" },
  },
};

// =============================================================
// PURE HELPERS (metadata-only — safe on client and server)
// =============================================================

/** Role check for a capability — caller must hold at least one required role. */
export function checkCapabilityRoles(
  requiredRoles: string[],
  userRoles: string[]
): boolean {
  return requiredRoles.some((r) => userRoles.includes(r));
}

/** Classify whether a capability requires an approval gate before execution. */
export function classifyApproval(
  capabilityId: string
): "none" | "required" {
  const cap = AGENT_CAPABILITY_META[capabilityId];
  if (!cap) return "none";
  // Write and read/write modes always require an approval gate; read-only
  // capabilities with dryRunSupport=false also need explicit confirmation.
  if (cap.mode !== "read") return "required";
  if (!cap.dryRunSupport) return "required";
  return "none";
}