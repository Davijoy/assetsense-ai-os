/**
 * SENTINEL FORT — Admin Role Assignment & System A/B Synchronization Regression Suite
 *
 * Verifies the complete role change lifecycle:
 *   1. Platform Admin selects Sales Executive (agent)
 *   2. System A (workspace_members.role_id -> 'member') & System B (user_roles -> 'agent') synchronization
 *   3. checkRoleSynchronization() validation
 *   4. resolveFortStatus() -> ACTIVE
 *   5. Persona resolution -> SALES_EXECUTIVE & Welcome Fort -> BROKER (/fort/broker)
 *   6. /app/crm and /app/leads capability & route grant verification
 *   7. Privilege isolation (agent CANNOT access admin-only Supreme orchestration or /app/users)
 *   8. Zero administrative privilege leakage to external users
 */
import { describe, it, expect } from "vitest";
import {
  checkRoleSynchronization,
  resolveFortStatus,
  resolveFortModules,
  resolveConsoleModules,
  resolveLandingRoute,
  activeConsoleRouteSet,
  canExecuteCapability,
  formatFortUserId,
  formatFortWorkspacePublicId,
} from "../src/lib/fort-experience";
import { FORTS, personaToFort, resolveWelcomeFort } from "../src/sentinel/forts";
import { ROUTE_ROLES, isRouteAuthorized } from "../src/lib/route-roles";
import { AGENT_CAPABILITY_META } from "../src/lib/supreme-agent-capability-meta";

