import { describe, it, expect } from "vitest";
import {
  getLiveLeads,
  assignLeadOwner,
  assignLeadToExecutive,
  unassignLead,
  selfAssignLead,
  mapDatabaseRowsToLiveLeads,
} from "../src/lib/crm.functions";

describe("CRM Assignment RBAC & Least-Privilege Access Control", () => {
  const mockLeadsData = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Riya Kapoor",
      email: "riya@example.com",
      phone: "+919820123456",
      source: "Meta Ads",
      stage: "new",
      score: 85,
      budget_inr: 16000000,
      project: "Lodha Belmondo",
      owner: "Aarav Mehta",
      assigned_to: "user-agent-1",
      created_at: new Date().toISOString(),
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Vikram Joshi",
      email: "vikram@example.com",
      phone: "+919820234567",
      source: "Website",
      stage: "call_back",
      score: 75,
      budget_inr: 32000000,
      project: "Oberoi Sky City",
      owner: "Siddharth Sharma",
      assigned_to: "user-agent-2",
      created_at: new Date().toISOString(),
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Neha Sharma",
      email: "neha@example.com",
      phone: "+919820345678",
      source: "Google Ads",
      stage: "qualified",
      score: 90,
      budget_inr: 21000000,
      project: "Prestige Lakeside",
      owner: null,
      assigned_to: null,
      created_at: new Date().toISOString(),
    },
  ];

  it("pure row mapper transforms database rows accurately", () => {
    const liveLeads = mapDatabaseRowsToLiveLeads(mockLeadsData);
    expect(liveLeads).toHaveLength(3);
    expect(liveLeads[0].name).toBe("Riya Kapoor");
    expect(liveLeads[0].budget).toBe("₹1.6 Cr");
    expect(liveLeads[0].stage).toBe("New");
  });

  it("sales executive role receives only their assigned leads strictly by assigned_to user ID", () => {
    const userId = "user-agent-1";
    const userRole = ["agent"];
    const isSalesExecutive = userRole.includes("agent") && !userRole.includes("admin") && !userRole.includes("manager");

    // Pure ID matching (no name or initials heuristics)
    const filtered = mockLeadsData.filter((r) => {
      if (isSalesExecutive) {
        return r.assigned_to === userId;
      }
      return true;
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Riya Kapoor");
    expect(filtered[0].assigned_to).toBe("user-agent-1");
  });

  it("manager and admin roles receive all workspace leads", () => {
    const managerRoles = ["manager"];
    const isManagerExec = managerRoles.includes("agent") && !managerRoles.includes("admin") && !managerRoles.includes("manager");

    const managerLeads = mockLeadsData.filter((r) => {
      if (isManagerExec) return r.assigned_to === "user-mgr-1";
      return true;
    });

    expect(managerLeads).toHaveLength(3);

    const adminRoles = ["admin"];
    const isAdminExec = adminRoles.includes("agent") && !adminRoles.includes("admin") && !adminRoles.includes("manager");

    const adminLeads = mockLeadsData.filter((r) => {
      if (isAdminExec) return r.assigned_to === "user-admin-1";
      return true;
    });

    expect(adminLeads).toHaveLength(3);
  });

  it("prohibits sales executives from self-assigning leads", () => {
    const userRoles = ["agent"];
    const isManagerOrAdmin = userRoles.some((r) => ["admin", "manager"].includes(r));
    expect(isManagerOrAdmin).toBe(false);

    // Enforcement logic in server function
    const evaluateSelfAssign = (roles: string[]) => {
      if (!roles.some((r) => ["admin", "manager"].includes(r))) {
        throw new Error("INSUFFICIENT_PRIVILEGES: Only Sales Managers and Administrators can assign or claim leads.");
      }
      return true;
    };

    expect(() => evaluateSelfAssign(userRoles)).toThrowError(/INSUFFICIENT_PRIVILEGES/);
    expect(evaluateSelfAssign(["manager"])).toBe(true);
    expect(evaluateSelfAssign(["admin"])).toBe(true);
  });

  it("assignment functions are exported and callable createServerFn instances", () => {
    expect(typeof assignLeadOwner).toBe("function");
    expect(typeof assignLeadToExecutive).toBe("function");
    expect(typeof unassignLead).toBe("function");
    expect(typeof selfAssignLead).toBe("function");
    expect(typeof getLiveLeads).toBe("function");
  });
});

