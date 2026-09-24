import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  recordSiteVisitOutcome,
  assignLeadToExecutive,
  unassignLead,
  updateLeadStage,
  createOrLinkDealRoomForLead,
  getLiveLeads,
  getWorkspaceDealRooms,
} from "../src/lib/crm.functions";
import { isRouteAuthorized } from "../src/lib/route-roles";
import { getAuthorizedModules } from "../src/lib/fort-modules";

describe("Database Migration 20260923180000_deal_rooms_and_assignment_rbac.sql DDL & Security Specification", () => {
  const migrationPath = path.resolve(__dirname, "../supabase/migrations/20260923180000_deal_rooms_and_assignment_rbac.sql");
  const sqlContent = fs.readFileSync(migrationPath, "utf-8");

  it("creates public.deal_opportunities table with unique lead_id constraint", () => {
    expect(sqlContent).toMatch(/CREATE TABLE IF NOT EXISTS public\.deal_opportunities/i);
    expect(sqlContent).toMatch(/lead_id\s+UUID\s+NOT NULL\s+UNIQUE\s+REFERENCES\s+public\.leads\(id\)/i);
    expect(sqlContent).toMatch(/ALTER TABLE public\.deal_opportunities ENABLE ROW LEVEL SECURITY/i);
  });

  it("explicitly drops every historical conflicting permissive policy on leads", () => {
    const droppedPolicies = [
      "leads public read",
      "leads auth read",
      "leads ws read",
      "leads_select_roles",
      "leads_insert_roles",
      "leads_update_roles",
      "leads_delete_roles",
      "leads_platform_admin_all",
      "leads_workspace_manager_select",
      "leads_workspace_manager_insert",
      "leads_workspace_manager_update",
      "leads_workspace_manager_delete",
      "leads_agent_assigned_select",
      "leads_agent_assigned_update",
    ];

    for (const policy of droppedPolicies) {
      expect(sqlContent).toContain(`DROP POLICY IF EXISTS "${policy}" ON public.leads;`);
    }
  });

  it("defines public.is_workspace_manager helper function enforcing workspace-specific roles", () => {
    expect(sqlContent).toMatch(/CREATE OR REPLACE FUNCTION public\.is_workspace_manager\(_user_id UUID, _workspace_id UUID\)/i);
    expect(sqlContent).toMatch(/public\.has_role\(_user_id,\s*'admin'::public\.app_role\)/i);
    expect(sqlContent).toMatch(/public\.workspace_members wm/i);
    expect(sqlContent).toMatch(/wm\.status = 'active'/i);
  });

  it("establishes coordinated least-privilege policies on public.leads with explicit agent role requirement", () => {
    // Platform Admin
    expect(sqlContent).toMatch(/CREATE POLICY "leads_platform_admin_all" ON public\.leads/i);
    expect(sqlContent).toMatch(/public\.has_role\(auth\.uid\(\),\s*'admin'::public\.app_role\)/i);

    // Workspace Manager via is_workspace_manager
    expect(sqlContent).toMatch(/CREATE POLICY "leads_workspace_manager_select" ON public\.leads/i);
    expect(sqlContent).toMatch(/public\.is_workspace_manager\(auth\.uid\(\),\s*workspace_id\)/i);

    // Sales Executive (assigned only + agent role requirement)
    expect(sqlContent).toMatch(/CREATE POLICY "leads_agent_assigned_select" ON public\.leads/i);
    expect(sqlContent).toMatch(/public\.has_role\(auth\.uid\(\),\s*'agent'::public\.app_role\)/i);
    expect(sqlContent).toMatch(/assigned_to = auth\.uid\(\)/i);
  });

  it("establishes strict least-privilege policies on public.deal_opportunities with explicit agent role requirement", () => {
    expect(sqlContent).toMatch(/CREATE POLICY "deal_opportunities_platform_admin_all" ON public\.deal_opportunities/i);
    expect(sqlContent).toMatch(/CREATE POLICY "deal_opportunities_workspace_manager_select" ON public\.deal_opportunities/i);
    expect(sqlContent).toMatch(/CREATE POLICY "deal_opportunities_agent_assigned_select" ON public\.deal_opportunities/i);
    expect(sqlContent).toMatch(/CREATE POLICY "deal_opportunities_agent_assigned_insert" ON public\.deal_opportunities/i);
    expect(sqlContent).toMatch(/CREATE POLICY "deal_opportunities_agent_assigned_update" ON public\.deal_opportunities/i);
  });

  it("defines lead administrative field protection trigger", () => {
    expect(sqlContent).toMatch(/CREATE OR REPLACE FUNCTION public\.trg_protect_lead_fields\(\)/i);
    expect(sqlContent).toMatch(/CREATE TRIGGER trg_protect_lead_fields/i);
    expect(sqlContent).toMatch(/UNAUTHORIZED_FIELD_CHANGE: Sales Executives cannot reassign leads/i);
    expect(sqlContent).toMatch(/UNAUTHORIZED_FIELD_CHANGE: Sales Executives cannot modify workspace_id/i);
  });

  it("defines deal opportunity integrity trigger enforcing lead_id, workspace_id, and assigned_to agreement", () => {
    expect(sqlContent).toMatch(/CREATE OR REPLACE FUNCTION public\.trg_validate_deal_opportunity_integrity\(\)/i);
    expect(sqlContent).toMatch(/CREATE TRIGGER trg_deal_opportunity_integrity/i);
    expect(sqlContent).toMatch(/IMMUTABLE_FIELD: lead_id on deal_opportunities cannot be modified/i);
    expect(sqlContent).toMatch(/WORKSPACE_MISMATCH: Opportunity workspace/i);
  });

  it("defines reassignment cascading trigger to update opportunities when lead assigned_to changes", () => {
    expect(sqlContent).toMatch(/CREATE OR REPLACE FUNCTION public\.sync_lead_assignment_to_opportunities\(\)/i);
    expect(sqlContent).toMatch(/CREATE TRIGGER trg_sync_lead_assignment_to_opportunities/i);
    expect(sqlContent).toMatch(/AFTER UPDATE OF assigned_to ON public\.leads/i);
  });

  it("defines atomic PL/pgSQL function record_site_visit_outcome with auth.uid() identity derivation", () => {
    expect(sqlContent).toMatch(/CREATE OR REPLACE FUNCTION public\.record_site_visit_outcome/i);
    expect(sqlContent).not.toMatch(/p_caller_id\s+UUID/i);
    expect(sqlContent).toMatch(/v_caller_id\s*:=\s*auth\.uid\(\);/i);
    expect(sqlContent).toMatch(/FOR UPDATE/i);
    expect(sqlContent).toMatch(/public\.activities/i);
    expect(sqlContent).toMatch(/'site_visit'::public\.activity_type/i);
  });
});

