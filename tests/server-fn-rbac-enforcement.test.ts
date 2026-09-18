import { describe, it, expect } from "vitest";
import { listAdminUsers, updateUserRole, listWorkspaceFeatureFlags, updateWorkspaceFeatureFlag } from "../src/lib/users.functions";
import { getLiveLeads, updateLeadStage, assignLeadOwner } from "../src/lib/crm.functions";
import { getModuleAccess, getAuthorizedModules } from "../src/lib/fort-modules";
import { checkRoleSynchronization } from "../src/lib/fort-experience";

describe("Server Function RBAC Enforcement & Admin Controls", () => {
  it("server functions export callable or createServerFn contracts", () => {
    expect(typeof listAdminUsers).toBe("function");
    expect(typeof updateUserRole).toBe("function");
    expect(typeof listWorkspaceFeatureFlags).toBe("function");
    expect(typeof updateWorkspaceFeatureFlag).toBe("function");
    expect(typeof getLiveLeads).toBe("function");
    expect(typeof updateLeadStage).toBe("function");
    expect(typeof assignLeadOwner).toBe("function");
  });

  it("role synchronization enforces least-privilege alignment", () => {
    // Synchronized pair
    expect(checkRoleSynchronization("viewer", ["viewer"]).synchronized).toBe(true);
    expect(checkRoleSynchronization("platform_admin", ["admin"]).synchronized).toBe(true);

    // Mismatched pair fails closed
    expect(checkRoleSynchronization("viewer", ["admin"]).synchronized).toBe(false);
    expect(checkRoleSynchronization("member", ["admin"]).synchronized).toBe(false);
    expect(checkRoleSynchronization("platform_admin", ["viewer"]).synchronized).toBe(false);
  });

  it("pure module access evaluation handles empty, partial, and full contexts", () => {
    const empty = getAuthorizedModules({ roles: [] });
    expect(empty).toHaveLength(0);

    const viewer = getAuthorizedModules({ roles: ["viewer"] });
    expect(viewer.map((m) => m.route)).toContain("/app/crm");
    expect(viewer.map((m) => m.route)).toContain("/app/marketplace");
    expect(viewer.map((m) => m.route)).not.toContain("/app/users");
  });
});
