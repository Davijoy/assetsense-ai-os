/**
 * SENTINEL FORT — workspace provisioning + resolver architecture assertions.
 *
 * Covers the approved verification matrix A–W. Two kinds of assertion:
 *
 *   PURE      real imports of the pure derivation layer (fort-experience,
 *             fort-modules, capability metadata, forts) exercised against every
 *             role and every state.
 *   STATIC    source-text assertions for the server resolver, the SQL
 *             migrations and the React surfaces — the same convention as
 *             tests/supreme-authorization.test.ts, because those modules are
 *             server-only / JSX and cannot be imported into the node test env.
 *
 * These tests are ARCHITECTURAL. They prove the resolver cannot be talked into
 * granting anything, that provisioning cannot leak Sentinel Fort HQ, and that
 * no second authorization system was introduced. They do not replace RLS,
 * route gates or Supreme authorization — each of which has its own suite.
 *
 * NOTE: no naive RLS test is written against `properties`. Public marketplace
 * read is INTENTIONAL there and must not be "fixed" by a test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MODULE_CAPABILITY,
  NEVER_AUTO_PROVISIONED_ROLES,
  SELF_SIGNUP_DEFAULT_APP_ROLE,
  EXPERIENCE_PROFILE_APP_ROLE,
  activeFortRoutes,
  canExecuteCapability,
  defaultAppRoleForExperience,
  resolveFortCapabilities,
  resolveFortModules,
  resolveFortStatus,
  type ExperienceProfileId,
} from "../src/lib/fort-experience";
import { MODULE_CATALOG, moduleAccessState } from "../src/lib/fort-modules";
import { AGENT_CAPABILITY_META } from "../src/lib/supreme-agent-capability-meta";
import { ROUTE_ROLES } from "../src/lib/route-roles";
import { FORTS } from "../src/sentinel/forts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(resolve(REPO_ROOT, p), "utf8");

/**
 * Strip comments before a "must NOT contain X" assertion.
 *
 * Every file here documents its own prohibitions in prose ("never reads
 * localStorage", "does NOT create organizations"). Matching raw source would
 * make those doc comments fail the very rule they describe, so absence checks
 * run against CODE only.
 */
function stripTsComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
function stripSqlComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

const RESOLVER_SRC = read("src/lib/fort-workspace.functions.ts");
const PROVISION_SQL = read("supabase/migrations/20260824120001_fort_workspace_provisioning.sql");
const PUBLIC_ID_SQL = read("supabase/migrations/20260824120000_workspace_public_id.sql");
const OWNER_REPAIR_SQL = read(
  "supabase/migrations/20260824120002_repair_platform_admin_app_role.sql",
);
const FORT_ROUTE_SRC = read("src/routes/fort.tsx");
const FORT_SHELL_SRC = read("src/components/sentinel/FortShell.tsx");
const EXPERIENCE_SRC = read("src/lib/fort-experience.ts");

/** Code-only views, for absence assertions. */
const RESOLVER_CODE = stripTsComments(RESOLVER_SRC);
const EXPERIENCE_CODE = stripTsComments(EXPERIENCE_SRC);
const FORT_ROUTE_CODE = stripTsComments(FORT_ROUTE_SRC);
const FORT_SHELL_CODE = stripTsComments(FORT_SHELL_SRC);
const PROVISION_CODE = stripSqlComments(PROVISION_SQL);
const PUBLIC_ID_CODE = stripSqlComments(PUBLIC_ID_SQL);
const OWNER_REPAIR_CODE = stripSqlComments(OWNER_REPAIR_SQL);

const HQ = "00000000-0000-0000-0000-00000000d3f7";

/** Every Fort route the resolver reports on (mirrors FORT_ROUTES). */
const FORT_ROUTES = Array.from(
  new Set(Object.values(FORTS).flatMap((f) => f.modules)),
).sort();

