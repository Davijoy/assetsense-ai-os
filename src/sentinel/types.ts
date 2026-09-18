/**
 * SENTINEL FORT — Identity → Intent → Objective → Experience → Intelligence
 *
 * Pure domain types for the Sentinel Fort identity/experience layer.
 *
 * NON-NEGOTIABLE DISCIPLINE (mirroring the project's B1/B3/B4 rules):
 *  - This layer NEVER determines authorization. It only describes and
 *    recommends the experience. RBAC (server-side, DB-backed via
 *    public.user_roles since these types exist today) remains the ONLY boundary
 *    that grants access.
 *  - No client-provided roles, no JWT app_metadata / user_metadata reads, no
 *    DEFAULT_WORKSPACE_ID fallback, no RLS weakening.
 *  - `authorizationRoles` below is passed through for context ONLY; the
 *    resolver never treats it as a permit to change authorization.
 */

/** A PERSONA is WHO the user is in the Sentinel Fort experience.
 *  Deliberately distinct from an authorization AppRole. A single user may
 *  hold multiple personas, switch over time, and operate in different
 *  business contexts. */
export type SentinelPersona =
  | "BUYER"
  | "INVESTOR"
  | "PROPERTY_OWNER"
  | "CHANNEL_PARTNER"
  | "BROKER"
  | "SALES_EXECUTIVE"
  | "DEVELOPER"
  | "ENTERPRISE"
  | "PLATFORM_ADMIN"
  | "AI_TECHNOLOGY_DEVELOPER"
  | "PARTNER_SERVICE_PROVIDER";

/** WHY the user is here (intent onboarding signal). */
export type SentinelIntent =
  | "FIND_PROPERTY"
  | "EVALUATE_INVESTMENT"
  | "SELL_DISPOSE"
  | "GENERATE_LEADS"
  | "CLOSE_MORE_DEALS"
  | "MANAGE_INVENTORY"
  | "UNDERSTAND_MARKET"
  | "MANAGE_BUSINESS"
  | "INTEGRATE_OR_BUILD"
  | "OTHER";

/** WHAT the user is trying to accomplish (normalized objective). */
export type BusinessObjectiveId =
  | "FIND_PROPERTY"
  | "IDENTIFY_INVESTMENT"
  | "SELL_PROPERTY"
  | "MATCH_BUYERS_TO_INVENTORY"
  | "GENERATE_LEADS"
  | "CLOSE_DEALS"
  | "OPTIMIZE_PROJECT"
  | "MANAGE_INVENTORY_PERFORMANCE"
  | "MAKE_BUSINESS_DECISIONS"
  | "UNDERSTAND_MARKET"
  | "BUILD_TECHNOLOGY";

/** Dimensionless, extensible context record for any objective. */
export interface ObjectiveContext {
  geography?: string;
  budget?: { min?: number; max?: number; currency?: string };
  propertyType?: string;
  timeline?: string;
  requirements?: string[];
  capital?: number;
  riskPreference?: "LOW" | "MEDIUM" | "HIGH";
  investmentHorizon?: string;
  returnObjective?: string;
  buyerDemand?: string;
  inventory?: string;
  project?: string;
  sales?: string;
  pricing?: string;
  demand?: string;
  market?: string;
  projectPerformance?: string;
  crm?: string;
  customers?: string;
  businessPerformance?: string;
  /** Extensible: future domains add keys without schema migration. */
  [key: string]: unknown;
}

/** A normalized business objective the experience may resolve toward. The
 *  concrete registry (OBJECTIVES) lives in ./objectives.ts. */
export interface BusinessObjective {
  id: BusinessObjectiveId;
  label: string;
  /** Primary intent this objective satisfies. */
  intent: SentinelIntent;
  /** Context keys relevant to this objective (see ObjectiveContext). */
  contextKeys: (keyof ObjectiveContext)[];
  /** Existing capabilities this objective may engage (advisory). */
  capabilities: string[];
  /** Intelligence reasoning modes this objective tends to benefit from. */
  intelligence: string[];
  /** Aligned next-best-action labels. */
  actions: string[];
  /** Optional advisory metadata (explicitly `unknown` to avoid coupling). */
  [key: string]: unknown;
}

/** Onboarding state machine. */
export type OnboardingState =
  "NEW_USER" | "PROFILE_INCOMPLETE" | "PROFILE_COMPLETE" | "RETURNING_USER" | "MULTI_PERSONA";

/** Identity resolution: WHO the user is in the experience layer. */
export interface IdentityProfile {
  identityId: string;
  personae: SentinelPersona[];
  primaryPersona: SentinelPersona | null;
  intents: SentinelIntent[];
  onboarding: OnboardingState;
  workspaceId: string | null;
  profileComplete: boolean;
}

/** Authorization boundary — passed through, NOT decided here. */
export interface AuthorizationContext {
  identityId: string;
  workspaceId: string | null;
  /** Mirror of the server-resolved role set (DB-backed user_roles in this
   *  project). Advisory / descriptive only. */
  roles: readonly string[];
}

/** Why the experience layer can recommend but never grant. */
export interface ExperienceProfile {
  persona: SentinelPersona | null;
  intents: SentinelIntent[];
  objective: BusinessObjective | null;
  onboarding: OnboardingState;
  /** Existing module destination. Advisory — route-level RBAC remains the gate. */
  landingDestination: string | null;
  /** Existing modules to surface (advisory, in priority order). */
  modules: string[];
  /** Existing capability ids the experience may engage (advisory). */
  capabilities: string[];
  /** Reasoning modes the intelligence layer may favor for this persona. */
  intelligenceActions: string[];
  /** Human labels for the next-best-action affordances. */
  nextBestActions: string[];
  /** Advisory only; never alters the authorization boundary. */
  authorization: AuthorizationContext;
}

/** Structured context handed to the existing Supreme Intelligence layer.
 *  May influence RETRIEVE/ANALYZE/DIAGNOSE/CORRELATE/RECOMMEND/DECIDE but must
 *  NEVER override authorization. */
export interface SupremeContext {
  persona: SentinelPersona | null;
  intent: SentinelIntent | null;
  objective: BusinessObjective | null;
  experience: ExperienceProfile | null;
  context: ObjectiveContext;
  authorization: AuthorizationContext;
  generatedAt: string;
}

/** SENTINEL FORT — Product Fort identity.
 *  The Fort is the PRODUCT EXPERIENCE; CRM/marketplace/inventory/etc. are
 *  technology/capabilities underneath it. A Fort NEVER grants access — it is
 *  an advisory experience surface resolved from the persona. Authorization
 *  (DB roles + RLS) remains the only authority. */
export type SentinelFort = "BROKER" | "BUILDER" | "ENTERPRISE" | "INDIVIDUAL" | "PLATFORM";

/** Pre-authentication experience draft.
 *  MAY be persisted client-side (advisory ONLY). It contains experience
 *  preferences and NEVER roles, workspace ids, permissions, or any
 *  authorization signal. Server authorization is re-resolved after auth. */
export interface ExperienceDraft {
  persona: SentinelPersona | null;
  intents: SentinelIntent[];
  objective: BusinessObjectiveId | null;
  context: ObjectiveContext;
  fort: SentinelFort | null;
  createdAt: string;
}
