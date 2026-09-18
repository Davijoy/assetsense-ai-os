import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { activeConsoleRouteSet, resolveConsoleModules } from "../src/lib/fort-experience";

/**
 * /app SIDEBAR ROLE-BASED VISIBILITY — Builder & Developer.
 *
 * ────────────────────────────────────────────────────────────────────────
 * WHY THIS TEST WAS REWRITTEN (Task C migration)
 * ────────────────────────────────────────────────────────────────────────
 * The shell's sidebar entries no longer carry a hand-maintained `roles:` array.
 * Post Task C, visibility is derived SERVER-SIDE from the resolved FORT access
 * context and mirrored on the client by exactly this composition:
 *
 *     granted   = activeConsoleRouteSet(resolveConsoleModules(appRoles))
 *     visible[] = sidebarRoutes.filter((to) => granted.has(to))
 *
 * (see src/routes/app.tsx AppShell). This test now asserts against that SAME
 * pair of functions and the ACTUAL `to:` set parsed from app.tsx — not a regex
 * copy of a per-item role list that could silently drift from the authority.
 *
 * The previous inline `roles:` arrays HAD drifted from the authoritative tables
 * (MODULE_CATALOG + ROUTE_ROLES). Reconciling to the authority produces a
 * display-only visibility delta for builder/developer — no route gate, server
 * function or RLS policy changes; a visible module still hits its own gate:
 *
 *   • builder   GAINS  /app/salesintel, /app/kie, /app/supreme-intelligence
 *   • developer GAINS  /app/salesintel, /app/kie, /app/supreme-intelligence
 *   • developer LOSES  /app/graph        (ROUTE_ROLES graph = [admin, manager])
 *
 * The expected matrices below are the AUTHORITATIVE outcome, hand-verified
 * against src/lib/fort-modules.ts and src/lib/route-roles.ts.
 */

const appSrc = readFileSync(resolve(__dirname, "../src/routes/app.tsx"), "utf8");

/** The `to:` destinations of one nav array literal (nav / kieNav / adminNav). */
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

const NAV = extractNavRoutes("nav");
const KIE_NAV = extractNavRoutes("kieNav");
const ADMIN_NAV = extractNavRoutes("adminNav");
const SIDEBAR_ROUTES = [...NAV, ...KIE_NAV, ...ADMIN_NAV];

/** EXACTLY the shell's rule: server-granted ∩ present in the sidebar. */
const visibleFor = (role: string): string[] => {
  const granted = activeConsoleRouteSet(resolveConsoleModules([role]));
  return SIDEBAR_ROUTES.filter((to) => granted.has(to));
};

const sorted = (xs: string[]) => [...xs].sort();

describe("/app sidebar role-based visibility — Builder & Developer", () => {
  it("the sidebar exposes the routes this test reasons about", () => {
    // Guards the parser: if app.tsx's nav literals change shape, fail loudly
    // here rather than silently reasoning over an empty route set.
    expect(SIDEBAR_ROUTES.length).toBeGreaterThan(20);
    expect(SIDEBAR_ROUTES).toContain("/app/crm");
    expect(SIDEBAR_ROUTES).toContain("/app/kie");
    expect(SIDEBAR_ROUTES).toContain("/app/settings/branding");
  });

  it("Builder sees exactly the authoritative builder module set", () => {
    const expectedVisible = [
      "/app/marketplace",
      "/app/bi",
      "/app/partners",
      "/app/copilot",
      "/app/docchat",
      "/app/recommendations", // MODULE_CATALOG recommendations includes builder
      "/app/workflows",
      "/app/dealrooms",
      "/app/market",
      "/app/supreme-intelligence", // reconciled: builder now granted
      "/app/inventory",
      "/app/salesintel", // reconciled: builder now granted
      "/app/documents",
      "/app/kie", // reconciled: builder now granted
    ];
    const expectedHidden = [
      "/app/crm",
      "/app/leads",
      "/app/voice",
      "/app/marketing",
      "/app/command",
      "/app/risk",
      "/app/collections", // collections = [admin, manager, viewer]
      "/app/graph", // graph = [admin, manager]
      "/app/users",
      "/app/governance",
      "/app/settings/branding",
      "/app/settings/integrations",
    ];

    expect(sorted(visibleFor("builder"))).toEqual(sorted(expectedVisible));

    // Completeness: every sidebar route is accounted for, so a newly added
    // entry cannot slip past this test unreviewed.
    expect(new Set([...expectedVisible, ...expectedHidden])).toEqual(new Set(SIDEBAR_ROUTES));
  });

  it("Developer sees exactly the authoritative developer module set (NOT Graph)", () => {
    const expectedVisible = [
      "/app/marketplace",
      "/app/bi",
      "/app/partners",
      "/app/copilot",
      "/app/docchat",
      "/app/workflows",
      "/app/dealrooms",
      "/app/market",
      "/app/supreme-intelligence", // reconciled: developer now granted
      "/app/inventory",
      "/app/salesintel", // reconciled: developer now granted
      "/app/documents",
      "/app/kie", // reconciled: developer now granted
    ];
    const expectedHidden = [
      "/app/crm",
      "/app/leads",
      "/app/voice",
      "/app/marketing",
      "/app/command",
      "/app/recommendations", // recommendations = [admin, manager, builder] — not developer
      "/app/risk",
      "/app/collections",
      "/app/graph", // reconciled: graph = [admin, manager] — developer LOSES it
      "/app/users",
      "/app/governance",
      "/app/settings/branding",
      "/app/settings/integrations",
    ];

    expect(sorted(visibleFor("developer"))).toEqual(sorted(expectedVisible));
    expect(visibleFor("developer"), "developer must NOT see the Intelligence Graph").not.toContain(
      "/app/graph",
    );
    expect(new Set([...expectedVisible, ...expectedHidden])).toEqual(new Set(SIDEBAR_ROUTES));
  });

  it("Builder/Developer roles never leak into admin-only sections", () => {
    // Derived from the real resolver, not a parsed role list: no adminNav route
    // resolves ACTIVE for builder or developer.
    for (const role of ["builder", "developer"]) {
      const granted = activeConsoleRouteSet(resolveConsoleModules([role]));
      for (const to of ADMIN_NAV) {
        expect(granted.has(to), `${role} should NOT see admin route ${to}`).toBe(false);
      }
    }
  });

  it("Other roles do not gain unintended access from the reconciliation", () => {
    // Viewer is read-only: it must not see write-heavy modules.
    const viewer = visibleFor("viewer");
    for (const to of [
      "/app/voice",
      "/app/workflows",
      "/app/dealrooms",
      "/app/copilot",
    ]) {
      expect(viewer, `viewer should NOT see ${to}`).not.toContain(to);
    }
    expect(viewer).toContain("/app/crm");
    expect(viewer).toContain("/app/leads");

    // Agent must not see admin tools.
    const agent = visibleFor("agent");
    for (const to of ["/app/governance", "/app/settings/branding", "/app/settings/integrations", "/app/command", "/app/risk"]) {
      expect(agent, `agent should NOT see ${to}`).not.toContain(to);
    }
  });
});