// =====================================================================
// A / B — existing member, with and without a global app_role
// =====================================================================
describe("A/B — existing workspace member", () => {
  it("A: member WITH a valid app_role resolves ACTIVE and gets modules", () => {
    const { status, reason } = resolveFortStatus({
      workspaceId: "11111111-1111-1111-1111-111111111111",
      appRoles: ["manager"],
    });
    expect(status).toBe("ACTIVE");
    expect(reason).toBe("RESOLVED");
    expect(activeFortRoutes(resolveFortModules(FORT_ROUTES, ["manager"])).length).toBeGreaterThan(0);
  });

  it("B: member with NO app_role resolves PROVISIONING, never ACTIVE", () => {
    const { status, reason } = resolveFortStatus({
      workspaceId: "11111111-1111-1111-1111-111111111111",
      appRoles: [],
    });
    expect(status).toBe("PROVISIONING");
    expect(reason).toBe("NO_APP_ROLE");
  });

  it("B: a role-less account is NOT auto-elevated to populate the surface", () => {
    // Zero roles → zero ACTIVE modules and zero capabilities. No fallback role.
    expect(activeFortRoutes(resolveFortModules(FORT_ROUTES, []))).toEqual([]);
    expect(resolveFortCapabilities([])).toEqual([]);
  });

  it("B: the resolver emits no modules or capabilities unless status is ACTIVE", () => {
    expect(RESOLVER_SRC).toMatch(/const grantsVisible = status === "ACTIVE"/);
    expect(RESOLVER_SRC).toMatch(/capabilities: grantsVisible \?/);
    expect(RESOLVER_SRC).toMatch(/modules: grantsVisible \?/);
  });
});

// =====================================================================
// C — new self-signup provisioning
// =====================================================================
describe("C — new self-signup provisioning", () => {
  it("provisions a PRIVATE workspace with no parent (no inherited data)", () => {
    expect(PROVISION_SQL).toMatch(/'private',\s*true/);
    expect(PROVISION_SQL).toMatch(/INSERT INTO public\.workspaces[\s\S]*?NULL,\s*\n\s*jsonb_build_object/);
  });

  it("NEVER joins the new user to Sentinel Fort HQ", () => {
    // HQ appears only as the guarded constant, never as an insert target.
    expect(PROVISION_SQL).toMatch(new RegExp(`c_hq_workspace\\s+CONSTANT UUID := '${HQ}'`));
    expect(PROVISION_SQL).toMatch(
      /IF v_workspace = c_hq_workspace THEN\s*\n\s*RAISE EXCEPTION/,
    );
    // No membership insert can name the HQ id.
    const memberInsert = PROVISION_SQL.slice(
      PROVISION_SQL.indexOf("INSERT INTO public.workspace_members"),
    );
    expect(memberInsert).not.toContain(HQ);
  });

  it("assigns the SAFE DEFAULT role only — viewer", () => {
    expect(SELF_SIGNUP_DEFAULT_APP_ROLE).toBe("viewer");
    expect(PROVISION_SQL).toMatch(/'viewer'::public\.app_role/);
    expect(PROVISION_SQL).toMatch(/r\.name = 'viewer'/);
  });

  it("never assigns a privileged role during provisioning", () => {
    for (const role of NEVER_AUTO_PROVISIONED_ROLES) {
      expect(PROVISION_SQL).not.toContain(`'${role}'::public.app_role`);
      expect(PROVISION_SQL).not.toContain(`r.name = '${role}'`);
    }
    expect(NEVER_AUTO_PROVISIONED_ROLES).toEqual(["admin", "manager", "builder", "developer"]);
  });

  it("takes NO user id argument, so nobody can provision or elevate another user", () => {
    expect(PROVISION_SQL).toMatch(/CREATE OR REPLACE FUNCTION public\.provision_fort_workspace\(\)/);
    expect(PROVISION_SQL).toMatch(/v_user\s+UUID := auth\.uid\(\)/);
    // No parameter of any kind, and the subject is never read from an argument.
    expect(PROVISION_CODE).not.toMatch(/_user_id/);
    expect(PROVISION_CODE).not.toMatch(/provision_fort_workspace\([^)]/);
  });

  it("creates ZERO domain rows, so no HQ column DEFAULT can ever fire", () => {
    // The five tables whose workspace_id DEFAULTs to Sentinel Fort HQ.
    for (const t of ["leads", "calls", "properties", "kie_documents", "branding_settings"]) {
      expect(PROVISION_SQL).not.toMatch(new RegExp(`INSERT INTO public\\.${t}\\b`));
    }
  });

  it("is idempotent — an existing active membership is returned, not duplicated", () => {
    expect(PROVISION_SQL).toMatch(/IF v_existing IS NOT NULL THEN\s*\n\s*RETURN v_existing;/);
  });

  it("is not executable by anon", () => {
    expect(PROVISION_SQL).toMatch(/REVOKE EXECUTE ON FUNCTION public\.provision_fort_workspace\(\) FROM PUBLIC, anon/);
  });
});