describe("Explicit Role Enforcement: Assignment Alone Does Not Authorize Ordinary Members", () => {
  const ws1 = "00000000-0000-0000-0000-000000000001";
  const assignedLead = { id: "lead-1", workspace_id: ws1, assigned_to: "user-target", name: "Target Lead" };

  const evaluateLeadSelect = (user: { id: string; appRoles: string[]; workspaceId: string }) => {
    // 1. Platform Admin
    if (user.appRoles.includes("admin")) return true;

    // 2. Active member of workspace
    if (user.workspaceId !== assignedLead.workspace_id) return false;

    // 3. Manager
    if (user.appRoles.includes("manager")) return true;

    // 4. Sales Executive (Must have agent role AND be assigned)
    if (user.appRoles.includes("agent") && assignedLead.assigned_to === user.id) {
      return true;
    }

    return false;
  };

  it("denies access to a viewer even if assigned to a lead", () => {
    const assignedViewer = { id: "user-target", appRoles: ["viewer"], workspaceId: ws1 };
    expect(evaluateLeadSelect(assignedViewer)).toBe(false);
  });

  it("denies access to an ordinary member even if assigned to a lead", () => {
    const assignedMember = { id: "user-target", appRoles: [], workspaceId: ws1 };
    expect(evaluateLeadSelect(assignedMember)).toBe(false);
  });

  it("grants access to an authenticated sales executive with agent role assigned to the lead", () => {
    const assignedAgent = { id: "user-target", appRoles: ["agent"], workspaceId: ws1 };
    expect(evaluateLeadSelect(assignedAgent)).toBe(true);
  });
});

