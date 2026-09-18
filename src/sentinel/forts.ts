/**
 * SENTINEL FORT — Product Fort registry and persona → Fort mapping.
 *
 * The Fort is the PRODUCT EXPERIENCE. CRM / Marketplace / Inventory / Voice /
 * Marketing / Market Intelligence / Supreme Intelligence are TECHNOLOGY and
 * CAPABILITIES underneath a Fort — they are NOT the product surface.
 *
 * NON-NEGOTIABLE: A Fort is an ADVISORY experience surface. It is selected
 * from the persona (an experience preference) and NEVER grants roles,
 * permissions, workspace access or route access. Server-side DB-backed
 * RBAC/RLS remains the sole authority. `modules` reference existing platform
 * route paths — never fabricated, never duplicated business logic.
 */
import type { ExperienceProfile, SentinelFort, SentinelPersona } from "./types";

export interface FortDefinition {
  id: SentinelFort;
  /** Route slug (e.g. "/fort/broker"). */
  route: string;
  /** Surface label, e.g. rendered destination. */
  label: string;
  /** Personalized welcome headline. */
  welcome: string;
  /** Personalized focus line. */
  tagline: string;
  mission: string;
  personae: SentinelPersona[];
  modules: string[];
  capabilities: string[];
  intelligence: string[];
  actions: string[];
  planned: string[];
}

export const FORTS: Record<SentinelFort, FortDefinition> = {
  BROKER: {
    id: "BROKER",
    route: "/fort/broker",
    label: "Sales Executive Fort",
    welcome: "Your Sales Executive Workspace",
    tagline: "Your focus: matching investors with the right inventory and closing deals.",
    mission:
      "Sentinel helps you find inventory, match investors, manage opportunities and close business — not a generic CRM dashboard.",
    personae: ["BROKER", "CHANNEL_PARTNER", "SALES_EXECUTIVE"],
    modules: [
      "/app/crm",
      "/app/leads",
      "/app/marketplace",
      "/app/inventory",
      "/app/market",
      "/app/messages",
      "/app/voice",
      "/app/marketing",
      "/app/supreme-intelligence",
      "/app/dealrooms",
    ],
    capabilities: [
      "customer.getContext",
      "crm.getCRMKPIs",
      "inventory.getContext",
      "market.getContext",
      "supreme.orchestrate",
    ],
    intelligence: ["MATCH", "ANALYZE", "RECOMMEND", "DIAGNOSE"],
    actions: [
      "Match investor to inventory",
      "Review pipeline and deals",
      "Follow up high-intent leads",
      "Read locality pricing",
    ],
    planned: ["Site visit scheduling", "Deal room intelligence", "Voice follow-up workflows"],
  },
  BUILDER: {
    id: "BUILDER",
    route: "/fort/builder",
    label: "Developer / Builder Fort",
    welcome: "Your Developer / Builder Workspace",
    tagline: "Your focus: understanding demand, inventory and project performance.",
    mission:
      "Sentinel helps you run and grow your development business — projects, inventory, pricing and market momentum in one intelligent surface.",
    personae: ["DEVELOPER"],
    modules: [
      "/app/inventory",
      "/app/salesintel",
      "/app/market",
      "/app/leads",
      "/app/crm",
      "/app/messages",
      "/app/marketing",
      "/app/bi",
      "/app/supreme-intelligence",
    ],
    capabilities: [
      "inventory.getContext",
      "customer.getContext",
      "market.getContext",
      "supreme.orchestrate",
    ],
    intelligence: ["ANALYZE", "DIAGNOSE", "CORRELATE", "RECOMMEND"],
    actions: [
      "Monitor project sales velocity",
      "Adjust pricing for demand",
      "Track slow-moving units",
      "Spot demand trends",
    ],
    planned: ["Project forecasting", "Channel partner campaigns", "Cost & margin tracking"],
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    route: "/fort/enterprise",
    label: "Enterprise Command Fort",
    welcome: "Your Enterprise Command Workspace",
    tagline: "Your focus: portfolio intelligence and strategic decisions.",
    mission:
      "Sentinel is your real estate command and intelligence environment — portfolio, projects, risk and strategic decisions.",
    personae: ["ENTERPRISE"],
    modules: [
      "/app/command",
      "/app/supreme-intelligence",
      "/app/bi",
      "/app/market",
      "/app/risk",
      "/app/inventory",
      "/app/crm",
      "/app/customer",
      "/app/messages",
    ],
    capabilities: [
      "crm.getCRMKPIs",
      "inventory.getContext",
      "customer.getContext",
      "market.getContext",
      "supreme.orchestrate",
    ],
    intelligence: ["DIAGNOSE", "CORRELATE", "RECOMMEND", "DECIDE"],
    actions: [
      "Cross-domain business overview",
      "Decide next best action",
      "Review portfolio risk",
      "Read executive command",
    ],
    planned: ["Financial intelligence", "Forecasting", "Capital exposure analytics"],
  },
  INDIVIDUAL: {
    id: "INDIVIDUAL",
    route: "/fort/individual",
    label: "Investor Fort",
    welcome: "Your Investor Workspace",
    tagline: "Your focus: finding and evaluating high-conviction investment opportunities.",
    mission: "Sentinel understands what you are looking for and helps you make the right investment decision.",
    personae: ["BUYER", "INVESTOR", "PROPERTY_OWNER"],
    modules: ["/app/marketplace", "/app/market", "/app/inventory", "/app/messages", "/app/supreme-intelligence"],
    capabilities: ["market.getContext", "inventory.getContext", "supreme.orchestrate"],
    intelligence: ["RETRIEVE", "ANALYZE", "CORRELATE", "RECOMMEND"],
    actions: [
      "Discover matching properties",
      "Understand locality pricing",
      "Evaluate return potential",
      "Compare localities",
    ],
    planned: ["Investment analysis", "Financing support", "Lifestyle & location intelligence"],
  },
  PLATFORM: {
    id: "PLATFORM",
    route: "/fort/platform",
    label: "Platform Administrator Fort",
    welcome: "Your Platform Administrator Workspace",
    tagline: "Your focus: platform operations, technology and partner service.",
    mission:
      "Sentinel is your platform command — users, governance, intelligence engines and partner service surfaces.",
    personae: ["PLATFORM_ADMIN", "AI_TECHNOLOGY_DEVELOPER", "PARTNER_SERVICE_PROVIDER"],
    modules: [
      "/app/users",
      "/app/governance",
      "/app/command",
      "/app/bi",
      "/app/supreme-intelligence",
      "/app/marketplace",
      "/app/crm",
      "/app/messages",
    ],
    capabilities: ["supreme.orchestrate", "market.getContext", "crm.getCRMKPIs"],
    intelligence: ["ANALYZE", "DIAGNOSE", "CORRELATE", "DECIDE"],
    actions: [
      "Administer platform",
      "Review workspace health",
      "Exercise intelligence engines",
      "Serve client needs",
    ],
    planned: ["Workspace provisioning", "Integration gateway", "Service level monitoring"],
  },
};