// =====================================================================
// D / E — invited user, and user with no membership
// =====================================================================
describe("D/E — invitation and missing membership", () => {
  it("D: an invited/suspended membership is NOT auto-provisioned", () => {
    expect(PROVISION_SQL).toMatch(/status IN \('invited', 'suspended'\)/);
    expect(PROVISION_SQL).toMatch(/IF v_blocked THEN\s*\n\s*RETURN NULL;/);
    // The resolver refuses to call provisioning at all in that case.
    expect(RESOLVER_SRC).toMatch(/if \(!workspaceId && !membershipPending\)/);
  });

  it("D: a pending membership renders AWAITING / MEMBERSHIP_PENDING", () => {
    const { status, reason } = resolveFortStatus({
      workspaceId: null,
      appRoles: [],
      membershipPending: true,
    });
    expect(status).toBe("AWAITING");
    expect(reason).toBe("MEMBERSHIP_PENDING");
  });

  it("E: no workspace resolves AWAITING and grants nothing", () => {
    const { status, reason } = resolveFortStatus({ workspaceId: null, appRoles: ["admin"] });
    expect(status).toBe("AWAITING");
    expect(reason).toBe("PROVISIONING_DECLINED");
    // Even an admin gets nothing without a verified workspace.
    expect(RESOLVER_SRC).toMatch(/if \(!workspaceId\) \{[\s\S]*?return fortFallbackContext\(status, reason\)/);
  });

  it("E: the missing-workspace path no longer bounces the user to /app/crm", () => {
    expect(FORT_ROUTE_CODE).not.toMatch(/throw redirect\(\{ to: "\/app\/crm" \}\)/);
  });

  it("E: the shell renders the real state instead of a dead end", () => {
    expect(FORT_SHELL_CODE).not.toContain("no modules enabled for this experience");
    expect(FORT_SHELL_SRC).toContain("FortWorkspaceStateSurface");
  });
});

// =====================================================================
// F–K — every existing app_role
// =====================================================================
describe("F–K — module resolution for every app_role", () => {
  const ROLES = ["viewer", "agent", "manager", "builder", "developer", "admin"] as const;

  it.each(ROLES)("%s: every reported grant matches MODULE_CATALOG exactly", (role) => {
    for (const g of resolveFortModules(FORT_ROUTES, [role])) {
      expect(g.state).toBe(moduleAccessState(g.route, [role]));
      const card = MODULE_CATALOG[g.route];
      if (!card) {
        expect(g.state).toBe("UNAVAILABLE");
      } else {
        expect(g.state).toBe(card.roles.includes(role) ? "ACTIVE" : "LOCKED");
      }
    }
  });

  it.each(ROLES)("%s: no grant is invented outside the catalog", (role) => {
    for (const route of activeFortRoutes(resolveFortModules(FORT_ROUTES, [role]))) {
      expect(MODULE_CATALOG[route]).toBeTruthy();
    }
  });

  it("admin reaches the widest surface; viewer a strict subset of it", () => {
    const admin = new Set(activeFortRoutes(resolveFortModules(FORT_ROUTES, ["admin"])));
    const viewer = activeFortRoutes(resolveFortModules(FORT_ROUTES, ["viewer"]));
    expect(viewer.length).toBeLessThan(admin.size);
    for (const r of viewer) expect(admin.has(r)).toBe(true);
  });

  it("an unknown role grants nothing (fails closed)", () => {
    expect(activeFortRoutes(resolveFortModules(FORT_ROUTES, ["superuser"]))).toEqual([]);
    expect(resolveFortCapabilities(["owner"])).toEqual([]);
  });

  it("the six app_role values are unchanged — app_role was NOT extended", () => {
    const catalogRoles = new Set(
      Object.values(MODULE_CATALOG).flatMap((c) => c.roles as readonly string[]),
    );
    expect([...catalogRoles].sort()).toEqual([
      "admin",
      "agent",
      "builder",
      "developer",
      "manager",
      "viewer",
    ]);
  });
});

// =====================================================================
// L / M / N — workspace identity cannot be used as authority
// =====================================================================
describe("L/M/N — workspace identity is not an authorization claim", () => {
  it("L: the FORT public id is never an input to the resolver", () => {
    // The validator accepts a UUID workspaceId only — never a FORT-XXX0990.
    expect(RESOLVER_SRC).toMatch(/workspaceId: z\.string\(\)\.uuid\(\)\.optional\(\)/);
    expect(RESOLVER_CODE).not.toMatch(/public_id/);
    // publicId is only ever WRITTEN to the response.
    expect(RESOLVER_SRC).toMatch(/workspacePublicId,/);
  });

  it("L: a forged public id cannot select a workspace — no lookup exists", () => {
    const service = read("src/lib/services/workspace.service.ts");
    expect(service).not.toMatch(/\.eq\(\s*["']public_id["']/);
    expect(service).not.toMatch(/from\(["']workspaces["']\)[\s\S]{0,200}public_id["']\s*,/);
  });

  it("L: public_id is server-generated, unique, format-checked and immutable", () => {
    expect(PUBLIC_ID_SQL).toMatch(/workspaces_public_id_key UNIQUE \(public_id\)/);
    expect(PUBLIC_ID_SQL).toMatch(/public_id ~ '\^FORT-\[A-Z\]\{3\}\[0-9\]\{4,\}/);
    expect(PUBLIC_ID_SQL).toMatch(/BEFORE INSERT/);
    expect(PUBLIC_ID_SQL).toMatch(/is immutable/);
    expect(PUBLIC_ID_SQL).toMatch(/SET NOT NULL/);
    // Not client-generatable.
    expect(PUBLIC_ID_SQL).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.generate_workspace_public_id\(UUID\) FROM PUBLIC, anon, authenticated/,
    );
  });

  it("M/N: a caller-supplied workspace id is VERIFIED against membership, then 403", () => {
    expect(RESOLVER_SRC).toMatch(
      /if \(!active\.some\(\(m\) => m\.workspaceId === requested\)\) \{[\s\S]*?status: 403/,
    );
    // The verified set is ACTIVE memberships only.
    expect(RESOLVER_SRC).toMatch(/active = memberships\.filter\(\(m\) => m\.status === "active"\)/);
  });

  it("N: the resolver never derives identity from the request payload", () => {
    // userId always comes from the authenticated middleware context.
    expect(RESOLVER_SRC).toMatch(/const \{ supabase, userId \} = context/);
    expect(RESOLVER_SRC).toMatch(/\.middleware\(\[requireSupabaseAuth\]\)/);
    expect(RESOLVER_CODE).not.toMatch(/data\?\.userId|data\.userId|data\?\.roles|data\.roles/);
  });
});

// =====================================================================
// O / P / Q — client state, URLs and direct navigation grant nothing
// =====================================================================
describe("O/P/Q — client state cannot grant access", () => {
  it("O: the derivation layer reads no client state of any kind", () => {
    for (const forbidden of [
      "localStorage",
      "sessionStorage",
      "document",
      "window",
      "fetch(",
      "supabase",
    ]) {
      expect(EXPERIENCE_CODE, `fort-experience must not touch ${forbidden}`).not.toContain(
        forbidden,
      );
    }
  });

  it("O: the resolver reads no client state either", () => {
    for (const forbidden of ["localStorage", "sessionStorage", "loadExperienceDraft"]) {
      expect(RESOLVER_CODE).not.toContain(forbidden);
    }
  });

  it("O: a tampered experience draft cannot change module state", () => {
    // resolveFortModules' only inputs are the Fort route list and roles.
    expect(resolveFortModules(["/app/command"], ["viewer"])[0].state).toBe("LOCKED");
    expect(resolveFortModules(["/app/command"], ["admin"])[0].state).toBe("ACTIVE");
    // The persona→role map is provisioning policy and is NEVER consulted by
    // module or capability resolution.
    const resolutionCode = EXPERIENCE_CODE.slice(
      EXPERIENCE_CODE.indexOf("export function canExecuteCapability"),
      EXPERIENCE_CODE.indexOf("export type ExperienceProfileId"),
    );
    expect(resolutionCode.length).toBeGreaterThan(200);
    expect(resolutionCode).not.toContain("EXPERIENCE_PROFILE_APP_ROLE");
  });

  it("P/Q: route gates remain the authority — ROUTE_ROLES is untouched and reused", () => {
    // The shell reuses the existing matrix; it does not define its own.
    expect(FORT_SHELL_SRC).toMatch(/import \{ ROUTE_ROLES \} from "@\/lib\/route-roles"/);
    expect(FORT_SHELL_CODE).not.toMatch(/const ROUTE_ROLES|ROUTE_ROLES =/);
    // Protected routes still require privileged roles.
    expect(ROUTE_ROLES["/app/command"]).toEqual(["admin", "manager"]);
    expect(ROUTE_ROLES["/app/users"]).toEqual(["admin", "manager"]);
    expect(ROUTE_ROLES["/app/governance"]).toEqual(["admin", "manager"]);
  });

  it("Q: an unknown route is UNAVAILABLE, never optimistically shown", () => {
    expect(resolveFortModules(["/app/definitely-not-real"], ["admin"])[0].state).toBe("UNAVAILABLE");
    // And the shell treats a route the server did not report as UNAVAILABLE.
    expect(FORT_SHELL_SRC).toMatch(/state: "UNAVAILABLE" as const/);
  });

  it("the sidebar is documented as experience, not authorization", () => {
    expect(FORT_SHELL_SRC).toMatch(/THE SIDEBAR IS NOT THE AUTHORIZATION LAYER/);
  });
});

// =====================================================================
// R / S — Supreme execution authorization
// =====================================================================
describe("R/S — Supreme authorization is unchanged", () => {
  it("R: viewer / agent / builder / developer CANNOT execute supreme.orchestrate", () => {
    for (const role of ["viewer", "agent", "builder", "developer"]) {
      expect(canExecuteCapability("supreme.orchestrate", [role])).toBe(false);
    }
  });

  it("S: only admin and manager CAN execute supreme.orchestrate", () => {
    expect(canExecuteCapability("supreme.orchestrate", ["admin"])).toBe(true);
    expect(canExecuteCapability("supreme.orchestrate", ["manager"])).toBe(true);
    expect(AGENT_CAPABILITY_META["supreme.orchestrate"].requiredRoles.sort()).toEqual([
      "admin",
      "manager",
    ]);
  });

  it("ORCHESTRATION_EXEC_ROLES is still exactly [admin, manager] — not widened", () => {
    const authz = read("src/business-intelligence/supreme/authorization.ts");
    expect(authz).toMatch(/ORCHESTRATION_EXEC_ROLES[^=]*=\s*\["admin",\s*"manager"\]/);
  });

  it("visible-but-not-executable is represented, not silently promised", () => {
    // /app/supreme-intelligence is visible to viewer; orchestration is not.
    expect(ROUTE_ROLES["/app/supreme-intelligence"]).toContain("viewer");
    const grant = resolveFortModules(["/app/supreme-intelligence"], ["viewer"])[0];
    expect(grant.state).toBe("ACTIVE");
    expect(grant.capabilityId).toBe("supreme.orchestrate");
    expect(grant.capabilityExecutable).toBe(false);
    // …and the UI states it.
    expect(FORT_SHELL_SRC).toMatch(/siExecutable === false/);
  });

  it("the same holds for market and inventory intelligence", () => {
    const market = resolveFortModules(["/app/market"], ["viewer"])[0];
    expect(market.state).toBe("ACTIVE");
    expect(market.capabilityExecutable).toBe(false);
    const inv = resolveFortModules(["/app/inventory"], ["builder"])[0];
    expect(inv.state).toBe("ACTIVE");
    expect(inv.capabilityExecutable).toBe(false);
  });

  it("capability visibility never exceeds the metadata's requiredRoles", () => {
    for (const role of ["viewer", "agent", "manager", "builder", "developer", "admin"]) {
      for (const id of resolveFortCapabilities([role])) {
        expect(AGENT_CAPABILITY_META[id].requiredRoles).toContain(role);
      }
    }
  });

  it("an unregistered capability id fails closed", () => {
    expect(canExecuteCapability("market.export", ["admin"])).toBe(false);
    expect(canExecuteCapability("", ["admin"])).toBe(false);
  });
});

// =====================================================================
// NO FOURTH CAPABILITY VOCABULARY
// =====================================================================
describe("no new capability vocabulary was introduced", () => {
  it("MODULE_CAPABILITY only points at ALREADY REGISTERED capability ids", () => {
    for (const id of Object.values(MODULE_CAPABILITY)) {
      expect(AGENT_CAPABILITY_META[id]).toBeTruthy();
    }
  });

  it("the invented vocabulary from the brief does not exist anywhere", () => {
    const invented = [
      "market.read",
      "market.analyze",
      "market.export",
      "inventory.read",
      "customer.read",
    ];
    for (const id of invented) {
      expect(Object.keys(AGENT_CAPABILITY_META)).not.toContain(id);
      expect(Object.values(MODULE_CAPABILITY)).not.toContain(id);
      expect(EXPERIENCE_CODE).not.toContain(`"${id}"`);
    }
  });

  it("no new role table or role enum was created", () => {
    for (const sql of [PROVISION_SQL, PUBLIC_ID_SQL, OWNER_REPAIR_SQL]) {
      const code = stripSqlComments(sql);
      expect(code).not.toMatch(/CREATE TABLE[\s\S]{0,40}roles/i);
      expect(code).not.toMatch(/CREATE TYPE/i);
      expect(code).not.toMatch(/ALTER TYPE public\.app_role/i);
    }
  });
});

// =====================================================================
// T / U — workspace-specific resolution and multi-membership
// =====================================================================
describe("T/U — workspace scope", () => {
  it("T: each Fort projects only its own module list, in its own order", () => {
    for (const fort of Object.values(FORTS)) {
      const grants = resolveFortModules(fort.modules, ["admin"]);
      expect(grants.map((g) => g.route)).toEqual([...fort.modules]);
    }
  });

  it("T: the shell projects the server's decision onto the Fort's routes", () => {
    expect(FORT_SHELL_SRC).toMatch(/new Map\(workspace\.modules\.map\(\(g\) => \[g\.route, g\]\)\)/);
    expect(FORT_SHELL_SRC).toMatch(/fort\.modules\.map\(/);
  });

  it("U: scope reports every ACTIVE membership and the verified active workspace", () => {
    expect(RESOLVER_SRC).toMatch(/workspaceIds: active\.map\(\(m\) => m\.workspaceId\)/);
    expect(RESOLVER_SRC).toMatch(/scope: \{\s*\n?\s*workspaceId,/);
  });

  it("U: switching is verified against membership, so it cannot cross tenants", () => {
    // `workspaceId` is the ONLY caller-supplied field in the whole contract…
    const validator = RESOLVER_CODE.slice(
      RESOLVER_CODE.indexOf("const ResolveInput"),
      RESOLVER_CODE.indexOf("export function fortFallbackContext"),
    );
    expect(validator).toContain("workspaceId: z.string().uuid().optional()");
    expect(validator.match(/^\s*[a-zA-Z]+:\s*z\./gm)).toHaveLength(1);
    // …and it is checked against ACTIVE membership before it is ever used.
    expect(RESOLVER_CODE).toMatch(/workspaceId = requested;/);
    const beforeUse = RESOLVER_CODE.slice(
      RESOLVER_CODE.indexOf("if (requested)"),
      RESOLVER_CODE.indexOf("workspaceId = requested;"),
    );
    expect(beforeUse).toContain("status: 403");
  });

  it("U: memberships are read for the authenticated user only", () => {
    const service = read("src/lib/services/workspace.service.ts");
    expect(service).toMatch(/listMembershipRecords[\s\S]*?\.eq\("user_id", userId\)/);
  });
});

// =====================================================================
// OWNER REPAIR — a rule, not a hardcoded user
// =====================================================================
describe("owner repair is a data rule with no application special-case", () => {
  it("hardcodes no user id and creates no bypass", () => {
    expect(OWNER_REPAIR_CODE).not.toMatch(/auth\.users/);
    // Only workspace + role ids appear — never a user uuid.
    const uuids = OWNER_REPAIR_CODE.match(/'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/g) ?? [];
    expect(new Set(uuids)).toEqual(
      new Set([`'${HQ}'`, "'00000000-0000-0000-0000-0000000ad301'"]),
    );
  });

  it("resolves through the normal pipeline — user_roles, not a code branch", () => {
    expect(OWNER_REPAIR_SQL).toMatch(/INSERT INTO public\.user_roles/);
    expect(OWNER_REPAIR_SQL).toMatch(/ON CONFLICT \(user_id, role\) DO NOTHING/);
    // No application code carries a privileged user id or an owner bypass.
    for (const src of [RESOLVER_CODE, FORT_ROUTE_CODE, FORT_SHELL_CODE, EXPERIENCE_CODE]) {
      expect(src).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
      expect(src.toLowerCase()).not.toMatch(/owner_bypass|isowner|superadmin/);
    }
  });

  it("cannot elevate a future signup — it is a one-time backfill, not a trigger", () => {
    expect(OWNER_REPAIR_CODE).not.toMatch(/CREATE (OR REPLACE )?(TRIGGER|FUNCTION)/i);
    expect(OWNER_REPAIR_SQL).toMatch(/NOT EXISTS \(\s*\n?\s*SELECT 1 FROM public\.user_roles/);
  });
});

// =====================================================================
// PERSONA IS NOT AUTHORIZATION
// =====================================================================
describe("experience profile is NOT a security role", () => {
  it("every profile maps onto one of the six EXISTING app_role values", () => {
    const allowed = ["admin", "manager", "agent", "viewer", "builder", "developer"];
    for (const [profile, role] of Object.entries(EXPERIENCE_PROFILE_APP_ROLE)) {
      expect(allowed, `${profile} -> ${role}`).toContain(role);
    }
  });

  it("ranged mappings default to the LOWER privilege", () => {
    expect(defaultAppRoleForExperience("market_analyst")).toBe("viewer");
    expect(defaultAppRoleForExperience("channel_partner")).toBe("viewer");
    expect(defaultAppRoleForExperience("investor")).toBe("viewer");
  });

  it("the approved mappings are honoured", () => {
    const expected: Record<string, string> = {
      platform_administrator: "admin",
      sales_manager: "manager",
      sales_executive: "agent",
      builder: "builder",
      developer: "developer",
      analyst: "viewer",
    };
    for (const [profile, role] of Object.entries(expected)) {
      expect(defaultAppRoleForExperience(profile as ExperienceProfileId)).toBe(role);
    }
  });

  it("selecting a profile grants nothing — it is not read during resolution", () => {
    // Neither resolution function takes a profile, and the mapping is unused
    // by them: same modules regardless of any profile in play.
    const before = resolveFortModules(FORT_ROUTES, ["viewer"]);
    const after = resolveFortModules(FORT_ROUTES, ["viewer"]);
    expect(after).toEqual(before);
    expect(activeFortRoutes(resolveFortModules(FORT_ROUTES, ["viewer"]))).not.toContain(
      "/app/command",
    );
    // Documented in code, as required.
    expect(EXPERIENCE_SRC).toMatch(/an experience profile is NOT a security role/);
  });

  it("a profile id that is not an app_role value grants NOTHING", () => {
    // `builder`, `developer` and `viewer` are deliberately the same string in
    // both vocabularies (their mapping is the identity), so they are excluded.
    // Every OTHER profile id is a persona label with no authorization meaning:
    // passing one where a role belongs must resolve to zero modules.
    const APP_ROLES = ["admin", "manager", "agent", "viewer", "builder", "developer"];
    const personaOnly = Object.keys(EXPERIENCE_PROFILE_APP_ROLE).filter(
      (p) => !APP_ROLES.includes(p),
    );
    expect(personaOnly.length).toBeGreaterThan(8);
    for (const profile of personaOnly) {
      expect(
        activeFortRoutes(resolveFortModules(FORT_ROUTES, [profile])),
        `${profile} must grant nothing`,
      ).toEqual([]);
      expect(resolveFortCapabilities([profile])).toEqual([]);
    }
  });

  it("a high-authority-sounding profile grants nothing on its own", () => {
    // "platform_administrator" is a persona label, NOT the admin app_role.
    expect(activeFortRoutes(resolveFortModules(FORT_ROUTES, ["platform_administrator"]))).toEqual(
      [],
    );
    expect(canExecuteCapability("supreme.orchestrate", ["platform_administrator"])).toBe(false);
    // Its mapping is advisory intent only.
    expect(defaultAppRoleForExperience("platform_administrator")).toBe("admin");
  });
});

// =====================================================================
// MIGRATION SAFETY — additive only
// =====================================================================
describe("migrations are additive and non-destructive", () => {
  // Comment-stripped: each migration documents its own prohibitions in prose.
  const ALL = [PUBLIC_ID_CODE, PROVISION_CODE, OWNER_REPAIR_CODE];

  it("contain no destructive DDL", () => {
    for (const sql of ALL) {
      expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|POLICY|TYPE|CONSTRAINT|SCHEMA)\b/i);
      expect(sql).not.toMatch(/\bTRUNCATE\b/i);
      expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    }
  });

  it("do not rewrite RLS", () => {
    for (const sql of ALL) {
      expect(sql).not.toMatch(/CREATE POLICY|ALTER POLICY|DROP POLICY/i);
      expect(sql).not.toMatch(/ENABLE ROW LEVEL SECURITY|DISABLE ROW LEVEL SECURITY/i);
    }
  });

  it("do not create organizations", () => {
    for (const sql of ALL) {
      expect(sql).not.toMatch(/organization/i);
    }
  });

  it("do not move or delete existing domain data", () => {
    for (const sql of ALL) {
      expect(sql).not.toMatch(/UPDATE public\.(leads|calls|properties|deals|contacts|activities)/i);
    }
  });

  it("do not drop System A tables", () => {
    for (const sql of ALL) {
      for (const t of ["roles", "permissions", "role_permissions", "workspace_members"]) {
        expect(sql).not.toMatch(new RegExp(`DROP TABLE[\\s\\S]{0,30}${t}`, "i"));
      }
    }
  });

  it("keep is_workspace_member() as the data boundary — unredefined", () => {
    for (const sql of ALL) {
      expect(sql).not.toMatch(/FUNCTION public\.is_workspace_member/);
      expect(sql).not.toMatch(/FUNCTION public\.current_workspace_id/);
    }
  });

  it("the public_id migration is idempotent and re-runnable", () => {
    expect(PUBLIC_ID_SQL).toMatch(/ADD COLUMN IF NOT EXISTS public_id/);
    expect(PUBLIC_ID_SQL).toMatch(/CREATE SEQUENCE IF NOT EXISTS/);
    expect(PUBLIC_ID_SQL).toMatch(/DROP TRIGGER IF EXISTS|CREATE OR REPLACE FUNCTION/);
  });
});

// =====================================================================
// W — the resolver is the single wiring point
// =====================================================================
describe("W — the FORT route no longer hand-rolls workspace + roles", () => {
  it("delegates entirely to resolveFortWorkspace()", () => {
    expect(FORT_ROUTE_SRC).toMatch(/await resolveFortWorkspace\(\{ data: \{\} \}\)/);
    // No local workspace or role queries remain in the route.
    expect(FORT_ROUTE_CODE).not.toMatch(/getCurrentWorkspaceId/);
    expect(FORT_ROUTE_CODE).not.toMatch(/from\("user_roles"\)/);
  });

  it("keeps the unauthenticated fail-safe redirect", () => {
    expect(FORT_ROUTE_SRC).toMatch(/redirect\(\{ to: "\/auth", search: \{ next \} \}\)/);
  });

  it("fails closed when the resolver itself is unreachable", () => {
    expect(FORT_ROUTE_SRC).toMatch(/fortFallbackContext\("ERROR", "RESOLUTION_FAILED"\)/);
  });

  it("does not duplicate MODULE_CATALOG, ROUTE_ROLES or FORTS", () => {
    for (const src of [RESOLVER_CODE, EXPERIENCE_CODE, FORT_SHELL_CODE]) {
      expect(src).not.toMatch(/const MODULE_CATALOG|const FORTS\s*=|const ROUTE_ROLES\s*=/);
    }
    // …it imports them.
    expect(EXPERIENCE_SRC).toMatch(/from "@\/lib\/fort-modules"/);
    expect(RESOLVER_SRC).toMatch(/from "@\/sentinel\/forts"/);
  });

  it("every Fort route it reports on is a real catalog route or explicitly unknown", () => {
    for (const route of FORT_ROUTES) {
      const state = moduleAccessState(route, ["admin"]);
      expect(["ACTIVE", "LOCKED", "UNAVAILABLE"]).toContain(state);
    }
    // Sanity: the set is non-trivial.
    expect(FORT_ROUTES.length).toBeGreaterThan(5);
  });
});