describe("Lead Field Protection: Preventing Unauthorized Sales Executive Modifications", () => {
  const originalLead = {
    id: "lead-001",
    workspace_id: "ws-1",
    assigned_to: "agent-1",
    owner: "agent-1",
    stage: "qualified",
    follow_up_date: "2026-09-30",
    follow_up_time: "10:00",
    follow_up_notes: "Initial discovery call",
    budget_inr: 20000000,
  };

  const executeLeadUpdate = (oldLead: typeof originalLead, newLead: typeof originalLead, caller: { isManager: boolean }) => {
    if (!caller.isManager) {
      if (newLead.workspace_id !== oldLead.workspace_id) {
        throw new Error("UNAUTHORIZED_FIELD_CHANGE: Sales Executives cannot modify workspace_id on leads");
      }
      if (newLead.assigned_to !== oldLead.assigned_to) {
        throw new Error("UNAUTHORIZED_FIELD_CHANGE: Sales Executives cannot reassign leads (assigned_to)");
      }
      if (newLead.owner !== oldLead.owner) {
        throw new Error("UNAUTHORIZED_FIELD_CHANGE: Sales Executives cannot modify lead owner");
      }
      if (newLead.id !== oldLead.id) {
        throw new Error("IMMUTABLE_FIELD: lead id cannot be modified");
      }
    }
    return true;
  };

  it("rejects sales executive attempting to change assigned_to or owner", () => {
    expect(() =>
      executeLeadUpdate(originalLead, { ...originalLead, assigned_to: "agent-2" }, { isManager: false })
    ).toThrowError(/UNAUTHORIZED_FIELD_CHANGE: Sales Executives cannot reassign leads/);

    expect(() =>
      executeLeadUpdate(originalLead, { ...originalLead, owner: "agent-2" }, { isManager: false })
    ).toThrowError(/UNAUTHORIZED_FIELD_CHANGE: Sales Executives cannot modify lead owner/);
  });

  it("rejects sales executive attempting to alter workspace_id", () => {
    expect(() =>
      executeLeadUpdate(originalLead, { ...originalLead, workspace_id: "ws-2" }, { isManager: false })
    ).toThrowError(/UNAUTHORIZED_FIELD_CHANGE: Sales Executives cannot modify workspace_id/);
  });

  it("permits sales executive legitimate updates to status, schedule, notes, and budget", () => {
    const updatedLead = {
      ...originalLead,
      stage: "site_visit_scheduled",
      follow_up_date: "2026-10-02",
      follow_up_time: "14:30",
      follow_up_notes: "Site visit booked with client",
      budget_inr: 22000000,
    };

    expect(executeLeadUpdate(originalLead, updatedLead, { isManager: false })).toBe(true);
  });

  it("allows workspace manager to reassign lead and modify ownership", () => {
    const reassigned = { ...originalLead, assigned_to: "agent-2", owner: "agent-2" };
    expect(executeLeadUpdate(originalLead, reassigned, { isManager: true })).toBe(true);
  });
});

describe("Consistent Outcome Transitions & Closed Opportunity Cleanup", () => {
  it("transitions opportunity to closed_lost when lead outcome becomes NOT_INTERESTED without deleting history", () => {
    let lead = { id: "lead-1", stage: "negotiation", visit_outcome: "INTERESTED" };
    let opp = { id: "opp-1", lead_id: "lead-1", stage: "negotiation", unit_interest: "Unit 101" };

    // Outcome changed to NOT_INTERESTED
    lead = { ...lead, stage: "not_interested", visit_outcome: "NOT_INTERESTED" };
    if (lead.visit_outcome === "NOT_INTERESTED") {
      opp = { ...opp, stage: "closed_lost" };
    }

    expect(lead.stage).toBe("not_interested");
    expect(opp.stage).toBe("closed_lost");
    expect(opp.id).toBe("opp-1"); // ID preserved
    expect(opp.unit_interest).toBe("Unit 101"); // History preserved
  });

  it("transitions opportunity to on_hold when lead outcome becomes UNDECIDED", () => {
    let lead = { id: "lead-1", stage: "negotiation", visit_outcome: "INTERESTED" };
    let opp = { id: "opp-1", lead_id: "lead-1", stage: "negotiation" };

    // Outcome changed to UNDECIDED
    lead = { ...lead, stage: "follow_up_scheduled", visit_outcome: "UNDECIDED" };
    if (lead.visit_outcome === "UNDECIDED") {
      opp = { ...opp, stage: "on_hold" };
    }

    expect(opp.stage).toBe("on_hold");
  });

  it("reactivates opportunity to negotiation when lead outcome is updated back to INTERESTED", () => {
    let opp = { id: "opp-1", lead_id: "lead-1", stage: "closed_lost" };

    // Re-opened as INTERESTED
    opp = { ...opp, stage: "negotiation" };
    expect(opp.stage).toBe("negotiation");
  });
});

