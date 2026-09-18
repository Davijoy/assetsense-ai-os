/**
 * SENTINEL FORT — Email Signup -> Workspace Provisioning -> CRM Access Test Suite.
 *
 * Verifies the complete architecture chain for a newly registered Sales Executive:
 *   1. Authentication & Workspace Provisioning contract
 *   2. System A (workspace_members.role_id) & System B (user_roles) role synchronization
 *   3. Persona resolution (SALES_EXECUTIVE -> FORTS.BROKER)
 *   4. Module access resolution for Sales Executive (agent role) vs Viewer
 *   5. Landing route prioritization (/app/crm default)
 *   6. Lead assignment & CRM operations authorization
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
import { PERSONAS } from "../src/sentinel/personas";
import { ROUTE_ROLES, isRouteAuthorized } from "../src/lib/route-roles";
import { MODULE_CATALOG, moduleAccessState } from "../src/lib/fort-modules";
import { AGENT_CAPABILITY_META } from "../src/lib/supreme-agent-capability-meta";

describe("Email Signup -> Workspace Provisioning -> CRM Access Chain", () => {
  describe("1. Workspace Provisioning & Identity", () => {
    it("formats human-readable workspace ID for a newly provisioned customer workspace", () => {
      const workspaceId = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
      const publicId = formatFortWorkspacePublicId(workspaceId);
      expect(publicId).toMatch(/^SF-WS-\d{3}$/);
    });

    it("formats human-readable user ID for newly registered user", () => {
      const userId = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";
      const fortUserId = formatFortUserId(userId);
      expect(fortUserId).toMatch(/^FORT-USER-[A-Z]{3}\d{4}$/);
    });

    it("formats WORKSPACE PENDING when workspace ID is missing (never leaks SF-HQ-001)", () => {
      expect(formatFortWorkspacePublicId(null)).toBe("WORKSPACE PENDING");
      expect(formatFortWorkspacePublicId(undefined)).toBe("WORKSPACE PENDING");
      expect(formatFortWorkspacePublicId("")).toBe("WORKSPACE PENDING");
    });

    it("formats SF-HQ-001 ONLY for the true internal HQ workspace UUID", () => {
      const hqId = "00000000-0000-0000-0000-00000000d3f7";
      expect(formatFortWorkspacePublicId(hqId)).toBe("SF-HQ-001");
    });

    it("resolves ACTIVE workspace status when provisioned with a valid role", () => {
      const status = resolveFortStatus({
        workspaceId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        appRoles: ["agent"],
        membershipPending: false,
        roleMismatch: false,
      });
      expect(status.status).toBe("ACTIVE");
      expect(status.reason).toBe("RESOLVED");
    });

    it("resolves AWAITING workspace status when unprovisioned (never assumes platform_admin)", () => {
      const status = resolveFortStatus({
        workspaceId: null,
        appRoles: [],
        membershipPending: false,
      });
      expect(status.status).toBe("AWAITING");
      expect(status.reason).toBe("PROVISIONING_DECLINED");
    });
  });

  describe("2. System A and System B Role Synchronization", () => {
    it("synchronizes System A 'member' with System B 'agent' (Sales Executive)", () => {
      const result = checkRoleSynchronization("member", ["agent"]);
      expect(result.synchronized).toBe(true);
    });

    it("synchronizes System A 'member' with System B 'manager'", () => {
      const result = checkRoleSynchronization("member", ["manager"]);
      expect(result.synchronized).toBe(true);
    });

    it("synchronizes System A 'viewer' with System B 'viewer'", () => {
      const result = checkRoleSynchronization("viewer", ["viewer"]);
      expect(result.synchronized).toBe(true);
    });

    it("synchronizes System A 'platform_admin' with System B 'admin'", () => {
      const result = checkRoleSynchronization("platform_admin", ["admin"]);
      expect(result.synchronized).toBe(true);
    });

    it("fails closed when System A and System B disagree on administrative privilege", () => {
      const mismatchViewerAdmin = checkRoleSynchronization("viewer", ["admin"]);
      expect(mismatchViewerAdmin.synchronized).toBe(false);

      const mismatchAdminViewer = checkRoleSynchronization("platform_admin", ["viewer"]);
      expect(mismatchAdminViewer.synchronized).toBe(false);
    });
  });

  describe("3. Persona Resolution & Fort Mapping", () => {
    it("maps SALES_EXECUTIVE persona to BROKER Fort (Sales Executive Workspace)", () => {
      const fortId = personaToFort("SALES_EXECUTIVE");
      expect(fortId).toBe("BROKER");
      expect(FORTS.BROKER.label).toBe("Sales Executive Fort");
      expect(FORTS.BROKER.personae).toContain("SALES_EXECUTIVE");
    });

    it("includes /app/crm and /app/leads in Sales Executive Fort modules", () => {
      expect(FORTS.BROKER.modules).toContain("/app/crm");
      expect(FORTS.BROKER.modules).toContain("/app/leads");
      expect(FORTS.BROKER.modules).toContain("/app/voice");
    });

    it("resolves welcome Fort for SALES_EXECUTIVE persona", () => {
      const resolved = resolveWelcomeFort({
        profilePersona: "SALES_EXECUTIVE",
      });
      expect(resolved.persona).toBe("SALES_EXECUTIVE");
      expect(resolved.fortId).toBe("BROKER");
      expect(resolved.route).toBe("/fort/broker");
    });
  });

  describe("4. Module Access Resolution for Sales Executive (agent role)", () => {
    it("grants ACTIVE access to both /app/crm and /app/leads for agent role", () => {
      const grants = resolveConsoleModules(["agent"]);
      const grantedSet = activeConsoleRouteSet(grants);

      expect(grantedSet.has("/app/crm")).toBe(true);
      expect(grantedSet.has("/app/leads")).toBe(true);
      expect(grantedSet.has("/app/voice")).toBe(true);
      expect(grantedSet.has("/app/marketing")).toBe(true);
    });

    it("reports /app/leads and /app/crm as ACTIVE for viewer role with VIEW_ONLY mode for leads", () => {
      const grants = resolveConsoleModules(["viewer"]);
      const crmGrant = grants.find((g) => g.route === "/app/crm");
      const leadsGrant = grants.find((g) => g.route === "/app/leads");

      expect(crmGrant?.state).toBe("ACTIVE");
      expect(leadsGrant?.state).toBe("ACTIVE");
      expect(leadsGrant?.accessMode).toBe("VIEW_ONLY");
    });

    it("authorizes route navigation for agent role on CRM and Leads", () => {
      expect(isRouteAuthorized(["agent"], "/app/crm")).toBe(true);
      expect(isRouteAuthorized(["agent"], "/app/leads")).toBe(true);
      expect(isRouteAuthorized(["agent"], "/app/marketplace")).toBe(true);
    });
  });

  describe("5. Landing Route Prioritization", () => {
    it("prioritizes /app/crm when no specific preferredOrder is given", () => {
      const grants = resolveConsoleModules(["agent"]);
      const landing = resolveLandingRoute(grants, []);
      expect(landing).toBe("/app/crm");
    });

    it("honors preferredOrder from Sales Executive Fort if specified", () => {
      const grants = resolveConsoleModules(["agent"]);
      const landing = resolveLandingRoute(grants, FORTS.BROKER.modules);
      expect(landing).toBe("/app/crm");
    });

    it("falls back gracefully when user has viewer role", () => {
      const grants = resolveConsoleModules(["viewer"]);
      const landing = resolveLandingRoute(grants, []);
      expect(landing).toBe("/app/crm");
    });
  });

  describe("6. Intelligence & Capability Permissions", () => {
    it("allows Sales Executive (agent) to execute CRM KPI intelligence", () => {
      expect(canExecuteCapability("crm.getCRMKPIs", ["agent"])).toBe(true);
      expect(canExecuteCapability("customer.getContext", ["agent"])).toBe(false);
      expect(canExecuteCapability("customer.getContext", ["admin", "manager"])).toBe(true);
    });

    it("restricts Supreme orchestration to admin and manager only", () => {
      expect(canExecuteCapability("supreme.orchestrate", ["agent"])).toBe(false);
      expect(canExecuteCapability("supreme.orchestrate", ["admin"])).toBe(true);
      expect(canExecuteCapability("supreme.orchestrate", ["manager"])).toBe(true);
    });
  });
});
