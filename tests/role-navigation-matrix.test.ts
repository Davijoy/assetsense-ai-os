import { describe, it, expect } from "vitest";
import { MODULE_CATALOG, getModuleAccess, getAuthorizedModules } from "../src/lib/fort-modules";
import { isRouteAuthorized, ROUTE_ROLES } from "../src/lib/route-roles";
import { resolveFortModules, resolveConsoleModules } from "../src/lib/fort-experience";

describe("Role-Based Navigation Matrix & Central Access Authority", () => {
  describe("Viewer Access Matrix", () => {
    const roles = ["viewer"];

    it("grants VIEW_ONLY access to Leads for viewer", () => {
      const access = getModuleAccess({ roles }, "/app/leads");
      expect(access.state).toBe("ACTIVE");
      expect(access.accessMode).toBe("VIEW_ONLY");
      expect(isRouteAuthorized(roles, "/app/leads")).toBe(true);
    });

    it("grants VIEW_ONLY access to CRM and Marketplace for viewer", () => {
      const crmAccess = getModuleAccess({ roles }, "/app/crm");
      expect(crmAccess.state).toBe("ACTIVE");
      expect(crmAccess.accessMode).toBe("VIEW_ONLY");

      const marketAccess = getModuleAccess({ roles }, "/app/marketplace");
      expect(marketAccess.state).toBe("ACTIVE");
      expect(marketAccess.accessMode).toBe("VIEW_ONLY");
    });

    it("grants OPERATIONAL access to Workspace Messages for viewer", () => {
      const msgAccess = getModuleAccess({ roles }, "/app/messages");
      expect(msgAccess.state).toBe("ACTIVE");
      expect(msgAccess.accessMode).toBe("OPERATIONAL");
      expect(isRouteAuthorized(roles, "/app/messages")).toBe(true);
    });

    it("locks administrative and operational modules for viewer", () => {
      const lockedRoutes = [
        "/app/inventory",
        "/app/voice",
        "/app/marketing",
        "/app/users",
        "/app/settings/branding",
        "/app/settings/integrations",
        "/app/governance",
        "/app/command",
        "/app/risk",
      ];

      for (const route of lockedRoutes) {
        const access = getModuleAccess({ roles }, route);
        expect(access.state).toBe("LOCKED");
        expect(access.accessMode).toBe("LOCKED");
        expect(isRouteAuthorized(roles, route)).toBe(false);
      }
    });
  });

  describe("Sales Executive (Agent) Access Matrix", () => {
    const roles = ["agent"];

    it("grants OPERATIONAL access to CRM, Leads, Voice, Messages, Deal Rooms, and Documents", () => {
      const operationalRoutes = [
        "/app/crm",
        "/app/leads",
        "/app/voice",
        "/app/messages",
        "/app/dealrooms",
        "/app/documents",
      ];

      for (const route of operationalRoutes) {
        const access = getModuleAccess({ roles }, route);
        expect(access.state).toBe("ACTIVE");
        expect(access.accessMode).toBe("OPERATIONAL");
        expect(isRouteAuthorized(roles, route)).toBe(true);
      }
    });

    it("locks Inventory, Marketing, Sales Intel, Copilot, DocChat, Branding, Governance, Users, and Risk for agent", () => {
      const lockedRoutes = [
        "/app/inventory",
        "/app/marketing",
        "/app/salesintel",
        "/app/copilot",
        "/app/docchat",
        "/app/users",
        "/app/settings/branding",
        "/app/settings/integrations",
        "/app/governance",
        "/app/command",
        "/app/risk",
      ];

      for (const route of lockedRoutes) {
        const access = getModuleAccess({ roles }, route);
        expect(access.state).toBe("LOCKED");
        expect(isRouteAuthorized(roles, route)).toBe(false);
      }
    });
  });

  describe("Developer / Builder Access Matrix", () => {
    const roles = ["builder", "developer"];

    it("grants OPERATIONAL access to Inventory, Workflows, Dealrooms, and KIE", () => {
      const devRoutes = [
        "/app/inventory",
        "/app/workflows",
        "/app/dealrooms",
        "/app/kie",
        "/app/messages",
      ];

      for (const route of devRoutes) {
        const access = getModuleAccess({ roles }, route);
        expect(access.state).toBe("ACTIVE");
        expect(access.accessMode).toBe("OPERATIONAL");
        expect(isRouteAuthorized(roles, route)).toBe(true);
      }
    });

    it("locks administrative control surfaces for builder/developer", () => {
      const lockedRoutes = [
        "/app/leads",
        "/app/users",
        "/app/settings/branding",
        "/app/settings/integrations",
        "/app/governance",
        "/app/command",
        "/app/risk",
      ];

      for (const route of lockedRoutes) {
        const access = getModuleAccess({ roles }, route);
        expect(access.state).toBe("LOCKED");
        expect(isRouteAuthorized(roles, route)).toBe(false);
      }
    });
  });

  describe("Platform Administrator (Admin) Access Matrix", () => {
    const roles = ["admin"];

    it("grants ADMINISTRATIVE access across all platform modules", () => {
      const adminRoutes = [
        "/app/crm",
        "/app/leads",
        "/app/inventory",
        "/app/voice",
        "/app/marketing",
        "/app/users",
        "/app/governance",
        "/app/settings/branding",
        "/app/settings/integrations",
        "/app/command",
        "/app/risk",
      ];

      for (const route of adminRoutes) {
        const access = getModuleAccess({ roles }, route);
        expect(access.state).toBe("ACTIVE");
        expect(access.accessMode).toBe("ADMINISTRATIVE");
        expect(isRouteAuthorized(roles, route)).toBe(true);
      }
    });
  });

  describe("Dynamic Feature Flag Evaluation", () => {
    it("locks voice module when voice feature flag is false", () => {
      const context = {
        roles: ["admin", "agent"],
        featureFlags: { voice: false, crm: true },
      };

      const voiceAccess = getModuleAccess(context, "/app/voice");
      expect(voiceAccess.state).toBe("LOCKED");
      expect(voiceAccess.enabled).toBe(false);
      expect(isRouteAuthorized(context.roles, "/app/voice", context.featureFlags)).toBe(false);

      // Other modules remain unaffected
      const crmAccess = getModuleAccess(context, "/app/crm");
      expect(crmAccess.state).toBe("ACTIVE");
      expect(crmAccess.enabled).toBe(true);
    });

    it("locks marketing module when marketing feature flag is false", () => {
      const context = {
        roles: ["admin", "manager"],
        featureFlags: { marketing: false },
      };

      const mktAccess = getModuleAccess(context, "/app/marketing");
      expect(mktAccess.state).toBe("LOCKED");
      expect(mktAccess.enabled).toBe(false);
      expect(isRouteAuthorized(context.roles, "/app/marketing", context.featureFlags)).toBe(false);
    });
  });

  describe("Pure Resolution Integration", () => {
    it("resolveFortModules populates accessMode for all grants", () => {
      const grants = resolveFortModules(["/app/crm", "/app/market", "/app/users"], ["viewer"]);
      expect(grants[0].route).toBe("/app/crm");
      expect(grants[0].state).toBe("ACTIVE");
      expect(grants[0].accessMode).toBe("VIEW_ONLY");

      expect(grants[1].route).toBe("/app/market");
      expect(grants[1].state).toBe("ACTIVE");
      expect(grants[1].accessMode).toBe("VIEW_ONLY");

      expect(grants[2].route).toBe("/app/users");
      expect(grants[2].state).toBe("LOCKED");
      expect(grants[2].accessMode).toBe("LOCKED");
    });

    it("resolveConsoleModules reflects verified role capabilities", () => {
      const grants = resolveConsoleModules(["agent"]);
      const leadsGrant = grants.find((g) => g.route === "/app/leads");
      expect(leadsGrant?.state).toBe("ACTIVE");
      expect(leadsGrant?.accessMode).toBe("OPERATIONAL");

      const brandingGrant = grants.find((g) => g.route === "/app/settings/branding");
      expect(brandingGrant?.state).toBe("LOCKED");
    });

    it("resolveConsoleModules and resolveFortModules hide /app/voice when voice flag is disabled", () => {
      // Voice Disabled
      const disabledConsole = resolveConsoleModules(["agent"], { voice: false });
      const voiceConsoleGrant = disabledConsole.find((g) => g.route === "/app/voice");
      expect(voiceConsoleGrant?.state).toBe("LOCKED");
      expect(voiceConsoleGrant?.accessMode).toBe("LOCKED");

      const disabledFort = resolveFortModules(["/app/voice", "/app/crm"], ["agent"], { voice: false });
      const voiceFortGrant = disabledFort.find((g) => g.route === "/app/voice");
      expect(voiceFortGrant?.state).toBe("LOCKED");
      expect(voiceFortGrant?.accessMode).toBe("LOCKED");

      const crmFortGrant = disabledFort.find((g) => g.route === "/app/crm");
      expect(crmFortGrant?.state).toBe("ACTIVE");

      // Voice Enabled
      const enabledConsole = resolveConsoleModules(["agent"], { voice: true });
      const voiceEnabledGrant = enabledConsole.find((g) => g.route === "/app/voice");
      expect(voiceEnabledGrant?.state).toBe("ACTIVE");
      expect(voiceEnabledGrant?.accessMode).toBe("OPERATIONAL");
    });
  });
});

