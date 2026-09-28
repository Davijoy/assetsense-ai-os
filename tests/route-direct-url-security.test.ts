import { describe, it, expect } from "vitest";
import { isRouteAuthorized, ROUTE_ROLES } from "../src/lib/route-roles";
import { searchEntries } from "../src/lib/search-index";

describe("Direct URL Route Security & Route Guards", () => {
  const protectedRoutes = [
    { route: "/app/leads", allowed: ["admin", "manager", "agent", "viewer"], forbidden: ["builder", "developer"] },
    { route: "/app/inventory", allowed: ["admin", "manager", "builder", "developer"], forbidden: ["viewer", "agent"] },
    { route: "/app/voice", allowed: ["admin", "manager", "agent"], forbidden: ["viewer", "builder", "developer"] },
    { route: "/app/marketing", allowed: ["admin", "manager"], forbidden: ["viewer", "agent", "builder", "developer"] },
    { route: "/app/salesintel", allowed: ["admin", "builder", "developer"], forbidden: ["manager", "agent", "viewer"] },
    { route: "/app/copilot", allowed: ["admin", "manager", "builder", "developer"], forbidden: ["agent", "viewer"] },
    { route: "/app/docchat", allowed: ["admin", "builder", "developer"], forbidden: ["manager", "agent", "viewer"] },
    { route: "/app/documents", allowed: ["admin", "manager", "agent", "builder", "developer"], forbidden: ["viewer"] },
    { route: "/app/settings/branding", allowed: ["admin"], forbidden: ["manager", "agent", "viewer", "builder", "developer"] },
    { route: "/app/settings/integrations", allowed: ["admin"], forbidden: ["manager", "agent", "viewer", "builder", "developer"] },
    { route: "/app/users", allowed: ["admin"], forbidden: ["manager", "agent", "viewer", "builder", "developer"] },
    { route: "/app/governance", allowed: ["admin"], forbidden: ["manager", "agent", "viewer", "builder", "developer"] },
    { route: "/app/command", allowed: ["admin"], forbidden: ["manager", "agent", "viewer", "builder", "developer"] },
    { route: "/app/risk", allowed: ["admin"], forbidden: ["manager", "agent", "viewer", "builder", "developer"] },
    { route: "/app/market", allowed: ["admin", "viewer", "builder", "developer"], forbidden: ["manager", "agent"] },
    { route: "/app/supreme-intelligence", allowed: ["admin", "viewer", "builder", "developer"], forbidden: ["manager", "agent"] },
    { route: "/app/workflows", allowed: ["admin", "builder", "developer"], forbidden: ["manager", "agent", "viewer"] },
    { route: "/app/recommendations", allowed: ["admin", "builder"], forbidden: ["manager", "agent", "viewer", "developer"] },
    { route: "/app/graph", allowed: ["admin"], forbidden: ["manager", "agent", "viewer", "builder", "developer"] },
    { route: "/app/collections", allowed: ["admin", "viewer"], forbidden: ["manager", "agent", "builder", "developer"] },
    { route: "/app/kie", allowed: ["admin", "builder", "developer"], forbidden: ["manager", "agent", "viewer"] },
  ];

  for (const { route, allowed, forbidden } of protectedRoutes) {
    describe(`Route Security: ${route}`, () => {
      it(`permits allowed roles: ${allowed.join(", ")}`, () => {
        for (const role of allowed) {
          expect(isRouteAuthorized([role], route)).toBe(true);
        }
      });

      if (forbidden.length > 0) {
        it(`fails closed (denies) unauthorized roles: ${forbidden.join(", ")}`, () => {
          for (const role of forbidden) {
            expect(isRouteAuthorized([role], route)).toBe(false);
          }
        });
      }
    });
  }

  describe("Sales Manager (app_role = manager) — Explicit Direct Route Matrix", () => {
    const deniedForManager = [
      "/app/command",
      "/app/docchat",
      "/app/recommendations",
      "/app/workflows",
      "/app/risk",
      "/app/market",
      "/app/supreme-intelligence",
      "/app/salesintel",
      "/app/collections",
      "/app/graph",
      "/app/kie",
      "/app/users",
      "/app/governance",
      "/app/settings/branding",
      "/app/settings/integrations",
    ];

    for (const route of deniedForManager) {
      it(`strictly DENIES manager direct access to ${route}`, () => {
        expect(isRouteAuthorized(["manager"], route)).toBe(false);
      });
    }

    const optionalRoutes = [
      { route: "/app/marketplace", flag: "marketplace" },
      { route: "/app/inventory", flag: "inventory" },
      { route: "/app/marketing", flag: "marketing" },
      { route: "/app/bi", flag: "bi" },
      { route: "/app/voice", flag: "voice" },
      { route: "/app/copilot", flag: "chat" },
    ];

    for (const { route, flag } of optionalRoutes) {
      it(`OPTIONAL ${route}: flag false/disabled -> denied, flag true/enabled -> allowed`, () => {
        // When flag is explicitly disabled
        expect(isRouteAuthorized(["manager"], route, { [flag]: false })).toBe(false);
        // When flag is enabled
        expect(isRouteAuthorized(["manager"], route, { [flag]: true })).toBe(true);
      });

      it(`OPTIONAL ${route}: ABSENT flag key in featureFlags -> strictly DENIED / FAIL-CLOSED`, () => {
        // Completely empty featureFlags object (key absent)
        expect(isRouteAuthorized(["manager"], route, {})).toBe(false);
        // featureFlags object with other unrelated flags only
        expect(isRouteAuthorized(["manager"], route, { unrelated_flag: true, crm: true })).toBe(false);
      });
    }
  });

  describe("Search & Navigation Filtering Authorization", () => {
    const deniedForManager = [
      "/app/command",
      "/app/docchat",
      "/app/recommendations",
      "/app/workflows",
      "/app/risk",
      "/app/market",
      "/app/supreme-intelligence",
      "/app/salesintel",
      "/app/collections",
      "/app/graph",
      "/app/kie",
      "/app/users",
      "/app/governance",
      "/app/settings/branding",
      "/app/settings/integrations",
    ];

    it("searchEntries strictly excludes ALL denied routes for Sales Manager", () => {
      // Query for all product items
      const results = searchEntries("", "All", ["manager"]);
      const resultRoutes = results.map((r) => r.to);

      for (const forbidden of deniedForManager) {
        expect(resultRoutes).not.toContain(forbidden);
      }
    });

    it("searchEntries excludes optional routes when flags are absent or false for Sales Manager", () => {
      const resultsWithoutFlags = searchEntries("", "All", ["manager"], {});
      const routesWithoutFlags = resultsWithoutFlags.map((r) => r.to);

      expect(routesWithoutFlags).not.toContain("/app/marketplace");
      expect(routesWithoutFlags).not.toContain("/app/inventory");
      expect(routesWithoutFlags).not.toContain("/app/marketing");
      expect(routesWithoutFlags).not.toContain("/app/bi");
      expect(routesWithoutFlags).not.toContain("/app/voice");
      expect(routesWithoutFlags).not.toContain("/app/copilot");
    });

    it("searchEntries includes optional routes only when explicitly enabled for Sales Manager", () => {
      const resultsWithFlags = searchEntries("", "All", ["manager"], {
        marketplace: true,
        inventory: true,
        marketing: true,
        bi: true,
        voice: true,
        chat: true,
      });
      const routesWithFlags = resultsWithFlags.map((r) => r.to);

      expect(routesWithFlags).toContain("/app/marketplace");
      expect(routesWithFlags).toContain("/app/inventory");
      expect(routesWithFlags).toContain("/app/marketing");
      expect(routesWithFlags).toContain("/app/bi");
      expect(routesWithFlags).toContain("/app/voice");
      expect(routesWithFlags).toContain("/app/copilot");
    });

    it("searchEntries allows Platform Admin to search all administrative surfaces", () => {
      const adminResults = searchEntries("", "All", ["admin"]);
      const adminRoutes = adminResults.map((r) => r.to);

      expect(adminRoutes).toContain("/app/command");
      expect(adminRoutes).toContain("/app/users");
      expect(adminRoutes).toContain("/app/governance");
      expect(adminRoutes).toContain("/app/risk");
      expect(adminRoutes).toContain("/app/settings/branding");
    });

    it("searchEntries hides all internal /app/ routes from unauthenticated searches", () => {
      const publicResults = searchEntries("", "All", []);
      const publicRoutes = publicResults.map((r) => r.to);

      for (const route of publicRoutes) {
        expect(route.startsWith("/app/")).toBe(false);
      }
    });
  });

  describe("Platform Administrator Feature Flag Bypass Verification", () => {
    it("admin + voice:false -> Voice route still authorized, manager denied", () => {
      expect(isRouteAuthorized(["admin"], "/app/voice", { voice: false })).toBe(true);
      expect(isRouteAuthorized(["manager"], "/app/voice", { voice: false })).toBe(false);
    });

    it("admin + inventory:false -> Inventory route still authorized, manager denied", () => {
      expect(isRouteAuthorized(["admin"], "/app/inventory", { inventory: false })).toBe(true);
      expect(isRouteAuthorized(["manager"], "/app/inventory", { inventory: false })).toBe(false);
    });

    it("admin + chat:false -> Copilot/admin-accessible Chat route still authorized, manager denied", () => {
      expect(isRouteAuthorized(["admin"], "/app/copilot", { chat: false })).toBe(true);
      expect(isRouteAuthorized(["manager"], "/app/copilot", { chat: false })).toBe(false);
    });

    it("admin with all optional flags false retains access to all role-authorized modules, while manager is denied", () => {
      const allFalseFlags = {
        marketplace: false,
        inventory: false,
        marketing: false,
        bi: false,
        voice: false,
        chat: false,
        collections: false,
      };

      // Admin remains authorized for all admin-accessible surfaces
      expect(isRouteAuthorized(["admin"], "/app/voice", allFalseFlags)).toBe(true);
      expect(isRouteAuthorized(["admin"], "/app/inventory", allFalseFlags)).toBe(true);
      expect(isRouteAuthorized(["admin"], "/app/copilot", allFalseFlags)).toBe(true);
      expect(isRouteAuthorized(["admin"], "/app/marketplace", allFalseFlags)).toBe(true);
      expect(isRouteAuthorized(["admin"], "/app/marketing", allFalseFlags)).toBe(true);
      expect(isRouteAuthorized(["admin"], "/app/bi", allFalseFlags)).toBe(true);
      expect(isRouteAuthorized(["admin"], "/app/collections", allFalseFlags)).toBe(true);

      // Manager is strictly denied for all optional flag-gated modules
      expect(isRouteAuthorized(["manager"], "/app/voice", allFalseFlags)).toBe(false);
      expect(isRouteAuthorized(["manager"], "/app/inventory", allFalseFlags)).toBe(false);
      expect(isRouteAuthorized(["manager"], "/app/copilot", allFalseFlags)).toBe(false);
      expect(isRouteAuthorized(["manager"], "/app/marketplace", allFalseFlags)).toBe(false);
      expect(isRouteAuthorized(["manager"], "/app/marketing", allFalseFlags)).toBe(false);
      expect(isRouteAuthorized(["manager"], "/app/bi", allFalseFlags)).toBe(false);
      expect(isRouteAuthorized(["manager"], "/app/collections", allFalseFlags)).toBe(false);
    });
  });

  it("fails closed on unauthenticated / empty roles", () => {
    expect(isRouteAuthorized([], "/app/leads")).toBe(false);
    expect(isRouteAuthorized([], "/app/settings/branding")).toBe(false);
    expect(isRouteAuthorized([], "/app/users")).toBe(false);
    expect(isRouteAuthorized([], "/app/inventory")).toBe(false);
  });
});
