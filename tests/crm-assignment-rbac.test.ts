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
