/**
 * SENTINEL FORT — pure FORT experience derivation.
 *
 * ============================================================
 * WHAT THIS MODULE IS
 * ============================================================
 * The deterministic projection of an ALREADY-VERIFIED authorization state onto
 * the FORT experience:
 *
 *     verified workspace + verified app_role
 *              |
 *     modules (ACTIVE / LOCKED / UNAVAILABLE)
 *              |
 *     capability visibility
 *
 * ============================================================
 * WHAT THIS MODULE IS NOT
 * ============================================================
 * It is NOT an authorization engine and it is NOT a second role system.
 *   * It never reads a session, a token, localStorage, a URL or client state.
 *   * It never decides membership — the caller must have verified it already.
 *   * Its output is EXPERIENCE data. Every protected route keeps its own
 *     beforeLoad gate, every server function keeps requireRoles(), and RLS
 *     remains the data boundary. A module marked ACTIVE here grants nothing.
 *
 * Single sources of truth are REUSED, never duplicated:
 *   MODULE_CATALOG          (src/lib/fort-modules.ts)      route -> app_role[]
 *   FORTS                   (src/sentinel/forts.ts)        fort  -> routes
 *   AGENT_CAPABILITY_META   (src/lib/supreme-agent-*.ts)   capability -> roles
 *
 * Dependency discipline: metadata only. This module must never import an
 * intelligence service, repository, orchestrator, processor or Supabase client
 * (see tests/appshell-dependency-boundary.test.ts).
 */
import {
  MODULE_CATALOG,
  moduleAccessState,
  getModuleAccess,
  type ModuleAccessState,
  type AccessMode,
} from "@/lib/fort-modules";
import { ROUTE_ROLES } from "@/lib/route-roles";
import { AGENT_CAPABILITY_META } from "@/lib/supreme-agent-capability-meta";
import type { AppRole } from "@/hooks/use-auth";
import type { SentinelPersona } from "@/sentinel/types";

export function defaultPersonaForRoles(roles: readonly string[]): SentinelPersona {
  if (roles.includes("admin")) return "PLATFORM_ADMIN";
  if (roles.includes("manager")) return "ENTERPRISE";
  if (roles.includes("agent")) return "SALES_EXECUTIVE";
  if (roles.includes("builder") || roles.includes("developer")) return "DEVELOPER";
  return "BUYER";
}

/**
 * Human-facing canonical role display label.
 * Guarantees that internal "agent" is rendered as "Sales Executive".
 */
