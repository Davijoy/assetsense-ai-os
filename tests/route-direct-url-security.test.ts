import { describe, it, expect } from "vitest";
import { isRouteAuthorized, ROUTE_ROLES } from "../src/lib/route-roles";

describe("Direct URL Route Security & Route Guards", () => {
  const protectedRoutes = [
    { route: "/app/leads", allowed: ["admin", "manager", "agent", "viewer"], forbidden: ["builder", "developer"] },
    { route: "/app/inventory", allowed: ["admin", "manager", "builder", "developer"], forbidden: ["viewer", "agent"] },
    { route: "/app/voice", allowed: ["admin", "manager", "agent"], forbidden: ["viewer", "builder", "developer"] },
    { route: "/app/marketing", allowed: ["admin", "manager", "agent"], forbidden: ["viewer", "builder", "developer"] },
    { route: "/app/settings/branding", allowed: ["admin"], forbidden: ["manager", "agent", "viewer", "builder", "developer"] },
    { route: "/app/settings/integrations", allowed: ["admin"], forbidden: ["manager", "agent", "viewer", "builder", "developer"] },
    { route: "/app/users", allowed: ["admin", "manager"], forbidden: ["agent", "viewer", "builder", "developer"] },
    { route: "/app/governance", allowed: ["admin", "manager"], forbidden: ["agent", "viewer", "builder", "developer"] },
    { route: "/app/command", allowed: ["admin", "manager"], forbidden: ["agent", "viewer", "builder", "developer"] },
    { route: "/app/risk", allowed: ["admin", "manager"], forbidden: ["agent", "viewer", "builder", "developer"] },
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

  it("fails closed on unauthenticated / empty roles", () => {
    expect(isRouteAuthorized([], "/app/leads")).toBe(false);
    expect(isRouteAuthorized([], "/app/settings/branding")).toBe(false);
    expect(isRouteAuthorized([], "/app/users")).toBe(false);
    expect(isRouteAuthorized([], "/app/inventory")).toBe(false);
  });
});
