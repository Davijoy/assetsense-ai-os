/**
 * FORT AUTHORIZATION & ROLE SYNCHRONIZATION TEST SUITE
 *
 * Asserts the server-authoritative authorization alignment between:
 *   System A: workspace_members -> roles (platform_admin, member, viewer)
 *   System B: user_roles -> app_role (admin, manager, agent, viewer, ...)
 *
 * Rules:
 *   1. System A and System B must agree on privilege level.
 *   2. If they disagree, fail closed (status: ERROR, reason: ROLE_MISMATCH).
 *   3. Resolver is strictly READ/RESOLVE ONLY (no mutations, no side effects).
 *   4. Human-readable FORT User ID (FORT-USER-XXX0990) is deterministic and contextual.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  checkRoleSynchronization,
  formatFortUserId,
  resolveFortStatus,
  fortFallbackContext,
  resolveFortModules,
  resolveFortCapabilities,
} from "@/lib/fort-experience";

const REPO_ROOT = resolve(__dirname, "..");
function read(relPath: string): string {
  return readFileSync(resolve(REPO_ROOT, relPath), "utf8");
}

describe("System A vs System B Role Synchronization", () => {
  it("platform_admin: synchronized when System B contains 'admin'", () => {
    const res = checkRoleSynchronization("platform_admin", ["admin"]);
    expect(res.synchronized).toBe(true);
  });

  it("platform_admin: MISMATCH when System B does NOT contain 'admin' (e.g. viewer)", () => {
    const res = checkRoleSynchronization("platform_admin", ["viewer"]);
    expect(res.synchronized).toBe(false);
    expect(res.reason).toContain("System A platform_admin requires System B admin role");
  });

  it("platform_admin: MISMATCH when System B is empty", () => {
    const res = checkRoleSynchronization("platform_admin", []);
    expect(res.synchronized).toBe(false);
  });

  it("viewer: synchronized when System B contains 'viewer' and no privileged role", () => {
    const res = checkRoleSynchronization("viewer", ["viewer"]);
    expect(res.synchronized).toBe(true);
  });

  it("viewer: MISMATCH when System B contains privileged 'admin' or 'manager'", () => {
    const adminCheck = checkRoleSynchronization("viewer", ["admin"]);
    expect(adminCheck.synchronized).toBe(false);
    expect(adminCheck.reason).toContain("viewer membership cannot hold System B administrative role");

    const managerCheck = checkRoleSynchronization("viewer", ["manager"]);
    expect(managerCheck.synchronized).toBe(false);
  });

  it("member: synchronized when System B contains standard roles (agent, manager, builder, developer)", () => {
    expect(checkRoleSynchronization("member", ["agent"]).synchronized).toBe(true);
    expect(checkRoleSynchronization("member", ["manager"]).synchronized).toBe(true);
    expect(checkRoleSynchronization("member", ["builder"]).synchronized).toBe(true);
    expect(checkRoleSynchronization("member", ["developer"]).synchronized).toBe(true);
  });

  it("member: MISMATCH when System B holds 'admin' (platform admin)", () => {
    const res = checkRoleSynchronization("member", ["admin"]);
    expect(res.synchronized).toBe(false);
    expect(res.reason).toContain("standard member cannot hold System B platform admin role");
  });

  it("missing System A role: fails closed (not synchronized)", () => {
    const res = checkRoleSynchronization(null, ["viewer"]);
    expect(res.synchronized).toBe(false);
    expect(res.reason).toBe("NO_SYSTEM_A_ROLE");
  });
});

describe("Human-readable FORT User ID Formatting", () => {
  it("generates deterministic FORT-USER-XXX0990 pattern for UUID", () => {
    const uuid = "00000000-0000-0000-0000-00000000d3f7";
    const id1 = formatFortUserId(uuid);
    const id2 = formatFortUserId(uuid);

    expect(id1).toBe(id2);
    expect(id1).toMatch(/^FORT-USER-[A-Z]{3}[0-9]{4}$/);
  });

  it("produces distinct identifiers for distinct user UUIDs", () => {
    const idA = formatFortUserId("11111111-1111-1111-1111-111111111111");
    const idB = formatFortUserId("22222222-2222-2222-2222-222222222222");

    expect(idA).not.toBe(idB);
    expect(idA).toMatch(/^FORT-USER-[A-Z]{3}[0-9]{4}$/);
    expect(idB).toMatch(/^FORT-USER-[A-Z]{3}[0-9]{4}$/);
  });

  it("handles null / undefined / empty input gracefully", () => {
    expect(formatFortUserId(null)).toBe("");
    expect(formatFortUserId(undefined)).toBe("");
    expect(formatFortUserId("")).toBe("");
  });
});

describe("Fail-Closed Authorization Mismatch Resolution", () => {
  it("resolveFortStatus emits status: ERROR, reason: ROLE_MISMATCH when mismatch occurs", () => {
    const res = resolveFortStatus({
      workspaceId: "00000000-0000-0000-0000-00000000d3f7",
      appRoles: ["viewer"],
      roleMismatch: true,
    });

    expect(res.status).toBe("ERROR");
    expect(res.reason).toBe("ROLE_MISMATCH");
  });

  it("fallback context on ERROR grants zero capabilities and zero modules", () => {
    const fallback = fortFallbackContext("ERROR", "ROLE_MISMATCH");

    expect(fallback.status).toBe("ERROR");
    expect(fallback.reason).toBe("ROLE_MISMATCH");
    expect(fallback.workspaceId).toBeNull();
    expect(fallback.role.appRoles).toEqual([]);
    expect(fallback.capabilities).toEqual([]);
    expect(fallback.modules).toEqual([]);
    expect(fallback.landingRoute).toBeNull();
  });
});

describe("Resolver Read-Only & Security Guardrails", () => {
  const resolverSrc = read("src/lib/fort-workspace.functions.ts");

  it("resolver contains NO INSERT, UPDATE, or DELETE on user_roles or workspace_members", () => {
    // Strip comments to inspect executable code
    const code = resolverSrc
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

    expect(code).not.toMatch(/\.from\(["']user_roles["']\)\.insert/);
    expect(code).not.toMatch(/\.from\(["']user_roles["']\)\.update/);
    expect(code).not.toMatch(/\.from\(["']user_roles["']\)\.delete/);
    expect(code).not.toMatch(/\.from\(["']workspace_members["']\)\.insert/);
    expect(code).not.toMatch(/\.from\(["']workspace_members["']\)\.update/);
    expect(code).not.toMatch(/\.from\(["']workspace_members["']\)\.delete/);
  });

  it("resolver does NOT hardcode founder emails or user UUIDs", () => {
    expect(resolverSrc).not.toMatch(/@gmail\.com|@assetsense/i);
    expect(resolverSrc).not.toMatch(/founder/i);
  });

  it("one-time administrative SQL script adheres to the approved pattern", () => {
    const migrationSql = read("supabase/admin/provision_founder_account.sql");

    expect(migrationSql).toContain("00000000-0000-0000-0000-00000000d3f7"); // HQ
    expect(migrationSql).toContain("00000000-0000-0000-0000-0000000ad301"); // platform_admin
    expect(migrationSql).toContain("'admin'::public.app_role");
    expect(migrationSql).toContain("'PLATFORM_ADMIN'");
    expect(migrationSql).toContain("'platform_administrator'");
    expect(migrationSql).toContain("YOUR_GOOGLE_EMAIL_HERE");
  });
});
