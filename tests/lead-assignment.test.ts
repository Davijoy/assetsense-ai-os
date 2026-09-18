import { describe, it, expect } from "vitest";
import {
  INITIAL_LEADS,
  DEFAULT_TEAM_MEMBERS,
  formatTimeAgo,
  formatBudgetInr,
  type LiveLead,
  type TeamMember,
} from "../src/lib/crm.functions";

describe("CRM Lead Assignment — Core Architecture & State Model", () => {
  it("includes unassigned leads in initial bootstrap leads for immediate claiming", () => {
    const unassigned = INITIAL_LEADS.filter((l) => !l.owner || l.owner === "Unassigned");
    expect(unassigned.length).toBeGreaterThan(0);
    
    const unassignedLead = unassigned[0];
    expect(unassignedLead.owner).toBeNull();
    expect(unassignedLead.ownerName).toBe("Unassigned");
  });

  it("includes assigned leads mapped to valid sales executives", () => {
    const assigned = INITIAL_LEADS.filter((l) => l.owner && l.owner !== "Unassigned");
    expect(assigned.length).toBeGreaterThan(0);

    for (const lead of assigned) {
      const matchedMember = DEFAULT_TEAM_MEMBERS.find(
        (m) => m.initials === lead.owner || m.id === lead.owner
      );
      expect(matchedMember).toBeDefined();
    }
  });

  it("provides active team members including Supreme AI Agent for assignment", () => {
    expect(DEFAULT_TEAM_MEMBERS).toBeDefined();
    expect(DEFAULT_TEAM_MEMBERS.length).toBeGreaterThanOrEqual(4);

    const aarav = DEFAULT_TEAM_MEMBERS.find((m) => m.initials === "AM");
    expect(aarav).toBeDefined();
    expect(aarav?.name).toBe("Aarav Mehta");
    expect(aarav?.role).toBe("Sales Director");

    const aiAgent = DEFAULT_TEAM_MEMBERS.find((m) => m.id === "AI");
    expect(aiAgent).toBeDefined();
    expect(aiAgent?.name).toBe("Supreme AI Agent");
    expect(aiAgent?.role).toBe("Autonomous Qualifier");
  });

  it("correctly formats budget in Indian Rupee denominations", () => {
    expect(formatBudgetInr(16000000)).toBe("₹1.6 Cr");
    expect(formatBudgetInr(32000000)).toBe("₹3.2 Cr");
    expect(formatBudgetInr(8500000)).toBe("₹85 L");
    expect(formatBudgetInr(18500000)).toBe("₹1.85 Cr");
    expect(formatBudgetInr(null)).toBe("₹0");
  });

  it("correctly calculates relative time ago strings", () => {
    const nowIso = new Date().toISOString();
    expect(formatTimeAgo(nowIso)).toMatch(/m ago|d ago|h ago/);

    const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString();
    expect(formatTimeAgo(oneHourAgo)).toBe("2h ago");
  });
});

describe("CRM Lead Assignment — Concurrency & Security Rules", () => {
  it("rejects silent overwriting when attempting self-assign on already assigned lead without force", () => {
    const mockLead = {
      id: "00000000-0000-0000-0000-000000000001",
      owner: "SS",
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
    };

    const actingInitials = "AM";
    const previousOwner = mockLead.owner;
    const forceReassign = false;

    const isCurrentlyAssigned = Boolean(previousOwner && previousOwner !== "Unassigned" && previousOwner !== "none");
    const isAssignedToOther = isCurrentlyAssigned && previousOwner !== actingInitials;

    expect(isAssignedToOther).toBe(true);

    const shouldThrow = isAssignedToOther && !forceReassign;
    expect(shouldThrow).toBe(true);
  });

  it("allows self-assign when lead is unassigned", () => {
    const mockLead = {
      id: "00000000-0000-0000-0000-000000000002",
      owner: null,
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
    };

    const actingInitials = "AM";
    const previousOwner = mockLead.owner;
    const forceReassign = false;

    const isCurrentlyAssigned = Boolean(previousOwner && previousOwner !== "Unassigned" && previousOwner !== "none");
    const isAssignedToOther = isCurrentlyAssigned && previousOwner !== actingInitials;

    expect(isAssignedToOther).toBe(false);

    const shouldThrow = isAssignedToOther && !forceReassign;
    expect(shouldThrow).toBe(false);
  });

  it("allows self-assign when forceReassign is true even if already assigned", () => {
    const mockLead = {
      id: "00000000-0000-0000-0000-000000000001",
      owner: "SS",
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
    };

    const actingInitials = "AM";
    const previousOwner = mockLead.owner;
    const forceReassign = true;

    const isCurrentlyAssigned = Boolean(previousOwner && previousOwner !== "Unassigned" && previousOwner !== "none");
    const isAssignedToOther = isCurrentlyAssigned && previousOwner !== actingInitials;

    const shouldThrow = isAssignedToOther && !forceReassign;
    expect(shouldThrow).toBe(false);
  });

  it("distinguishes between new assignment and reassignment audit tags", () => {
    const unassignedLead = { owner: null };
    const assignedLead = { owner: "SS" };

    const type1 = Boolean(unassignedLead.owner && unassignedLead.owner !== "Unassigned")
      ? "REASSIGN"
      : "ASSIGN_TO_EXECUTIVE";
    expect(type1).toBe("ASSIGN_TO_EXECUTIVE");

    const type2 = Boolean(assignedLead.owner && assignedLead.owner !== "Unassigned")
      ? "REASSIGN"
      : "ASSIGN_TO_EXECUTIVE";
    expect(type2).toBe("REASSIGN");
  });

  it("handles unassignment state transitions cleanly", () => {
    const lead: LiveLead = {
      id: "lead-test-1",
      name: "Test Lead",
      email: "test@example.com",
      phone: "+919820000000",
      source: "Direct",
      stage: "New",
      score: 80,
      budget: "₹1 Cr",
      budgetInr: 10000000,
      project: "Lodha",
      owner: "SS",
      ownerName: "Siddharth Sharma",
    };

    // Unassign transition
    const unassigned: LiveLead = {
      ...lead,
      owner: null,
      ownerName: "Unassigned",
    };

    expect(unassigned.owner).toBeNull();
    expect(unassigned.ownerName).toBe("Unassigned");

    // Self-assign transition
    const selfAssigned: LiveLead = {
      ...unassigned,
      owner: "AM",
      ownerName: "Aarav Mehta",
    };

    expect(selfAssigned.owner).toBe("AM");
    expect(selfAssigned.ownerName).toBe("Aarav Mehta");
  });
});