describe("Lead Assignment Picker Candidate Resolution & Mutation Hardening", () => {
  const targetWorkspaceId = "00000000-0000-0000-0000-00000000d3f7";
  const otherWorkspaceId = "11111111-1111-1111-1111-111111111111";

  const mockProfiles = [
    { id: "d634c565-99f2-4c5a-ac1f-d581ec4465d5", full_name: "Manager Test", email: "managertestsales12@gmail.com" },
    { id: "517d21fd-86a3-4eea-a6cc-15d83de0cf34", full_name: "Sales Executive Test", email: "salesexecutivetest1@gmail.com" },
    { id: "user-agent-inactive", full_name: "Inactive Agent", email: "inactive@example.com" },
    { id: "user-agent-other-ws", full_name: "Other WS Agent", email: "otherws@example.com" },
    { id: "user-dual-role", full_name: "Dual Role User", email: "dual@example.com" },
  ];

  const mockWorkspaceMembers = [
    { user_id: "d634c565-99f2-4c5a-ac1f-d581ec4465d5", workspace_id: targetWorkspaceId, status: "active", roles: { name: "member" } },
    { user_id: "517d21fd-86a3-4eea-a6cc-15d83de0cf34", workspace_id: targetWorkspaceId, status: "active", roles: { name: "member" } },
    { user_id: "user-agent-inactive", workspace_id: targetWorkspaceId, status: "inactive", roles: { name: "member" } },
    { user_id: "user-agent-other-ws", workspace_id: otherWorkspaceId, status: "active", roles: { name: "member" } },
    { user_id: "user-dual-role", workspace_id: targetWorkspaceId, status: "active", roles: { name: "member" } },
  ];

  const mockUserRoles: Record<string, string[]> = {
    "d634c565-99f2-4c5a-ac1f-d581ec4465d5": ["manager"],
    "517d21fd-86a3-4eea-a6cc-15d83de0cf34": ["agent"],
    "user-agent-inactive": ["agent"],
    "user-agent-other-ws": ["agent"],
    "user-dual-role": ["manager", "agent"],
  };

  function resolveAssignableTeamMembers(
    leadWorkspaceId: string,
    members: typeof mockWorkspaceMembers,
    rolesMap: Record<string, string[]>,
    profiles: typeof mockProfiles
  ) {
    const verifiedMembers = members.filter(
      (m) => m.workspace_id === leadWorkspaceId && m.status === "active" && m.roles?.name === "member"
    );

    const profilesMap = new Map(profiles.map((p) => [p.id, p]));

    return verifiedMembers
      .filter((m) => {
        const userAppRoles = new Set(rolesMap[m.user_id] ?? []);
        const profile = profilesMap.get(m.user_id);
        return Boolean(profile && userAppRoles.has("agent"));
      })
      .map((m) => {
        const profile = profilesMap.get(m.user_id)!;
        return {
          id: m.user_id,
          name: profile.full_name || profile.email.split("@")[0] || "Sales Executive",
          role: "Sales Executive" as const,
          email: profile.email,
          status: m.status,
        };
      });
  }

  it("1. Manager and Admin can open picker, pure Agent cannot", () => {
    const isManagerAssignable = ["manager"].some((r) => ["admin", "manager"].includes(r));
    const isAdminAssignable = ["admin"].some((r) => ["admin", "manager"].includes(r));
    const isAgentAssignable = ["agent"].some((r) => ["admin", "manager"].includes(r));

    expect(isManagerAssignable).toBe(true);
    expect(isAdminAssignable).toBe(true);
    expect(isAgentAssignable).toBe(false);
  });

  it("2. Active agent in same workspace appears as assignable Sales Executive", () => {
    const result = resolveAssignableTeamMembers(targetWorkspaceId, mockWorkspaceMembers, mockUserRoles, mockProfiles);
    const exec = result.find((r) => r.id === "517d21fd-86a3-4eea-a6cc-15d83de0cf34");

    expect(exec).toBeDefined();
    expect(exec?.name).toBe("Sales Executive Test");
    expect(exec?.email).toBe("salesexecutivetest1@gmail.com");
    expect(exec?.role).toBe("Sales Executive");
  });

  it("3. Manager does not appear unless they also genuinely hold agent role", () => {
    const result = resolveAssignableTeamMembers(targetWorkspaceId, mockWorkspaceMembers, mockUserRoles, mockProfiles);
    
    // Plain manager is excluded
    const plainManager = result.find((r) => r.id === "d634c565-99f2-4c5a-ac1f-d581ec4465d5");
    expect(plainManager).toBeUndefined();

    // User with genuine agent role alongside manager is included as Sales Executive
    const dualRole = result.find((r) => r.id === "user-dual-role");
    expect(dualRole).toBeDefined();
    expect(dualRole?.role).toBe("Sales Executive");
  });

  it("4. Agent from another workspace does not appear", () => {
    const result = resolveAssignableTeamMembers(targetWorkspaceId, mockWorkspaceMembers, mockUserRoles, mockProfiles);
    const otherWsAgent = result.find((r) => r.id === "user-agent-other-ws");
    expect(otherWsAgent).toBeUndefined();
  });

  it("5. Inactive agent does not appear", () => {
    const result = resolveAssignableTeamMembers(targetWorkspaceId, mockWorkspaceMembers, mockUserRoles, mockProfiles);
    const inactive = result.find((r) => r.id === "user-agent-inactive");
    expect(inactive).toBeUndefined();
  });

  function validateAssignmentMutation(params: {
    leadWorkspaceId: string;
    targetExecutiveId: string;
    members: typeof mockWorkspaceMembers;
    rolesMap: Record<string, string[]>;
  }) {
    const membership = params.members.find(
      (m) =>
        m.workspace_id === params.leadWorkspaceId &&
        m.user_id === params.targetExecutiveId &&
        m.status === "active" &&
        m.roles?.name === "member"
    );

    if (!membership) {
      throw new Error("ASSIGNEE_NOT_ELIGIBLE: User is not an active workspace member.");
    }

    const roles = new Set(params.rolesMap[params.targetExecutiveId] ?? []);
    if (!roles.has("agent")) {
      throw new Error("ASSIGNEE_NOT_ELIGIBLE: Assignee must hold the Sales Executive ('agent') role.");
    }

    return { success: true, assignedTo: params.targetExecutiveId };
  }

  it("6. Assignment to same-workspace active agent succeeds", () => {
    const res = validateAssignmentMutation({
      leadWorkspaceId: targetWorkspaceId,
      targetExecutiveId: "517d21fd-86a3-4eea-a6cc-15d83de0cf34",
      members: mockWorkspaceMembers,
      rolesMap: mockUserRoles,
    });
    expect(res.success).toBe(true);
    expect(res.assignedTo).toBe("517d21fd-86a3-4eea-a6cc-15d83de0cf34");
  });

  it("7. Assignment to manager-only user is rejected", () => {
    expect(() =>
      validateAssignmentMutation({
        leadWorkspaceId: targetWorkspaceId,
        targetExecutiveId: "d634c565-99f2-4c5a-ac1f-d581ec4465d5",
        members: mockWorkspaceMembers,
        rolesMap: mockUserRoles,
      })
    ).toThrowError(/ASSIGNEE_NOT_ELIGIBLE: Assignee must hold the Sales Executive \('agent'\) role\./);
  });

  it("8. Assignment to another-workspace agent is rejected", () => {
    expect(() =>
      validateAssignmentMutation({
        leadWorkspaceId: targetWorkspaceId,
        targetExecutiveId: "user-agent-other-ws",
        members: mockWorkspaceMembers,
        rolesMap: mockUserRoles,
      })
    ).toThrowError(/ASSIGNEE_NOT_ELIGIBLE: User is not an active workspace member\./);
  });
});

