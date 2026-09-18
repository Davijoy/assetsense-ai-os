import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ORCHESTRATION_EXEC_ROLES,
  canExecuteSupreme,
} from "../src/business-intelligence/supreme/authorization";

const FUNCTIONS_PATH = "../src/lib/supreme-orchestrator.functions.ts";
const ROUTE_PATH = "../src/routes/app.supreme-intelligence.tsx";
const ROLE_MIDDLEWARE_PATH = "../src/integrations/supabase/role-middleware.ts";

const read = (p: string) => readFileSync(resolve(__dirname, p), "utf8");

/** Extract the region of a single exported server function, by docs/const name. */
function serverFnRegion(name: string): string {
  const src = read(FUNCTIONS_PATH);
  const marker = `export const ${name}`;
  const start = src.indexOf(marker);
  if (start === -1) return "";
  // Bound the region at the next top-level `export ` (whether another const
  // server fn or an `export async function`) so a body never bleeds into the
  // next block (e.g., processApprovalDecision's context.userRoles).
  const after = src.indexOf("\nexport ", start + marker.length);
  return src.slice(start, after === -1 ? undefined : after);
}

describe("Supreme authorization — executed allow/deny matrix (admin/manager only)", () => {
  it("allowed execution set is EXACTLY [\"admin\", \"manager\"] — no widening", () => {
    expect(ORCHESTRATION_EXEC_ROLES).toEqual(["admin", "manager"]);
  });

  it("ADMIN => PASS", () => {
    expect(canExecuteSupreme(["admin"])).toBe(true);
  });

  it("MANAGER => PASS", () => {
    expect(canExecuteSupreme(["manager"])).toBe(true);
  });

  it("VIEWER => DENY", () => {
    expect(canExecuteSupreme(["viewer"])).toBe(false);
  });

  it("BUILDER => DENY", () => {
    expect(canExecuteSupreme(["builder"])).toBe(false);
  });

  it("DEVELOPER => DENY", () => {
    expect(canExecuteSupreme(["developer"])).toBe(false);
  });

  it("AGENT => DENY", () => {
    expect(canExecuteSupreme(["agent"])).toBe(false);
  });

  it("empty / unset roles => DENY", () => {
    expect(canExecuteSupreme([])).toBe(false);
  });

  it("read-only mix (viewer + agent) => DENY", () => {
    expect(canExecuteSupreme(["viewer", "agent"])).toBe(false);
  });

  it("platform_admin literal does NOT bypass (no hardcode / no widening)", () => {
    expect(canExecuteSupreme(["platform_admin"])).toBe(false);
    expect(ORCHESTRATION_EXEC_ROLES).not.toContain("platform_admin");
  });

  it("manager present among read-only roles => PASS (admin|manager semantics)", () => {
    expect(canExecuteSupreme(["viewer", "manager"])).toBe(true);
  });
});

