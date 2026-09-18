import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { consoleModuleState } from "../src/lib/fort-experience";

const appSrc = readFileSync(resolve(__dirname, "../src/routes/app.tsx"), "utf8");
const routeSrc = readFileSync(
  resolve(__dirname, "../src/routes/app.supreme-intelligence.tsx"),
  "utf8",
);

/**
 * The sidebar entries, by destination, taken from app.tsx's nav / kieNav /
 * adminNav literals.
 *
 * NOTE — post Task C the nav literals no longer carry a `roles:` field. The
 * shell's sidebar visibility is derived SERVER-SIDE from the resolved FORT
 * access context (consoleModuleState over MODULE_CATALOG + ROUTE_ROLES), not
 * from a hand-maintained per-item role list. So this test now reads the actual
 * `to:` set from the sidebar and resolves visibility through the SAME function
 * the shell uses — the assertion is against real behaviour, not a source copy.
 */
function extractNavRoutes(name: string): string[] {
  const re = new RegExp(`const ${name}: NavItem\\[\\] = \\[([\\s\\S]*?)\\n\\];`);
  const block = appSrc.match(re);
  if (!block) throw new Error(`Could not find ${name} array in app.tsx`);
  const routes: string[] = [];
  const itemRe = /\{[^}]*to:\s*"([^"]+)"[^}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(block[1])) !== null) routes.push(m[1]);
  return routes;
}

const SIDEBAR_ROUTES = [
  ...extractNavRoutes("nav"),
  ...extractNavRoutes("kieNav"),
  ...extractNavRoutes("adminNav"),
];

/** Exactly the shell's rule: a sidebar entry shows when the server grants it. */
const visibleFor = (role: string) =>
  SIDEBAR_ROUTES.filter((to) => consoleModuleState(to, [role]) === "ACTIVE");

// Route-level access mirrors the sidebar matrix
// (admin/manager/viewer/builder/developer; agent excluded) — see the route-guard
// test below. This is the committed Knowledge Engine visibility for Supreme
// Intelligence, and it is exactly MODULE_CATALOG["/app/supreme-intelligence"].
const SUPREME_ROLES = ["admin", "manager", "viewer", "builder", "developer"];
const SUPREME_ROUTE = "/app/supreme-intelligence";

describe("Supreme Intelligence — sidebar ↔ route authorization consistency", () => {
  it("declares a Supreme Intelligence sidebar entry", () => {
    expect(SIDEBAR_ROUTES, "Supreme Intelligence should be present in kieNav").toContain(
      SUPREME_ROUTE,
    );
  });

  it("sidebar visibility for Supreme reflects the Knowledge Engine matrix", () => {
    // Resolve each app_role through the shell's own function and assert the
    // ACTIVE set equals the committed matrix — no wider, no narrower.
    const ALL_ROLES = ["admin", "manager", "agent", "viewer", "builder", "developer"];
    const sees = ALL_ROLES.filter((r) => consoleModuleState(SUPREME_ROUTE, [r]) === "ACTIVE");
    expect(sees.sort()).toEqual([...SUPREME_ROLES].sort());
  });

  it.each(["admin", "manager", "viewer", "builder", "developer"] as const)(
    "role '%s' sees Supreme Intelligence in the sidebar",
    (role) => {
      expect(visibleFor(role), `role '${role}' should see Supreme Intelligence`).toContain(
        SUPREME_ROUTE,
      );
    },
  );

  it.each(["agent"] as const)(
    "role '%s' does NOT see Supreme Intelligence in the sidebar",
    (role) => {
      expect(
        visibleFor(role),
        `role '${role}' should not see Supreme Intelligence`,
      ).not.toContain(SUPREME_ROUTE);
    },
  );

    it("route guard uses the SAME allow-list as the sidebar (admin/manager/viewer/builder/developer) and bounces agent to /app/crm", () => {
    // The route must admit the committed sidebar roles and deny agent; failure
    // stays fail-closed to /app/crm. The matrix must mirror the sidebar.
    expect(routeSrc).toContain("/app/crm"); // fail-closed target retained
    expect(routeSrc).toContain("hasAnyRole"); // canonical useAuth guard

    const m = routeSrc.match(/hasAnyRole\(\s*\[([\s\S]*?)\]\s*(?:as\s+[\w\[\]\.]+)?\s*\)/);
    expect(m, "route guard should declare a hasAnyRole allow-list").toBeTruthy();
    const allowed = (m?.[1] ?? "")
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
    expect(allowed).toEqual(SUPREME_ROLES); // sidebar == route matrix
    expect(allowed).not.toContain("agent"); // agent excluded from both
    expect(routeSrc).not.toContain("!isAdmin && !isManager"); // old guard removed
  });
});