describe("Admin Role Assignment & System A/B Synchronization", () => {
  const TEST_USER_ID = "e2b1c4d5-a6f7-4b8c-9d0e-1f2a3b4c5d6e";
  const TEST_WS_ID = "00000000-0000-0000-0000-00000000d3f7";

  describe("1. Role Promotion: Viewer -> Sales Executive (agent)", () => {
    it("synchronizes System A 'member' with System B 'agent'", () => {
      const sync = checkRoleSynchronization("member", ["agent"]);
      expect(sync.synchronized).toBe(true);
    });

    it("resolves ACTIVE workspace status after promotion to Sales Executive", () => {
      const status = resolveFortStatus({
        workspaceId: TEST_WS_ID,
        appRoles: ["agent"],
        membershipPending: false,
        roleMismatch: false,
      });
      expect(status.status).toBe("ACTIVE");
      expect(status.reason).toBe("RESOLVED");
    });

    it("maps persona to SALES_EXECUTIVE and Fort to BROKER (/fort/broker)", () => {
      const welcome = resolveWelcomeFort({
        profilePersona: "SALES_EXECUTIVE",
      });
      expect(welcome.persona).toBe("SALES_EXECUTIVE");
      expect(welcome.fortId).toBe("BROKER");
      expect(welcome.route).toBe("/fort/broker");
    });

    it("grants ACTIVE access to /app/crm, /app/leads, /app/marketplace, /app/dealrooms, and /app/voice (locks /app/marketing)", () => {
      const grants = resolveConsoleModules(["agent"]);
      const granted = activeConsoleRouteSet(grants);

      expect(granted.has("/app/crm")).toBe(true);
      expect(granted.has("/app/leads")).toBe(true);
      expect(granted.has("/app/marketplace")).toBe(true);
      expect(granted.has("/app/dealrooms")).toBe(true);
      expect(granted.has("/app/voice")).toBe(true);
      expect(granted.has("/app/marketing")).toBe(false);
    });

    it("resolves /app/crm as primary landing route for Sales Executive", () => {
      const grants = resolveConsoleModules(["agent"]);
      const landing = resolveLandingRoute(grants, FORTS.BROKER.modules);
      expect(landing).toBe("/app/crm");
    });

    it("authorizes crm.getCRMKPIs capability for Sales Executive (agent)", () => {
      expect(canExecuteCapability("crm.getCRMKPIs", ["agent"])).toBe(true);
    });
  });

  describe("2. Security Boundaries & Privilege Isolation for Sales Executive", () => {
    it("PROHIBITS Sales Executive from executing Supreme orchestration", () => {
      expect(canExecuteCapability("supreme.orchestrate", ["agent"])).toBe(false);
    });

    it("LOCKS administrative governance routes for Sales Executive", () => {
      const grants = resolveConsoleModules(["agent"]);
      const usersGrant = grants.find((g) => g.route === "/app/users");
      const govGrant = grants.find((g) => g.route === "/app/governance");
      const brandingGrant = grants.find((g) => g.route === "/app/settings/branding");

      expect(usersGrant?.state).toBe("LOCKED");
      expect(govGrant?.state).toBe("LOCKED");
      expect(brandingGrant?.state).toBe("LOCKED");

      expect(isRouteAuthorized(["agent"], "/app/users")).toBe(false);
      expect(isRouteAuthorized(["agent"], "/app/governance")).toBe(false);
      expect(isRouteAuthorized(["agent"], "/app/settings/branding")).toBe(false);
    });
  });

  describe("3. System A and System B Synchronization Invariants", () => {
    it("ensures viewer role requires System A 'viewer'", () => {
      expect(checkRoleSynchronization("viewer", ["viewer"]).synchronized).toBe(true);
      expect(checkRoleSynchronization("viewer", ["admin"]).synchronized).toBe(false);
      expect(checkRoleSynchronization("viewer", ["manager"]).synchronized).toBe(false);
    });

    it("ensures admin role requires System A 'platform_admin'", () => {
      expect(checkRoleSynchronization("platform_admin", ["admin"]).synchronized).toBe(true);
      expect(checkRoleSynchronization("platform_admin", ["agent"]).synchronized).toBe(false);
      expect(checkRoleSynchronization("platform_admin", ["viewer"]).synchronized).toBe(false);
    });

    it("fails closed when System A role is missing or null", () => {
      expect(checkRoleSynchronization(null, ["agent"]).synchronized).toBe(false);
      expect(checkRoleSynchronization(null, ["admin"]).synchronized).toBe(false);
    });
  });

  describe("4. Workspace Public ID & Context Formatting", () => {
    it("formats HQ workspace public ID as SF-HQ-001 for internal headquarters", () => {
      expect(formatFortWorkspacePublicId("00000000-0000-0000-0000-00000000d3f7")).toBe("SF-HQ-001");
    });

    it("formats customer workspace public ID as SF-WS-XXX for non-HQ workspaces", () => {
      expect(formatFortWorkspacePublicId("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")).toMatch(/^SF-WS-\d{3}$/);
    });

    it("formats WORKSPACE PENDING when workspace ID is unassigned", () => {
      expect(formatFortWorkspacePublicId(null)).toBe("WORKSPACE PENDING");
      expect(formatFortWorkspacePublicId(undefined)).toBe("WORKSPACE PENDING");
    });
  });

  describe("5. Module Feature Flags & Administration Controls", () => {
    it("disables voice route and module when voice flag is OFF", () => {
      const featureFlags = { voice: false, crm: true };
      expect(isRouteAuthorized(["admin", "agent"], "/app/voice", featureFlags)).toBe(false);
      expect(isRouteAuthorized(["admin", "agent"], "/app/crm", featureFlags)).toBe(true);
    });

    it("disables marketing route when marketing flag is OFF", () => {
      const featureFlags = { marketing: false };
      expect(isRouteAuthorized(["admin", "manager"], "/app/marketing", featureFlags)).toBe(false);
    });

    it("evaluates active module grants dynamically based on feature flags", () => {
      const featureFlags = { voice: false, marketplace: false };
      expect(isRouteAuthorized(["agent"], "/app/marketplace", featureFlags)).toBe(false);
      expect(isRouteAuthorized(["agent"], "/app/leads", featureFlags)).toBe(true);
    });
  });

  describe("6. Role Demotion / Transition: Agent -> Viewer", () => {
    it("synchronizes System A 'viewer' with System B 'viewer'", () => {
      const sync = checkRoleSynchronization("viewer", ["viewer"]);
      expect(sync.synchronized).toBe(true);
    });

    it("maps persona to INVESTOR and Fort to INDIVIDUAL (/fort/individual)", () => {
      const welcome = resolveWelcomeFort({
        profilePersona: "INVESTOR",
      });
      expect(welcome.persona).toBe("INVESTOR");
      expect(welcome.fortId).toBe("INDIVIDUAL");
      expect(welcome.route).toBe("/fort/individual");
    });

    it("grants VIEW_ONLY access mode and ACTIVE console state to /app/leads for viewer role", () => {
      const grants = resolveConsoleModules(["viewer"]);
      const leadsGrant = grants.find((g) => g.route === "/app/leads");
      expect(leadsGrant).toBeDefined();
      expect(leadsGrant?.state).toBe("ACTIVE");
      expect(leadsGrant?.accessMode).toBe("VIEW_ONLY");
    });

    it("LOCKS operational write routes (/app/voice, /app/marketing) for viewer", () => {
      const grants = resolveConsoleModules(["viewer"]);
      const voiceGrant = grants.find((g) => g.route === "/app/voice");
      const marketingGrant = grants.find((g) => g.route === "/app/marketing");

      expect(voiceGrant?.state).toBe("LOCKED");
      expect(marketingGrant?.state).toBe("LOCKED");
      expect(isRouteAuthorized(["viewer"], "/app/voice")).toBe(false);
      expect(isRouteAuthorized(["viewer"], "/app/marketing")).toBe(false);
    });
  });

  describe("7. Platform Administrator RLS & Migration Policy Verification", () => {
    it("ensures migration 20260918180000 provides admin RLS policies for workspace_members and audit", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const migrationFile = path.resolve(__dirname, "../supabase/migrations/20260918180000_admin_workspace_members_and_audit_rls.sql");
      
      expect(fs.existsSync(migrationFile)).toBe(true);
      const sql = fs.readFileSync(migrationFile, "utf-8");

      expect(sql).toContain("workspace_members_select_policy");
      expect(sql).toContain("workspace_members_update_admin");
      expect(sql).toContain("workspace_members_insert_admin");
      expect(sql).toContain("sentinel_user_profiles");
      expect(sql).toContain("audit_logs_insert_admin");
      expect(sql).toContain("public.has_role(auth.uid(), 'admin'::public.app_role)");
    });
  });
});