export function formatCanonicalRoleLabel(role: string): string {
  if (role === "agent") return "Sales Executive";
  if (role === "manager") return "Sales Manager";
  if (role === "admin" || role === "platform_admin") return "Platform Admin";
  if (role === "builder" || role === "developer") return "Developer / Builder";
  if (role === "viewer") return "Investor";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Formats a list of roles into a canonical human-facing display string.
 */
export function formatCanonicalRoles(roles: readonly string[] | null | undefined): string {
  if (!roles || roles.length === 0) return "access pending";
  return roles.map(formatCanonicalRoleLabel).join(" · ");
}

// =============================================================
// WORKSPACE STATUS
// =============================================================

/**
 * Resolved FORT workspace status. Drives which surface the shell renders —
 * never what the account may do.
 *
 *   ACTIVE       verified workspace + at least one verified app_role.
 *   PROVISIONING workspace verified, but no app_role has been granted yet.
 *                Access is being provisioned; nothing is auto-elevated.
 *   AWAITING     no workspace could be safely determined (pending invitation,
 *                suspended membership, or provisioning declined).
 *   ERROR        resolution failed. Fails closed — no modules.
 */
export type FortWorkspaceStatus = "ACTIVE" | "PROVISIONING" | "AWAITING" | "ERROR";

/** Why the resolver landed on its status. Diagnostic copy only. */
export type FortStatusReason =
  | "RESOLVED"
  | "NO_APP_ROLE"
  | "MEMBERSHIP_PENDING"
  | "PROVISIONING_DECLINED"
  | "RESOLUTION_FAILED"
  | "ROLE_MISMATCH";

/**
 * Derive the workspace status from verified inputs.
 *
 * `workspaceId` MUST already have been verified against workspace_members by
 * the caller. This function performs no verification of its own — it only
 * classifies.
 */
export function resolveFortStatus(input: {
  workspaceId: string | null;
  appRoles: readonly string[];
  membershipPending?: boolean;
  roleMismatch?: boolean;
  failed?: boolean;
}): { status: FortWorkspaceStatus; reason: FortStatusReason } {
  if (input.failed) return { status: "ERROR", reason: "RESOLUTION_FAILED" };
  if (input.roleMismatch) return { status: "ERROR", reason: "ROLE_MISMATCH" };
  if (!input.workspaceId) {
    return {
      status: "AWAITING",
      reason: input.membershipPending ? "MEMBERSHIP_PENDING" : "PROVISIONING_DECLINED",
    };
  }
  if (input.appRoles.length === 0) {
    return { status: "PROVISIONING", reason: "NO_APP_ROLE" };
  }
  return { status: "ACTIVE", reason: "RESOLVED" };
}

// =============================================================
// MODULE -> INTELLIGENCE CAPABILITY
// =============================================================

/**
 * Which REGISTERED capability sits behind a module's protected intelligence
 * operation. Values are existing `AGENT_CAPABILITY_META` ids — this is a
 * pointer table, NOT a new permission vocabulary. Modules absent from this map
 * simply have no registered intelligence capability.
 */
export const MODULE_CAPABILITY: Readonly<Record<string, string>> = {
  "/app/crm": "crm.getCRMKPIs",
  "/app/market": "market.getContext",
  "/app/inventory": "inventory.getContext",
  "/app/customer": "customer.getContext",
  "/app/supreme-intelligence": "supreme.orchestrate",
};

/**
 * Can these roles execute a registered capability?
 *
 * Reads `requiredRoles` straight from AGENT_CAPABILITY_META, so the answer is
 * exactly the one the server enforces — this cannot widen Supreme or any
 * domain capability. Unknown ids return false (fail closed).
 */
export function canExecuteCapability(capabilityId: string, roles: readonly string[]): boolean {
  const meta = AGENT_CAPABILITY_META[capabilityId];
  if (!meta) return false;
  return meta.requiredRoles.some((r) => roles.includes(r));
}

/**
 * Capability ids visible to these roles. Visibility only: every handler
 * re-checks authorization server-side before it executes.
 */
export function resolveFortCapabilities(roles: readonly string[]): string[] {
  return Object.keys(AGENT_CAPABILITY_META)
    .filter((id) => canExecuteCapability(id, roles))
    .sort();
}

// =============================================================
// MODULE RESOLUTION
// =============================================================

export interface FortModuleGrant {
  route: string;
  /** ACTIVE = role permits the route. LOCKED = real module, not permitted. */
  state: ModuleAccessState;
  /** Granular access mode (VIEW_ONLY, OPERATIONAL, ADMINISTRATIVE, LOCKED). */
  accessMode?: AccessMode;
  /** Registered intelligence capability behind this module, if any. */
  capabilityId: string | null;
  /**
   * Whether `capabilityId` is executable by these roles. Meaningful only when
   * capabilityId is non-null. This is how a "visible but not executable"
   * module is represented honestly: a role may reach /app/market's surface
   * while market.getContext still requires admin/manager.
   */
  capabilityExecutable: boolean;
}

/**
 * Project a Fort's module list onto verified roles.
 *
 * Routes absent from MODULE_CATALOG are reported UNAVAILABLE and never
 * advertised — the sidebar must not expose a surface that does not exist.
 */
export function resolveFortModules(
  fortModules: readonly string[],
  roles: readonly string[],
  featureFlags?: Record<string, boolean> | null,
): FortModuleGrant[] {
  return fortModules.map((route) => {
    const capabilityId = MODULE_CAPABILITY[route] ?? null;
    const access = getModuleAccess({ roles, featureFlags }, route);
    return {
      route,
      state: access.state,
      accessMode: access.accessMode,
      capabilityId,
      capabilityExecutable: capabilityId ? canExecuteCapability(capabilityId, roles) : false,
    };
  });
}

/** ACTIVE routes only, in Fort order. */
export function activeFortRoutes(grants: readonly FortModuleGrant[]): string[] {
  return grants.filter((g) => g.state === "ACTIVE").map((g) => g.route);
}

// =============================================================
// EXPERIENCE PROFILE -> DEFAULT app_role  (PROVISIONING POLICY)
// =============================================================

/**
 * The experience/persona profiles the product speaks about.
 *
 * ARCHITECTURAL RULE: an experience profile is NOT a security role. These are
 * how a user describes their work; authority still comes from `app_role`.
 * Nothing in the render path reads this map, and selecting a profile can never
 * grant anything.
 */
export type ExperienceProfileId =
  | "platform_administrator"
  | "builder"
  | "developer"
  | "management"
  | "sales_manager"
  | "sales_executive"
  | "marketing"
  | "market_analyst"
  | "inventory_operations"
  | "crm_operations"
  | "investor"
  | "channel_partner"
  | "analyst"
  | "viewer";

/**
 * DEFAULT provisioning intent for each experience profile, expressed in the
 * six EXISTING app_role values. No new role is introduced and app_role is not
 * extended.
 *
 * These are DEFAULTS FOR AN ADMINISTRATOR TO APPLY — they are advisory policy,
 * not a grant mechanism. Where the approved mapping offered a range
 * (market analyst -> viewer/manager, channel partner -> agent/viewer) the
 * LOWER-privilege value is the default, so a profile can never silently
 * elevate. Real authority is always granted explicitly.
 */
export const EXPERIENCE_PROFILE_APP_ROLE: Readonly<Record<ExperienceProfileId, AppRole>> = {
  platform_administrator: "admin",
  builder: "builder",
  developer: "developer",
  management: "manager",
  sales_manager: "manager",
  sales_executive: "agent",
  marketing: "agent",
  crm_operations: "agent",
  // Range in the approved mapping — defaults to the lower privilege.
  market_analyst: "viewer",
  channel_partner: "viewer",
  // Read-oriented profiles.
  inventory_operations: "viewer",
  investor: "viewer",
  analyst: "viewer",
  viewer: "viewer",
};

/**
 * Default app_role an administrator would grant for an experience profile.
 * Advisory only — calling this grants nothing and it is not consulted by
 * module or capability resolution.
 */
export function defaultAppRoleForExperience(profile: ExperienceProfileId): AppRole {
  return EXPERIENCE_PROFILE_APP_ROLE[profile];
}

/** Safe floor applied by self-signup provisioning, mirrored from the DB rule. */
export const SELF_SIGNUP_DEFAULT_APP_ROLE: AppRole = "viewer";

/** Roles provisioning must never assign automatically. */
export const NEVER_AUTO_PROVISIONED_ROLES: readonly AppRole[] = [
  "admin",
  "manager",
  "builder",
  "developer",
];

// =============================================================
// FORT USER ID & ROLE SYNCHRONIZATION
// =============================================================

/**
 * Human-readable FORT User identifier (e.g. FORT-USER-ABC0990).
 *
 * Deterministically derived from the internal database UUID.
 * Contextual identity only — NEVER an authorization claim.
 */
export function formatFortUserId(userId: string | null | undefined): string {
  if (!userId) return "";
  const hex = userId.replace(/-/g, "").toLowerCase();
  if (hex.length < 10) return `FORT-USER-${userId.slice(0, 7).toUpperCase()}`;
  const c1 = String.fromCharCode(65 + (parseInt(hex.slice(0, 2), 16) % 26));
  const c2 = String.fromCharCode(65 + (parseInt(hex.slice(2, 4), 16) % 26));
  const c3 = String.fromCharCode(65 + (parseInt(hex.slice(4, 6), 16) % 26));
  const num = (parseInt(hex.slice(6, 10), 16) % 9000 + 1000).toString();
  return `FORT-USER-${c1}${c2}${c3}${num}`;
}

/**
 * Human-readable FORT Workspace identifier (e.g. FORT-0001).
 *
 * Deterministically derived from the internal database UUID if publicId is missing.
 * Contextual identity only — NEVER an authorization claim.
 */
export function formatFortWorkspacePublicId(
  workspaceId: string | null | undefined,
  publicId?: string | null | undefined,
): string {
  if (publicId && publicId.trim().length > 0 && publicId !== "PENDING" && publicId !== "WORKSPACE PENDING") {
    return publicId.trim();
  }
  if (!workspaceId) {
    return "WORKSPACE PENDING";
  }
  if (workspaceId.endsWith("d3f7")) {
    return "SF-HQ-001";
  }
  const hex = workspaceId.replace(/-/g, "").toLowerCase();
  const num = (parseInt(hex.slice(-4), 16) % 900 + 100).toString();
  return `SF-WS-${num}`;
}

/**
 * Verifies that System A (workspace_members.role_id -> roles.name) and
 * System B (user_roles -> app_role) agree on privilege level.
 *
 * CRITICAL ARCHITECTURAL RULE:
 *   The server must verify that System A and System B agree.
 *   If they disagree, fail closed — never silently elevate or grant.
 *   The one-time provisioning operation is responsible for synchronizing:
 *     System A: workspace_members.role_id = platform_admin
 *     System B: user_roles.role = admin
 */
export function checkRoleSynchronization(
  systemARole: string | null,
  systemBRoles: readonly string[],
): { synchronized: boolean; reason?: string } {
  if (!systemARole) {
    return { synchronized: false, reason: "NO_SYSTEM_A_ROLE" };
  }

  if (systemARole === "platform_admin") {
    if (!systemBRoles.includes("admin")) {
      return {
        synchronized: false,
        reason: "System A platform_admin requires System B admin role",
      };
    }
    return { synchronized: true };
  }

  if (systemARole === "viewer") {
    if (systemBRoles.includes("admin") || systemBRoles.includes("manager")) {
      return {
        synchronized: false,
        reason: "System A viewer membership cannot hold System B administrative role",
      };
    }
    return { synchronized: true };
  }

  if (systemARole === "member") {
    if (systemBRoles.includes("admin")) {
      return {
        synchronized: false,
        reason: "System A standard member cannot hold System B platform admin role",
      };
    }
    return { synchronized: true };
  }

  return { synchronized: systemBRoles.length > 0 };
}

// =============================================================
// RESOLVED CONTEXT SHAPE
// =============================================================
//
// The context type and its zero-grant fallback live HERE, in the pure layer,
// so a display surface can hold and fail-close a FORT context without pulling
// the server resolver (createServerFn + Supabase auth middleware) into its
// static import graph. The resolver in fort-workspace.functions.ts re-exports
// both, so nothing that already imports them has to change.

export interface FortMembershipContext {
  workspaceId: string;
  /** System A role name for this membership (platform_admin / member / viewer). */
  roleName: string | null;
  status: "active" | "invited" | "suspended";
  isPrimary: boolean;
}

/** The experience surface selected for an account. NEVER an authorization input. */
export interface FortIdentity {
  id: string;
  route: string;
  label: string;
}

export interface FortWorkspaceContext {
  status: FortWorkspaceStatus;
  reason: FortStatusReason;
  /** Internal database identity. Authoritative for every scoped query. */
  workspaceId: string | null;
  /** Human-facing identity. Display only — never an authorization claim. */
  workspacePublicId: string | null;
  workspaceName: string | null;
  workspaceIsPrivate: boolean;
  /** Human-facing FORT user identity (FORT-USER-XXX0990). Contextual only. */
  fortUserId: string | null;
  membership: FortMembershipContext | null;
  /** Verified app_role set from public.user_roles. The authority. */
  role: { appRoles: string[] };
  /** Registered capability ids these roles may execute. Visibility only. */
  capabilities: string[];
  /** Per-route experience state across every Fort-referenced module. */
  modules: FortModuleGrant[];
  /**
   * The Fort experience surface resolved for this account, from the SERVER's
   * stored persona. Selects WHICH experience is shown and in what order the
   * landing route is chosen — it grants nothing, and `modules`/`capabilities`
   * are computed without it.
   */
  fort: FortIdentity | null;
  /** Per-route state for every /app console route. Same authority as `modules`. */
  consoleModules: FortModuleGrant[];
  /**
   * The single route "Enter Workspace" opens. null means the server granted
   * NOTHING — the caller must report that state, never invent a landing.
   */
  landingRoute: string | null;
  /**
   * Verified data scope. `workspaceIds` is every ACTIVE membership — the only
   * set a workspace switch may ever select from.
   */
  scope: { workspaceId: string | null; workspaceIds: string[] };
}

/**
 * A context that grants NOTHING.
 *
 * Used for every unresolved outcome, and exported so a route guard can fail
 * closed with the same shape when the resolver itself is unreachable. Pure —
 * no I/O — so it is safe on either side of the boundary.
 */
export function fortFallbackContext(
  status: FortWorkspaceStatus,
  reason: FortStatusReason,
): FortWorkspaceContext {
  return {
    status,
    reason,
    workspaceId: null,
    workspacePublicId: null,
    workspaceName: null,
    workspaceIsPrivate: false,
    fortUserId: null,
    membership: null,
    role: { appRoles: [] },
    capabilities: [],
    modules: [],
    fort: null,
    consoleModules: [],
    landingRoute: null,
    scope: { workspaceId: null, workspaceIds: [] },
  };
}

// =============================================================
// CONSOLE (/app) MODULE RESOLUTION
// =============================================================
//
// The /app console is the application workspace FORT opens into. Its access
// decisions must come from the same verified roles as the Fort surface, so the
// two can never disagree. Nothing below introduces a module list, a role list
// or a permission vocabulary: it reads the two that already exist.

/**
 * Every route the console can surface. Derived from ROUTE_ROLES — the EXISTING
 * advisory route↔role table — so no second console module list exists to drift.
 */
export const CONSOLE_ROUTES: readonly string[] = Object.keys(ROUTE_ROLES).sort();

/**
 * Access state for a console route, from the two EXISTING vocabularies:
 *
 *   1. MODULE_CATALOG (via moduleAccessState) — the Fort module authority.
 *   2. ROUTE_ROLES — the console route table, for routes the Fort catalog does
 *      not describe (/app/partners, /app/graph, /app/collections, …).
 *
 * A route in neither is UNAVAILABLE and is never advertised. Neither table is
 * widened here and no third vocabulary is introduced.
 */
export function consoleModuleState(route: string, roles: readonly string[]): ModuleAccessState {
  if (MODULE_CATALOG[route]) return moduleAccessState(route, roles);
  const allowed = ROUTE_ROLES[route];
  if (!allowed) return "UNAVAILABLE";
  return allowed.some((r) => roles.includes(r)) ? "ACTIVE" : "LOCKED";
}

/** Project every console route onto verified roles. Same shape as Fort grants. */
export function resolveConsoleModules(
  roles: readonly string[],
  featureFlags?: Record<string, boolean> | null,
): FortModuleGrant[] {
  return CONSOLE_ROUTES.map((route) => {
    const capabilityId = MODULE_CAPABILITY[route] ?? null;
    const access = getModuleAccess({ roles, featureFlags }, route);
    return {
      route,
      state: access.state,
      accessMode: access.accessMode,
      capabilityId,
      capabilityExecutable: capabilityId ? canExecuteCapability(capabilityId, roles) : false,
    };
  });
}

/**
 * The route "Enter Workspace" opens: the FIRST module the server actually
 * granted. `preferredOrder` (the user's Fort module order) is consulted first
 * so the user lands inside their own experience rather than a generic default.
 *
 * Returns null when nothing is granted. A null landing is a real answer — the
 * caller must report the workspace state, never fall back to a hardcoded route.
 */
export function resolveLandingRoute(
  grants: readonly FortModuleGrant[],
  preferredOrder: readonly string[] = [],
): string | null {
  const active = new Set(
    grants.filter((g) => g.state === "ACTIVE").map((g) => g.route),
  );
  for (const route of preferredOrder) {
    if (active.has(route)) return route;
  }
  if (active.has("/app/crm")) {
    return "/app/crm";
  }
  for (const g of grants) {
    if (g.state === "ACTIVE") return g.route;
  }
  return null;
}

/** ACTIVE console routes as a fast lookup for display filtering. */
export function activeConsoleRouteSet(grants: readonly FortModuleGrant[]): Set<string> {
  return new Set(grants.filter((g) => g.state === "ACTIVE").map((g) => g.route));
}

