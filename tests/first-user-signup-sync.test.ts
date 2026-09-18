/**
 * FIRST USER & SELF-SIGNUP ROLE SYNCHRONIZATION REGRESSION TEST
 *
 * Verifies that:
 *   1. All ordinary self-signups (User #1, User #2, ..., User #N) unconditionally
 *      receive System A: viewer and System B: viewer.
 *   2. Dual role synchronization evaluates to true (synchronized = true).
 *   3. Fort status resolves to ACTIVE (reason = RESOLVED).
 *   4. No automatic first-user administrative promotion exists in migration code.
 *   5. Founder elevation remains strictly explicit via supabase/admin/provision_founder_account.sql.
 *   6. Role mismatch fail-closed security guarantees remain intact (viewer + admin => mismatch / error).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  checkRoleSynchronization,
  resolveFortStatus,
  fortFallbackContext,
  SELF_SIGNUP_DEFAULT_APP_ROLE,
  NEVER_AUTO_PROVISIONED_ROLES,
} from "../src/lib/fort-experience";

const REPO_ROOT = resolve(__dirname, "..");
function read(relPath: string): string {
  return readFileSync(resolve(REPO_ROOT, relPath), "utf8");
}

function stripSqlComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

describe("First User & Self-Signup Role Synchronization", () => {
  describe("1. User #1 (First Registrant in Fresh Database)", () => {
    it("User #1: System A viewer + System B viewer -> synchronized and ACTIVE", () => {
      const sync = checkRoleSynchronization("viewer", ["viewer"]);
      expect(sync.synchronized).toBe(true);

      const status = resolveFortStatus({
        workspaceId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        appRoles: ["viewer"],
        roleMismatch: !sync.synchronized,
      });

      expect(status.status).toBe("ACTIVE");
      expect(status.reason).toBe("RESOLVED");
    });
  });

  describe("2. User #2 (Subsequent Self-Signups)", () => {
    it("User #2: System A viewer + System B viewer -> synchronized and ACTIVE", () => {
      const sync = checkRoleSynchronization("viewer", ["viewer"]);
      expect(sync.synchronized).toBe(true);

      const status = resolveFortStatus({
        workspaceId: "22222222-3333-4444-5555-666666666666",
        appRoles: ["viewer"],
        roleMismatch: !sync.synchronized,
      });

      expect(status.status).toBe("ACTIVE");
      expect(status.reason).toBe("RESOLVED");
    });

    it("User #1000: Registration order has zero impact on assigned privilege level", () => {
      const sync = checkRoleSynchronization("viewer", ["viewer"]);
      expect(sync.synchronized).toBe(true);
      expect(SELF_SIGNUP_DEFAULT_APP_ROLE).toBe("viewer");
    });
  });

  describe("3. Forward Migration AST & Security Assertions", () => {
    const migrationSql = read(
      "supabase/migrations/20260918140000_standardize_new_user_default_role.sql"
    );
    const code = stripSqlComments(migrationSql);

    it("contains NO first-user auto-admin promotion branch", () => {
      expect(code).not.toMatch(/user_count\s*<=\s*1/i);
      expect(code).not.toMatch(/count\(\*\)\s+into\s+user_count/i);
      expect(code).not.toMatch(/then\s+['"]admin['"]/i);
    });

    it("unconditionally assigns viewer app_role", () => {
      expect(code).toMatch(/VALUES\s*\(\s*NEW\.id\s*,\s*'viewer'::public\.app_role\s*\)/i);
    });

    it("locks down execution from anon, public, and authenticated callers", () => {
      expect(code).toMatch(
        /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.handle_new_user\(\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated/i
      );
    });
  });

  describe("4. Preservation of Founder Security Boundary", () => {
    const founderSql = read("supabase/admin/provision_founder_account.sql");

    it("founder elevation is strictly out-of-band via administrative script", () => {
      expect(founderSql).toContain("c_hq_workspace");
      expect(founderSql).toContain("00000000-0000-0000-0000-00000000d3f7");
      expect(founderSql).toContain("c_platform_admin_role");
      expect(founderSql).toContain("00000000-0000-0000-0000-0000000ad301");
      expect(founderSql).toContain("'admin'::public.app_role");
      expect(founderSql).toContain("YOUR_GOOGLE_EMAIL_HERE");
    });

    it("no self-registration can auto-provision privileged roles", () => {
      for (const role of NEVER_AUTO_PROVISIONED_ROLES) {
        expect(SELF_SIGNUP_DEFAULT_APP_ROLE).not.toBe(role);
      }
    });
  });

  describe("5. Preservation of Role Mismatch Fail-Closed Security Gate", () => {
    it("viewer + admin: flags mismatch and fails closed", () => {
      const sync = checkRoleSynchronization("viewer", ["admin"]);
      expect(sync.synchronized).toBe(false);
      expect(sync.reason).toContain("viewer membership cannot hold System B administrative role");

      const status = resolveFortStatus({
        workspaceId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        appRoles: ["admin"],
        roleMismatch: !sync.synchronized,
      });

      expect(status.status).toBe("ERROR");
      expect(status.reason).toBe("ROLE_MISMATCH");

      const fallback = fortFallbackContext(status.status, status.reason);
      expect(fallback.status).toBe("ERROR");
      expect(fallback.reason).toBe("ROLE_MISMATCH");
      expect(fallback.workspaceId).toBeNull();
      expect(fallback.capabilities).toEqual([]);
      expect(fallback.modules).toEqual([]);
      expect(fallback.landingRoute).toBeNull();
    });

    it("platform_admin + viewer: flags mismatch and fails closed", () => {
      const sync = checkRoleSynchronization("platform_admin", ["viewer"]);
      expect(sync.synchronized).toBe(false);
      expect(sync.reason).toContain("platform_admin requires System B admin role");
    });
  });
});