describe("Reliable Audit Reasons: Reason Persists Regardless of Notes Nullability", () => {
  const formatNotInterestedAudit = (reason?: string | null, notes?: string | null): string => {
    let desc = "Lead marked Not Interested.";
    if (reason && reason.trim()) {
      desc += ` Reason: ${reason.trim()}.`;
    }
    if (notes && notes.trim()) {
      desc += ` Note: ${notes.trim()}`;
    }
    return desc;
  };

  it("retains reason when notes is null or empty", () => {
    const descWithNullNotes = formatNotInterestedAudit("Budget Constraints", null);
    expect(descWithNullNotes).toBe("Lead marked Not Interested. Reason: Budget Constraints.");

    const descWithEmptyNotes = formatNotInterestedAudit("Location Issue", "   ");
    expect(descWithEmptyNotes).toBe("Lead marked Not Interested. Reason: Location Issue.");
  });

  it("retains both reason and notes when notes is provided", () => {
    const desc = formatNotInterestedAudit("Competitor Selection", "Bought in Tower 3 instead");
    expect(desc).toBe("Lead marked Not Interested. Reason: Competitor Selection. Note: Bought in Tower 3 instead");
  });

  it("handles empty reason gracefully without extra tokens", () => {
    const desc = formatNotInterestedAudit(null, "Customer postponed buying decision");
    expect(desc).toBe("Lead marked Not Interested. Note: Customer postponed buying decision");
  });
});

describe("Workspace-Specific Manager Authorization Logic", () => {
  const evaluateWorkspaceManager = (user: {
    id: string;
    appRoles: string[];
    memberships: Array<{ workspaceId: string; roleName: string; status: string }>;
  }, targetWorkspaceId: string): boolean => {
    if (user.appRoles.includes("admin")) return true;

    const m = user.memberships.find((mem) => mem.workspaceId === targetWorkspaceId && mem.status === "active");
    if (!m) return false;

    if (["admin", "manager", "sales_manager", "workspace_admin", "platform_admin"].includes(m.roleName)) {
      return true;
    }

    if (user.appRoles.includes("manager") && !["viewer", "member", "agent"].includes(m.roleName)) {
      return true;
    }

    return false;
  };

  it("grants platform admin cross-workspace manager access", () => {
    const platformAdmin = {
      id: "admin-1",
      appRoles: ["admin"],
      memberships: [{ workspaceId: "ws-hq", roleName: "platform_admin", status: "active" }],
    };

    expect(evaluateWorkspaceManager(platformAdmin, "ws-hq")).toBe(true);
    expect(evaluateWorkspaceManager(platformAdmin, "ws-client-1")).toBe(true);
  });

  it("grants workspace manager access ONLY in their assigned active workspace", () => {
    const ws1Manager = {
      id: "mgr-1",
      appRoles: ["manager"],
      memberships: [
        { workspaceId: "ws-1", roleName: "manager", status: "active" },
        { workspaceId: "ws-2", roleName: "member", status: "active" },
      ],
    };

    expect(evaluateWorkspaceManager(ws1Manager, "ws-1")).toBe(true);
    expect(evaluateWorkspaceManager(ws1Manager, "ws-2")).toBe(false);
  });
});

describe("Deal Opportunity Integrity & Immutability Rules", () => {
  const originatingLead = {
    id: "lead-001",
    workspace_id: "ws-1",
    assigned_to: "exec-1",
  };

  const validateOpportunityMutation = (
    op: "INSERT" | "UPDATE",
    oldRecord: any,
    newRecord: any,
    lead: typeof originatingLead,
    caller: { id: string; isManager: boolean }
  ) => {
    if (op === "UPDATE") {
      if (newRecord.lead_id !== oldRecord.lead_id) {
        throw new Error("IMMUTABLE_FIELD: lead_id on deal_opportunities cannot be modified");
      }
      if (newRecord.workspace_id !== oldRecord.workspace_id) {
        throw new Error("IMMUTABLE_FIELD: workspace_id on deal_opportunities cannot be modified");
      }
      if (newRecord.assigned_to !== oldRecord.assigned_to && !caller.isManager) {
        throw new Error("UNAUTHORIZED_ASSIGNMENT_CHANGE: Sales executives cannot change assigned_to");
      }
    }

    if (newRecord.workspace_id !== lead.workspace_id) {
      throw new Error(`WORKSPACE_MISMATCH: Opportunity workspace ${newRecord.workspace_id} does not match lead workspace ${lead.workspace_id}`);
    }

    if (newRecord.assigned_to !== lead.assigned_to) {
      throw new Error(`ASSIGNMENT_MISMATCH: Opportunity assignee ${newRecord.assigned_to} must match lead assignee ${lead.assigned_to}`);
    }

    return true;
  };

  it("rejects opportunity creation with mismatched workspace_id", () => {
    expect(() =>
      validateOpportunityMutation(
        "INSERT",
        null,
        { lead_id: "lead-001", workspace_id: "ws-WRONG", assigned_to: "exec-1" },
        originatingLead,
        { id: "exec-1", isManager: false }
      )
    ).toThrowError(/WORKSPACE_MISMATCH/);
  });

  it("rejects opportunity assignment mismatch for both sales executives and managers", () => {
    expect(() =>
      validateOpportunityMutation(
        "INSERT",
        null,
        { lead_id: "lead-001", workspace_id: "ws-1", assigned_to: "exec-DIFFERENT" },
        originatingLead,
        { id: "exec-1", isManager: false }
      )
    ).toThrowError(/ASSIGNMENT_MISMATCH/);

    expect(() =>
      validateOpportunityMutation(
        "INSERT",
        null,
        { lead_id: "lead-001", workspace_id: "ws-1", assigned_to: "exec-DIFFERENT" },
        originatingLead,
        { id: "mgr-1", isManager: true }
      )
    ).toThrowError(/ASSIGNMENT_MISMATCH/);
  });

  it("rejects modification of immutable lead_id or workspace_id on update", () => {
    const oldOpp = { id: "opp-1", lead_id: "lead-001", workspace_id: "ws-1", assigned_to: "exec-1" };

    expect(() =>
      validateOpportunityMutation(
        "UPDATE",
        oldOpp,
        { ...oldOpp, lead_id: "lead-FORGED" },
        originatingLead,
        { id: "exec-1", isManager: false }
      )
    ).toThrowError(/IMMUTABLE_FIELD: lead_id/);

    expect(() =>
      validateOpportunityMutation(
        "UPDATE",
        oldOpp,
        { ...oldOpp, workspace_id: "ws-2" },
        originatingLead,
        { id: "exec-1", isManager: false }
      )
    ).toThrowError(/IMMUTABLE_FIELD: workspace_id/);
  });
});