describe("Supreme invocation contract — { data: ... } envelope enforced by the typed aliases", () => {
  it("orchestration call uses the { data: ... } envelope", () => {
    const route = read(ROUTE_PATH);
    // The envelope must open with `data: {` and carry workspaceId + dryRun.
    // Advisory Sentinel Fort context (sentinelContext) may extend the payload —
    // it is advisory only and never touches authorization.
        expect(route).toMatch(/invokeSupremeOrchestration\(\{\s*data:\s*\{\s*workspaceId: user\.workspaceId,\s*dryRun,/);
  });

  it("proof scenario call uses the { data: ... } envelope", () => {
    const route = read(ROUTE_PATH);
        expect(route).toMatch(/invokeSupremeProofScenario\(\{\s*data:\s*\{\s*\.\.\.request,\s*workspaceId: user\.workspaceId,\s*\},?\s*\}\)/);
  });

  it("alias parameter types require { data: <payload> } — bare payload no longer accepted by the typed wrapper", () => {
    const src = read(FUNCTIONS_PATH);
    // The aliases now type their single input argument as { data: ... }; a bare
    // OrchestrationRequest/ProofScenarioRequest will not compile against them.
        expect(src).toMatch(/invokeSupremeOrchestration = runSupremeOrchestration as unknown as \(\s*input:\s*\{ data: OrchestrationRequest \},\s*\)/);
        expect(src).toMatch(/invokeSupremeProofScenario = runProofScenario as unknown as \(\s*input:\s*\{ data: ProofScenarioRequest \},\s*\)/);
    // Sanity: no alias still declares a bare request parameter type.
    expect(src).not.toMatch(/input: [^\\n]*OrchestrationRequest\\s*,/);
    expect(src).not.toMatch(/input: [^\\n]*ProofScenarioRequest\\s*,/);
  });
});

describe("Supreme authorization — DB-backed, server-side, client/JWT trust removed", () => {
  it("runSupremeOrchestration is a server function gated by requireRoles([admin, manager])", () => {
    const region = serverFnRegion("runSupremeOrchestration");
    expect(region).toMatch(/createServerFn\(\{ method: "POST" \}\)/);
    expect(region).toMatch(/\.middleware\(\[requireRoles\(\["admin", "manager"\]\)\]\)/);
    // No client/JWT-supplied role context is read for authorization.
    expect(region).not.toMatch(/userRoles/);
    expect(region).not.toMatch(/context\.userRoles/);
    expect(region).not.toMatch(/app_metadata/);
    expect(region).not.toMatch(/user_metadata/);
  });

  it("runProofScenario applies the SAME canonical correction (server fn + requireRoles([admin, manager]))", () => {
    const region = serverFnRegion("runProofScenario");
    expect(region).toMatch(/createServerFn\(\{ method: "POST" \}\)/);
    expect(region).toMatch(/\.middleware\(\[requireRoles\(\["admin", "manager"\]\)\]\)/);
    expect(region).not.toMatch(/userRoles/);
    expect(region).not.toMatch(/app_metadata/);
    expect(region).not.toMatch(/user_metadata/);
  });

  it("the old manual 'context.userRoles.includes(\"admin\")' gate is fully removed", () => {
    const src = read(FUNCTIONS_PATH);
    expect(src).not.toMatch(/context\.userRoles\.includes\("admin"\)/);
  });

  it("JWT app_metadata / user_metadata roles are NOT read anywhere in the orchestrator functions", () => {
    const src = read(FUNCTIONS_PATH);
    expect(src).not.toMatch(/app_metadata/);
    expect(src).not.toMatch(/user_metadata/);
  });

  it("canonical middleware is DB-backed via public.user_roles and requires [admin, manager]", () => {
    const src = read(ROLE_MIDDLEWARE_PATH);
    expect(src).toMatch(/\.from\("user_roles"\)/);
    expect(src).toMatch(/requireAdminOrManager\s*=\s*requireRoles\(\["admin", "manager"\]\)/);
    expect(src).toMatch(/requireRoles\(roles: AppRole\[\]\)|requireRoles\(roles/);
  });

  it("Supreme Intelligence route resolves roles from DB user_roles (never JWT app/user_metadata)", () => {
    const routeSrc = read(ROUTE_PATH);
    // Canonical defect (TODO #4): the route must read roles from the DB
    // user_roles table — mirroring app.supreme-agent.tsx — never from the JWT.
    expect(routeSrc).toMatch(/\.from\("user_roles"\)/);
    expect(routeSrc).not.toMatch(/app_metadata/);
    expect(routeSrc).not.toMatch(/user_metadata/);
  });

  it("Supreme Intelligence route fails safely when the session read rejects (getSession guarded)", () => {
    const routeSrc = read(ROUTE_PATH);
    // getSession is the only un-guarded await in beforeLoad; wrapping it in
    // try/catch ensures a rejection redirects to /auth instead of red-screening
    // the route via the error boundary.
    expect(routeSrc).toMatch(
      /try\s*\{\s*[\s\S]*?await supabase\.auth\.getSession\(\)[\s\S]*?\}\s*catch\s*\{/,
    );
  });

  it("the route invokes orchestration/proof through the TanStack { data: ... } envelope (no client roles)", () => {
    const route = read(ROUTE_PATH);
        expect(route).toMatch(/await invokeSupremeOrchestration\(\{\s*data:\s*\{\s*workspaceId: user\.workspaceId,\s*dryRun,\s*\},\s*\}\)/);
        expect(route).toMatch(/await invokeSupremeProofScenario\(\{\s*data:\s*\{\s*\.\.\.request,\s*workspaceId: user\.workspaceId,\s*\},\s*\}\)/);
    // Approval decision keeps its (unchanged, client-invoked) 2-arg shape;
    // orchestration/proof never pass client roles.
  });

  it("dry-run safety guard remains in the orchestration server function (B4 preserved)", () => {
    const region = serverFnRegion("runSupremeOrchestration");
    expect(region).toMatch(
      /if\s*\(!\s*\(\s*request\.dryRun\s*\?\?\s*false\s*\)\s*\)\s*\{\s*await\s+publishOrchestrationEvents\(result\)\s*;/s,
    );
  });
});