/** Canonical persona → Fort mapping (advisory). */
export const PERSONA_FORT: Record<SentinelPersona, SentinelFort> = {
  BUYER: "INDIVIDUAL",
  INVESTOR: "INDIVIDUAL",
  PROPERTY_OWNER: "INDIVIDUAL",
  CHANNEL_PARTNER: "BROKER",
  BROKER: "BROKER",
  SALES_EXECUTIVE: "BROKER",
  DEVELOPER: "BUILDER",
  ENTERPRISE: "ENTERPRISE",
  PLATFORM_ADMIN: "PLATFORM",
  AI_TECHNOLOGY_DEVELOPER: "PLATFORM",
  PARTNER_SERVICE_PROVIDER: "PLATFORM",
};

/** Resolve the advisory Fort for a persona. Null only when persona is null. */
export function personaToFort(persona: SentinelPersona | null): SentinelFort | null {
  if (!persona) return null;
  return PERSONA_FORT[persona];
}

/** The most representative persona for a Fort (copy fallback only). */
export function fortPrimaryPersona(fort: SentinelFort): SentinelPersona {
  return FORTS[fort].personae[0];
}

export function getFort(id: SentinelFort): FortDefinition {
  return FORTS[id];
}

export function fortForSlug(slug: string): FortDefinition | null {
  for (const fort of Object.values(FORTS)) {
    if (fort.route === `/fort/${slug}`) return fort;
  }
  return null;
}

export function isFort(value: string): value is SentinelFort {
  return value in FORTS;
}

/** Advisory fort selection from a resolved experience profile. */
export function selectFortForProfile(profile: ExperienceProfile | null): SentinelFort | null {
  return personaToFort(profile?.persona ?? null);
}

/**
 * Human label for a registered agent capability id (preview copy ONLY).
 * Unknown ids fall back to the raw id — nothing is invented beyond naming.
 */
export function capabilityLabel(capabilityId: string): string {
  const domain = capabilityId.split(".")[0];
  switch (domain) {
    case "crm":
      return "CRM Intelligence";
    case "inventory":
      return "Inventory Intelligence";
    case "market":
      return "Market Intelligence";
    case "customer":
      return "Customer & Buyer Intelligence";
    case "supreme":
      return "Cross-Domain Supreme Intelligence";
    case "agent":
      return "Buyer ↔ Property Matching";
    default:
      return capabilityId;
  }
}

export interface ResolveWelcomeFortInput {
  workspaceFort?: { id: SentinelFort } | null;
  profilePersona?: SentinelPersona | null;
  draft?: { fort?: SentinelFort | null; persona?: SentinelPersona | null } | null;
}

/**
 * Deterministic Fort routing resolution.
 * Priority:
 *   1. Server-resolved workspace Fort (workspace.fort)
 *   2. Authenticated DB persona (profilePersona)
 *   3. Anonymous local experience draft (draft.fort)
 *   4. Anonymous local persona (draft.persona)
 *
 * Stale localStorage drafts NEVER override authenticated server state.
 */
export function resolveWelcomeFort(input: ResolveWelcomeFortInput): {
  persona: SentinelPersona | null;
  fortId: SentinelFort | null;
  route: string | null;
} {
  const serverFortId =
    input.workspaceFort?.id ??
    (input.profilePersona ? personaToFort(input.profilePersona) : null);

  const persona =
    input.profilePersona ??
    input.draft?.persona ??
    null;

  const fortId =
    serverFortId ??
    input.draft?.fort ??
    personaToFort(persona);

  const route = fortId ? FORTS[fortId]?.route ?? null : null;

  return { persona, fortId, route };
}