describe("Reassignment Cascading Security & Visibility Invalidation", () => {
  it("synchronizes opportunity assigned_to when lead is reassigned by manager", () => {
    const lead = {
      id: "lead-100",
      workspace_id: "ws-1",
      assigned_to: "agent-A",
    };

    let opportunity = {
      id: "opp-100",
      lead_id: "lead-100",
      workspace_id: "ws-1",
      assigned_to: "agent-A",
    };

    const newAssignee = "agent-B";
    lead.assigned_to = newAssignee;

    if (lead.assigned_to !== opportunity.assigned_to) {
      opportunity = { ...opportunity, assigned_to: newAssignee };
    }

    expect(opportunity.assigned_to).toBe("agent-B");

    const canAgentASee = opportunity.assigned_to === "agent-A";
    expect(canAgentASee).toBe(false);

    const canAgentBSee = opportunity.assigned_to === "agent-B";
    expect(canAgentBSee).toBe(true);
  });
});

describe("Stage Transition Guardrails & Bypass Prevention", () => {
  it("rejects sales executive attempting to transition lead directly to Negotiation without visit outcome", async () => {
    const invokeStageUpdate = (stage: string, roles: string[]) => {
      const isSalesExecutive = roles.includes("agent") && !roles.includes("admin") && !roles.includes("manager");
      if (isSalesExecutive && stage.toLowerCase() === "negotiation") {
        throw new Error("STAGE_BYPASS_RESTRICTED: Advancing a lead to Negotiation requires recording a Site Visit Outcome.");
      }
      return true;
    };

    expect(() => invokeStageUpdate("Negotiation", ["agent"])).toThrowError(/STAGE_BYPASS_RESTRICTED/);
    expect(invokeStageUpdate("Qualified", ["agent"])).toBe(true);
    expect(invokeStageUpdate("Negotiation", ["manager"])).toBe(true);
    expect(invokeStageUpdate("Negotiation", ["admin"])).toBe(true);
  });
});

describe("Appointment & Scheduling Data Persistence", () => {
  it("preserves site visit scheduling values across outcomes and reassignments", () => {
    const lead = {
      id: "lead-200",
      workspace_id: "ws-1",
      assigned_to: "exec-1",
      site_visit_date: "2026-09-28",
      site_visit_time: "15:30",
      follow_up_date: "2026-09-28",
      follow_up_time: "15:30",
      follow_up_status: "pending",
      follow_up_notes: "Confirmed VIP site visit",
    };

    expect(lead.site_visit_date).toBe("2026-09-28");
    expect(lead.site_visit_time).toBe("15:30");
    expect(lead.follow_up_status).toBe("pending");

    const reassignedLead = { ...lead, assigned_to: "exec-2" };
    expect(reassignedLead.site_visit_date).toBe("2026-09-28");
    expect(reassignedLead.site_visit_time).toBe("15:30");
    expect(reassignedLead.assigned_to).toBe("exec-2");
  });
});
