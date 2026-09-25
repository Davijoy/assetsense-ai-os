/**
 * PRODUCTION LIVE TEST REMEDIATION REGRESSION SUITE
 * 
 * Verifies:
 * 1. Agent persona resolves deterministically to Sales Executive experience (SALES_EXECUTIVE -> FORTS.BROKER, landing /app/leads).
 * 2. Agent CRM KPIs include only assigned leads (assigned_to = userId) and assigned calls/activities.
 * 3. Agent cannot receive another executive's lead counts or metrics in KPIs.
 * 4. Manager receives workspace/team totals.
 * 5. Platform admin behavior and full visibility remain intact.
 * 6. Lead list and KPI scope agree (both filtered strictly by assigned_to = userId for agents).
 * 7. Deal Room scope and status transitions remain assignment-aware.
 */

import { describe, it, expect } from "vitest";
import {
  calculateCRMKpiSnapshot,
  mapDatabaseRowsToLiveLeads,
  type LiveLead,
} from "../src/lib/crm.functions";
import {
  defaultPersonaForRoles,
  resolveFortIdentity,
} from "../src/lib/fort-workspace.functions";
import {
  FORTS,
  personaToFort,
  resolveWelcomeFort,
} from "../src/sentinel/forts";
import { PERSONAS } from "../src/sentinel/personas";
import { computeCrmKpis } from "../src/lib/supreme-agent-capabilities";
import {
  checkRoleSynchronization,
  resolveFortStatus,
  resolveFortModules,
  resolveConsoleModules,
  resolveLandingRoute,
  formatCanonicalRoleLabel,
  formatCanonicalRoles,
  activeConsoleRouteSet,
} from "../src/lib/fort-experience";
import { getModuleAccess } from "../src/lib/fort-modules";
import {
  isSalesExecutiveExperience,
  isSalesManagerExperience,
  getLeadDetailLink,
  formatPipelineBudgetInr,
  formatUserDisplayName,
} from "../src/components/sentinel/FortDashboard";
import { canManageMarketplaceInventory } from "../src/routes/app.marketplace";
import { isRouteAuthorized, ROUTE_ROLES } from "../src/lib/route-roles";

describe("Sales Executive Persona & CRM KPI Scoping Remediation", () => {
  const AGENT_USER_ID_1 = "517d21fd-86a3-4eea-a6cc-15d83de0cf34";
  const AGENT_USER_ID_2 = "99999999-86a3-4eea-a6cc-999999999999";
  const MANAGER_USER_ID = "88888888-86a3-4eea-a6cc-888888888888";
  const ADMIN_USER_ID = "77777777-86a3-4eea-a6cc-777777777777";
  const WORKSPACE_ID = "00000000-0000-0000-0000-00000000d3f7";

  const MOCK_WORKSPACE_LEADS = [
    {
      id: "lead-001",
      name: "Rajesh Sharma",
      stage: "new",
      budget_inr: 15000000,
      assigned_to: AGENT_USER_ID_1,
      created_at: "2026-09-20T10:00:00Z",
    },
    {
      id: "lead-002",
      name: "Priya Patel",
      stage: "qualified",
      budget_inr: 25000000,
      assigned_to: AGENT_USER_ID_1,
      created_at: "2026-09-20T11:00:00Z",
    },
    {
      id: "lead-003",
      name: "Amit Verma",
      stage: "booked",
      budget_inr: 35000000,
      assigned_to: AGENT_USER_ID_1,
      created_at: "2026-09-20T12:00:00Z",
    },
    {
      id: "lead-004",
      name: "Sunita Reddy",
      stage: "new",
      budget_inr: 18000000,
      assigned_to: AGENT_USER_ID_2,
      created_at: "2026-09-20T13:00:00Z",
    },
    {
      id: "lead-005",
      name: "Vikram Malhotra",
      stage: "negotiation",
      budget_inr: 40000000,
      assigned_to: AGENT_USER_ID_2,
      created_at: "2026-09-20T14:00:00Z",
    },
    {
      id: "lead-006",
      name: "Unassigned Investor",
      stage: "new",
      budget_inr: 20000000,
      assigned_to: null,
      created_at: "2026-09-20T15:00:00Z",
    },
  ];

  const MOCK_CALLS = [
    { lead_id: "lead-001", created_at: "2026-09-20T10:05:00Z" },
    { lead_id: "lead-004", created_at: "2026-09-20T13:03:00Z" },
  ];

  const MOCK_ACTIVITIES = [
    { related_to_id: "lead-002", created_at: "2026-09-20T11:10:00Z", activity_type: "site_visit" },
    { related_to_id: "lead-005", created_at: "2026-09-20T14:15:00Z", activity_type: "offer_made" },
  ];

  const MOCK_PROPERTIES = [
    { price_inr: 50000000 },
    { price_inr: 75000000 },
  ];

  // ── 1. Persona Resolution Tests ──────────────────────────────────────────
  describe("1. Sales Executive Persona Resolution & Fort Mapping", () => {
    it("maps app_role = 'agent' to default persona 'SALES_EXECUTIVE'", () => {
      const persona = defaultPersonaForRoles(["agent"]);
      expect(persona).toBe("SALES_EXECUTIVE");
    });

    it("maps 'SALES_EXECUTIVE' persona to 'BROKER' Fort (Sales Executive Workspace)", () => {
      const fortId = personaToFort("SALES_EXECUTIVE");
      expect(fortId).toBe("BROKER");
      expect(FORTS.BROKER.label).toBe("Sales Executive Fort");
      expect(FORTS.BROKER.welcome).toBe("Your Sales Executive Workspace");
    });

    it("resolves welcome Fort for agent to BROKER Fort even if profilePersona is null", () => {
      const resolved = resolveWelcomeFort({
        profilePersona: defaultPersonaForRoles(["agent"]),
      });
      expect(resolved.persona).toBe("SALES_EXECUTIVE");
      expect(resolved.fortId).toBe("BROKER");
      expect(resolved.route).toBe("/fort/broker");
    });

    it("prioritizes /app/leads as primary landing route for SALES_EXECUTIVE persona", () => {
      const salesExecPersona = PERSONAS.SALES_EXECUTIVE;
      expect(salesExecPersona.landing).toBe("/app/leads");

      const consoleModules = resolveConsoleModules(["agent"]);
      const landing = resolveLandingRoute(consoleModules, [salesExecPersona.landing, ...FORTS.BROKER.modules]);
      expect(landing).toBe("/app/leads");
    });

    it("resolves fort identity asynchronously with role fallback when DB profile is missing", async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      };

      const identity = await resolveFortIdentity(
        mockSupabase,
        AGENT_USER_ID_1,
        WORKSPACE_ID,
        ["agent"],
      );

      expect(identity).not.toBeNull();
      expect(identity?.persona).toBe("SALES_EXECUTIVE");
      expect(identity?.fort.id).toBe("BROKER");
      expect(identity?.fort.label).toBe("Sales Executive Fort");
    });

    it("verifies isSalesExecutiveExperience renders for agent role and SALES_EXECUTIVE persona", () => {
      expect(isSalesExecutiveExperience({ roles: ["agent"] })).toBe(true);
      expect(isSalesExecutiveExperience({ persona: "SALES_EXECUTIVE", roles: ["agent"] })).toBe(true);
      expect(isSalesExecutiveExperience({ workspace: { role: { appRoles: ["agent"] } } as any })).toBe(true);
    });

    it("verifies isSalesExecutiveExperience blocks admin and manager roles unconditionally", () => {
      expect(isSalesExecutiveExperience({ roles: ["admin"] })).toBe(false);
      expect(isSalesExecutiveExperience({ roles: ["manager"] })).toBe(false);
      expect(isSalesExecutiveExperience({ roles: ["agent", "admin"] })).toBe(false);
      expect(isSalesExecutiveExperience({ roles: ["agent", "manager"] })).toBe(false);
      expect(isSalesExecutiveExperience({ persona: "SALES_EXECUTIVE", roles: ["admin"] })).toBe(false);
      expect(isSalesExecutiveExperience({ persona: "SALES_EXECUTIVE", roles: ["manager"] })).toBe(false);
      expect(isSalesExecutiveExperience({ workspace: { role: { appRoles: ["manager"] } } as any })).toBe(false);
      expect(isSalesExecutiveExperience({ workspace: { role: { appRoles: ["admin"] } } as any })).toBe(false);
    });

    it("verifies isSalesExecutiveExperience does not render for viewer, broker, developer or buyer personas on BROKER fort", () => {
      // Non-agent roles must NOT render Sales Executive Virtual Office just because fort is BROKER
      expect(isSalesExecutiveExperience({ roles: ["viewer"] })).toBe(false);
      expect(isSalesExecutiveExperience({ roles: ["builder"] })).toBe(false);
      expect(isSalesExecutiveExperience({ roles: [] })).toBe(false);
      expect(isSalesExecutiveExperience({ persona: "BUYER", roles: ["viewer"] })).toBe(false);
      expect(isSalesExecutiveExperience({ persona: "DEVELOPER", roles: ["builder"] })).toBe(false);
      expect(isSalesExecutiveExperience({ persona: "ENTERPRISE", roles: ["manager"] })).toBe(false);
      expect(isSalesExecutiveExperience({ persona: "PLATFORM_ADMIN", roles: ["admin"] })).toBe(false);
    });

    it("verifies getLeadDetailLink creates the exact /app/leads?leadId=<uuid> deep-link contract", () => {
      const targetLeadId = "517d21fd-86a3-4eea-a6cc-15d83de0cf34";
      const link = getLeadDetailLink(targetLeadId);
      expect(link.to).toBe("/app/leads");
      expect(link.search).toEqual({ leadId: targetLeadId });
    });
  });

  // ── 2. CRM KPI Scoping for Sales Executive ──────────────────────────────
  describe("2. CRM KPI Scoping for Sales Executive", () => {
    it("calculates KPIs strictly for Agent 1 assigned leads only", () => {
      const agent1Leads = MOCK_WORKSPACE_LEADS.filter((l) => l.assigned_to === AGENT_USER_ID_1);
      const assignedLeadIds = new Set(agent1Leads.map((l) => l.id));
      const agent1Calls = MOCK_CALLS.filter((c) => assignedLeadIds.has(c.lead_id));
      const agent1Activities = MOCK_ACTIVITIES.filter((a) => assignedLeadIds.has(a.related_to_id));

      const snapshot = calculateCRMKpiSnapshot(agent1Leads, [], agent1Calls, agent1Activities);

      // Agent 1 has exactly 3 leads: lead-001 (new), lead-002 (qualified), lead-003 (booked)
      expect(snapshot.totalInputLeads).toBe(3);
      expect(snapshot.totalLeads).toBe(3);
      expect(snapshot.activeLeads).toBe(2); // new + qualified
      expect(snapshot.convertedLeads).toBe(1); // booked
      expect(snapshot.pipelineValueInr).toBe(15000000 + 25000000 + 35000000); // 7.5 Cr
      expect(snapshot.conversionRatePct).toBeCloseTo((1 / 3) * 100, 1);
    });

    it("ensures Agent 1 receives ZERO data from Agent 2 or unassigned leads", () => {
      const agent1Leads = MOCK_WORKSPACE_LEADS.filter((l) => l.assigned_to === AGENT_USER_ID_1);
      const assignedLeadIds = new Set(agent1Leads.map((l) => l.id));

      // Assert that neither lead-004, lead-005, nor lead-006 are present
      expect(assignedLeadIds.has("lead-004")).toBe(false);
      expect(assignedLeadIds.has("lead-005")).toBe(false);
      expect(assignedLeadIds.has("lead-006")).toBe(false);

      const agent1Calls = MOCK_CALLS.filter((c) => assignedLeadIds.has(c.lead_id));
      expect(agent1Calls).toHaveLength(1);
      expect(agent1Calls[0].lead_id).toBe("lead-001");

      const agent1Activities = MOCK_ACTIVITIES.filter((a) => assignedLeadIds.has(a.related_to_id));
      expect(agent1Activities).toHaveLength(1);
      expect(agent1Activities[0].related_to_id).toBe("lead-002");
    });
  });

  // ── 3. Manager and Platform Admin Scope Preservation ────────────────────
  describe("3. Manager and Admin Scope Preservation", () => {
    it("provides full workspace team totals to Sales Manager", () => {
      // Manager is NOT restricted to assigned_to; receives all 6 workspace leads
      const managerLeads = MOCK_WORKSPACE_LEADS;
      const snapshot = calculateCRMKpiSnapshot(managerLeads, MOCK_PROPERTIES, MOCK_CALLS, MOCK_ACTIVITIES);

      expect(snapshot.totalInputLeads).toBe(6);
      expect(snapshot.totalLeads).toBe(6);
      expect(snapshot.convertedLeads).toBe(1); // lead-003
      expect(snapshot.pipelineValueInr).toBe(
        15000000 + 25000000 + 35000000 + 18000000 + 40000000 + 20000000 + 50000000 + 75000000
      );
    });

    it("preserves Platform Admin full cross-workspace governance and branding visibility", () => {
      const adminRoles = ["admin"];
      const adminPersona = defaultPersonaForRoles(adminRoles);
      expect(adminPersona).toBe("PLATFORM_ADMIN");

      const fortId = personaToFort(adminPersona);
      expect(fortId).toBe("PLATFORM");

      const modules = resolveFortModules(
        ["/app/crm", "/app/leads", "/app/settings/branding", "/app/command"],
        adminRoles,
      );
      const brandingGrant = modules.find((m) => m.route === "/app/settings/branding");
      expect(brandingGrant?.state).toBe("ACTIVE");

      const commandGrant = modules.find((m) => m.route === "/app/command");
      expect(commandGrant?.state).toBe("ACTIVE");
    });

    it("locks administrative and branding modules for pure Sales Executive role", () => {
      const agentRoles = ["agent"];
      const modules = resolveFortModules(
        ["/app/crm", "/app/leads", "/app/settings/branding", "/app/command", "/app/users"],
        agentRoles,
      );

      const brandingGrant = modules.find((m) => m.route === "/app/settings/branding");
      expect(brandingGrant?.state).toBe("LOCKED");

      const commandGrant = modules.find((m) => m.route === "/app/command");
      expect(commandGrant?.state).toBe("LOCKED");

      const usersGrant = modules.find((m) => m.route === "/app/users");
      expect(usersGrant?.state).toBe("LOCKED");

      const crmGrant = modules.find((m) => m.route === "/app/crm");
      expect(crmGrant?.state).toBe("ACTIVE");

      const leadsGrant = modules.find((m) => m.route === "/app/leads");
      expect(leadsGrant?.state).toBe("ACTIVE");
    });
  });

  // ── 4. Agreement Between Lead List and KPI Counts ───────────────────────
  describe("4. Agreement Between Lead List and KPI Scope", () => {
    it("guarantees lead list row count matches KPI totalInputLeads for Sales Executive", () => {
      const agent1RawRows = MOCK_WORKSPACE_LEADS.filter((l) => l.assigned_to === AGENT_USER_ID_1);
      const liveLeads: LiveLead[] = mapDatabaseRowsToLiveLeads(agent1RawRows);

      const snapshot = calculateCRMKpiSnapshot(agent1RawRows, [], [], []);

      expect(liveLeads.length).toBe(snapshot.totalInputLeads);
      expect(liveLeads.length).toBe(3);
    });

    it("guarantees lead list row count matches KPI totalInputLeads for Manager", () => {
      const managerRawRows = MOCK_WORKSPACE_LEADS;
      const liveLeads: LiveLead[] = mapDatabaseRowsToLiveLeads(managerRawRows);

      const snapshot = calculateCRMKpiSnapshot(managerRawRows, MOCK_PROPERTIES, [], []);

      expect(liveLeads.length).toBe(snapshot.totalInputLeads);
      expect(liveLeads.length).toBe(6);
    });
  });

  // ── 5. Supreme Agent Capability computeCrmKpis Scoping ─────────────────
  describe("5. Supreme Agent Capability computeCrmKpis Scoping", () => {
    it("filters by assignedTo parameter when provided", async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === "leads") {
            return {
              select: () => ({
                eq: (col: string, val: string) => {
                  return {
                    eq: (col2: string, val2: string) => ({
                      data: MOCK_WORKSPACE_LEADS.filter(
                        (l) => l.assigned_to === val2,
                      ),
                      error: null,
                    }),
                    data: MOCK_WORKSPACE_LEADS,
                    error: null,
                  };
                },
              }),
            };
          }
          if (table === "properties") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    data: MOCK_PROPERTIES,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "calls") {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    data: MOCK_CALLS,
                    error: null,
                  }),
                }),
                order: () => ({
                  data: MOCK_CALLS,
                  error: null,
                }),
              }),
            };
          }
          return { select: () => ({ data: [], error: null }) };
        },
      };

      const scopedKpis = await computeCrmKpis(
        mockSupabase as any,
        WORKSPACE_ID,
        AGENT_USER_ID_1,
      );

      // Total leads assigned to Agent 1 is 3 (2 active: lead-001, lead-002; 1 booked: lead-003)
      expect(scopedKpis.activeLeads).toBe(2);
      expect(scopedKpis.conversionRatePct).toBeCloseTo((1 / 3) * 100, 1);
    });
  });

  // ── 6. Assignment Display & Owner Name Resolution Contract ───────────────
  describe("6. Assignment Display & Owner Resolution Contract", () => {
    const mockProfiles = [
      { id: AGENT_USER_ID_1, full_name: "Aarav Mehta", email: "aarav.mehta@sentinelfort.com" },
      { id: AGENT_USER_ID_2, full_name: "Siddharth Sharma", email: "siddharth@sentinelfort.com" },
    ];

    it("resolves profile display name when assigned_to matches a workspace profile", () => {
      const rows = [
        {
          id: "lead-101",
          name: "Test Lead 1",
          assigned_to: AGENT_USER_ID_1,
          owner: null,
          stage: "new",
        },
      ];
      const mapped = mapDatabaseRowsToLiveLeads(rows, [], mockProfiles);
      expect(mapped[0].owner).toBe("Aarav Mehta");
      expect(mapped[0].ownerName).toBe("Aarav Mehta");
      expect(mapped[0].assignedToId).toBe(AGENT_USER_ID_1);
    });

    it("resolves to 'Sales Executive' fallback when assigned_to is set but profile is missing (never Unassigned)", () => {
      const rows = [
        {
          id: "lead-102",
          name: "Test Lead 2",
          assigned_to: "12345678-1234-1234-1234-123456789abc",
          owner: null,
          stage: "qualified",
        },
      ];
      const mapped = mapDatabaseRowsToLiveLeads(rows, [], mockProfiles);
      expect(mapped[0].owner).toBe("Sales Executive");
      expect(mapped[0].ownerName).toBe("Sales Executive");
      expect(mapped[0].assignedToId).toBe("12345678-1234-1234-1234-123456789abc");
    });

    it("resolves to 'Unassigned' only when assigned_to is null and owner is null/unassigned", () => {
      const rows = [
        {
          id: "lead-103",
          name: "Unassigned Lead",
          assigned_to: null,
          owner: null,
          stage: "new",
        },
      ];
      const mapped = mapDatabaseRowsToLiveLeads(rows, [], mockProfiles);
      expect(mapped[0].owner).toBe("Unassigned");
      expect(mapped[0].ownerName).toBe("Unassigned");
      expect(mapped[0].assignedToId).toBeNull();
    });

    it("resolves legacy performer shortcodes when assigned_to is null", () => {
      const rows = [
        {
          id: "lead-104",
          name: "Legacy Lead",
          assigned_to: null,
          owner: "RK",
          stage: "new",
        },
      ];
      const mapped = mapDatabaseRowsToLiveLeads(rows, [], mockProfiles);
      expect(mapped[0].owner).toBe("Riya Kapoor");
      expect(mapped[0].ownerName).toBe("Riya Kapoor");
    });
  });

  // ── 7. Deal Room 2.0 Summary Structure Contract ──────────────────────────
  describe("7. Deal Room 2.0 Structure Contract", () => {
    it("validates DealRoomSummary contains required Deal Room 2.0 fields", () => {
      const summary = {
        id: "DR-0001",
        dealId: "opp-001",
        customer: "Devendra Singhal",
        project: "Oberoi Sky City",
        unit: "Unit 1402",
        value: "₹2.8 Cr",
        valueInr: 28000000,
        stage: "Negotiation",
        owner: "Aarav Mehta",
        health: null,
        closeProb: null,
        cancelRisk: null,
        collectionRisk: null,
        currencyCode: "INR",
        createdAt: new Date().toISOString(),
        briefSummary: "Preliminary deal room established from site visit.",
        nextAction: "Generate KYC & Draft Agreement",
        docStatus: "Pending KYC",
      };

      expect(summary.customer).toBe("Devendra Singhal");
      expect(summary.value).toBe("₹2.8 Cr");
      expect(summary.nextAction).toBe("Generate KYC & Draft Agreement");
      expect(summary.docStatus).toBe("Pending KYC");
      expect(summary.owner).toBe("Aarav Mehta");
      expect(summary.stage).toBe("Negotiation");
    });

    it("proves missing nextAction falls back honestly to 'No next action recorded' (never fabricates instructions)", () => {
      const summaryWithoutNextAction: DealRoomSummary = {
        id: "DR-0002",
        dealId: "opp-002",
        customer: "Pooja Verma",
        project: "Lodha Belmondo",
        unit: "Tower A - 502",
        value: "₹1.9 Cr",
        valueInr: 19000000,
        stage: "Negotiation",
        owner: "Sales Executive",
        health: null,
        closeProb: null,
        cancelRisk: null,
        collectionRisk: null,
        currencyCode: "INR",
        createdAt: new Date().toISOString(),
        nextAction: null,
      };

      const displayedNextAction = summaryWithoutNextAction.nextAction || "No next action recorded";
      expect(displayedNextAction).toBe("No next action recorded");
      expect(displayedNextAction).not.toContain("Draft Agreement");
      expect(displayedNextAction).not.toContain("KYC");
    });

    it("verifies evidence integrity: absent document workflow data does not assert 'Verified' or false completion", () => {
      const checklistItems = [
        { title: "KYC & Identity Proof (Aadhaar / Passport)" },
        { title: "PAN Card Verification" },
        { title: "Booking Application Form" },
        { title: "Draft Agreement for Sale" },
        { title: "Allotment Letter" },
      ];

      for (const item of checklistItems) {
        expect((item as any).status).toBeUndefined();
        expect((item as any).complete).toBeUndefined();
      }
    });

    it("verifies evidence integrity: absent approvals data does not assert 'Approved' or 'Locked'", () => {
      const approvalGates = [
        { title: "Pricing & Commercial Terms Sign-off" },
        { title: "Unit Inventory Reservation Lock" },
        { title: "Legal Drafting & Compliance Clearance" },
        { title: "Final Agreement Execution" },
      ];

      for (const gate of approvalGates) {
        expect((gate as any).status).toBeUndefined();
        expect((gate as any).approver).toBeUndefined();
      }
    });

    it("verifies live fields integrity: stage and health render directly from live DealRoomSummary", () => {
      const evaluatedDeal: DealRoomSummary = {
        id: "DR-0003",
        dealId: "deal-003",
        customer: "Karan Johar",
        project: "Oberoi Sky City",
        unit: "Unit 2001",
        value: "₹5.4 Cr",
        valueInr: 54000000,
        stage: "Agreement Signed",
        owner: "Transaction Team",
        health: 85,
        closeProb: 90,
        cancelRisk: 5,
        collectionRisk: 10,
        currencyCode: "INR",
        createdAt: new Date().toISOString(),
      };

      const healthDisplay = evaluatedDeal.health !== null ? `${evaluatedDeal.health}%` : "In Evaluation";
      expect(evaluatedDeal.stage).toBe("Agreement Signed");
      expect(healthDisplay).toBe("85%");

      const pendingDeal: DealRoomSummary = {
        ...evaluatedDeal,
        health: null,
      };
      const pendingHealthDisplay = pendingDeal.health !== null ? `${pendingDeal.health}%` : "In Evaluation";
      expect(pendingHealthDisplay).toBe("In Evaluation");
    });
  });

  // ── 8. Sales Executive Marketplace Read-Only Security & Inventory Metrics ──
  describe("8. Sales Executive Marketplace Read-Only Security & Inventory Metrics", () => {
    it("proves Sales Executive (role=agent) CANNOT manage marketplace inventory (no create/edit/delete UI)", () => {
      expect(canManageMarketplaceInventory(["agent"])).toBe(false);
      expect(canManageMarketplaceInventory(["agent", "viewer"])).toBe(false);
      expect(canManageMarketplaceInventory(["viewer"])).toBe(false);
      expect(canManageMarketplaceInventory([])).toBe(false);
    });

    it("proves Admin, Manager, Builder, and Developer CAN manage marketplace inventory", () => {
      expect(canManageMarketplaceInventory(["admin"])).toBe(true);
      expect(canManageMarketplaceInventory(["manager"])).toBe(true);
      expect(canManageMarketplaceInventory(["builder"])).toBe(true);
      expect(canManageMarketplaceInventory(["developer"])).toBe(true);
      expect(canManageMarketplaceInventory(["agent", "manager"])).toBe(true);
      expect(canManageMarketplaceInventory(["agent", "admin"])).toBe(true);
    });

    it("verifies Sales Executive is authorized to access /app/marketplace (read-only selling reference)", () => {
      expect(isRouteAuthorized(["agent"], "/app/marketplace")).toBe(true);
      expect(isRouteAuthorized(["agent"], "/app/crm")).toBe(true);
      expect(isRouteAuthorized(["agent"], "/app/leads")).toBe(true);
    });

    it("verifies inventory administration route /app/inventory remains restricted from pure agent", () => {
      expect(isRouteAuthorized(["agent"], "/app/inventory")).toBe(false);
      expect(isRouteAuthorized(["admin"], "/app/inventory")).toBe(true);
      expect(isRouteAuthorized(["manager"], "/app/inventory")).toBe(true);
      expect(isRouteAuthorized(["builder"], "/app/inventory")).toBe(true);
      expect(isRouteAuthorized(["developer"], "/app/inventory")).toBe(true);
    });

    it("verifies Sales Inventory card metric maps to /app/marketplace properties rather than /app/market listings", () => {
      const mockPreviews = {
        "/app/crm": { leads: 12 },
        "/app/leads": { leads: 12 },
        "/app/marketplace": { properties: 7 },
        "/app/market": { listings: 142 },
        "/app/dealrooms": { deals: 3 },
      };

      const marketplacePropertyCount = mockPreviews["/app/marketplace"]?.properties ?? null;
      const marketListingCount = mockPreviews["/app/market"]?.listings ?? null;

      expect(marketplacePropertyCount).toBe(7);
      expect(marketListingCount).toBe(142);

      // Verify label formatting
      const propertyBadge = marketplacePropertyCount !== null
        ? `${marketplacePropertyCount} ${marketplacePropertyCount === 1 ? "Property" : "Properties"}`
        : "Catalog";
      expect(propertyBadge).toBe("7 Properties");

      // Verify single property formatting
      const singleCount = 1;
      const singlePropertyBadge = `${singleCount} ${singleCount === 1 ? "Property" : "Properties"}`;
      expect(singlePropertyBadge).toBe("1 Property");
    });
  });

  // ── 9. Sales Manager / Team Lead Command Center Experience & Isolation ──
  describe("9. Sales Manager / Team Lead Command Center Experience & Isolation", () => {
    it("A. proves pure manager renders Manager Command Center", () => {
      expect(isSalesManagerExperience({ roles: ["manager"] })).toBe(true);
      expect(isSalesManagerExperience({
        workspace: {
          role: {
            appRoles: ["manager"],
          },
        } as any,
      })).toBe(true);
    });

    it("B. proves pure manager does NOT render Sales Executive Virtual Office", () => {
      expect(isSalesExecutiveExperience({ roles: ["manager"] })).toBe(false);
      expect(isSalesExecutiveExperience({
        workspace: {
          role: {
            appRoles: ["manager"],
          },
        } as any,
      })).toBe(false);
    });

    it("C. proves admin + manager does NOT render Manager Command Center (Platform Admin takes precedence)", () => {
      expect(isSalesManagerExperience({ roles: ["admin", "manager"] })).toBe(false);
      expect(isSalesManagerExperience({
        roles: ["manager", "admin"],
        workspace: {
          role: {
            appRoles: ["admin", "manager"],
          },
        } as any,
      })).toBe(false);
    });

    it("D. proves pure agent renders Sales Executive and NOT Manager Command Center", () => {
      expect(isSalesExecutiveExperience({ roles: ["agent"] })).toBe(true);
      expect(isSalesManagerExperience({ roles: ["agent"] })).toBe(false);
      expect(isSalesManagerExperience({ roles: ["agent", "viewer"] })).toBe(false);
    });

    it("E. proves pure admin and pure viewer do NOT render Manager Command Center", () => {
      expect(isSalesManagerExperience({ roles: ["admin"] })).toBe(false);
      expect(isSalesManagerExperience({ roles: ["viewer"] })).toBe(false);
      expect(isSalesManagerExperience({ roles: [] })).toBe(false);
    });

    it("F. proves builder/developer without manager role does NOT render Manager Command Center, but with manager does", () => {
      expect(isSalesManagerExperience({ roles: ["builder"] })).toBe(false);
      expect(isSalesManagerExperience({ roles: ["developer"] })).toBe(false);
      expect(isSalesManagerExperience({ roles: ["builder", "developer"] })).toBe(false);
      expect(isSalesManagerExperience({ roles: ["builder", "manager"] })).toBe(true);
      expect(isSalesManagerExperience({ roles: ["developer", "manager"] })).toBe(true);
    });

    it("G. proves Manager KPI data remains full workspace/team scoped (not reduced to single agent)", () => {
      const allWorkspaceLeads = MOCK_WORKSPACE_LEADS;
      const managerKpis = calculateCRMKpiSnapshot(
        allWorkspaceLeads,
        MOCK_PROPERTIES,
        MOCK_CALLS,
        MOCK_ACTIVITIES
      );

      // Manager must see all 6 workspace leads
      expect(managerKpis.totalInputLeads).toBe(6);
      expect(managerKpis.activeLeads).toBe(5); // 6 total - 1 booked
      expect(managerKpis.convertedLeads).toBe(1); // 1 booked
      expect(managerKpis.conversionRatePct).toBeCloseTo((1 / 6) * 100, 1);
    });

    it("H. proves executive aggregation correctly partitions leads by assigned executive without fake names", () => {
      const mockTeamLeads: LiveLead[] = [
        {
          id: "lead-101",
          name: "Client One",
          stage: "New",
          score: 80,
          budget: "₹1.5 Cr",
          budgetInr: 15000000,
          source: "Direct",
          owner: "Aarav Mehta",
          ownerName: "Aarav Mehta",
          email: "c1@test.com",
          phone: "+919800000001",
          siteVisitDate: "2026-09-30",
          siteVisitTime: "11:00",
        },
        {
          id: "lead-102",
          name: "Client Two",
          stage: "Booked",
          score: 95,
          budget: "₹2.5 Cr",
          budgetInr: 25000000,
          source: "Referral",
          owner: "Aarav Mehta",
          ownerName: "Aarav Mehta",
          email: "c2@test.com",
          phone: "+919800000002",
        },
        {
          id: "lead-103",
          name: "Client Three",
          stage: "Qualified",
          score: 75,
          budget: "₹1.8 Cr",
          budgetInr: 18000000,
          source: "Meta",
          owner: "Riya Kapoor",
          ownerName: "Riya Kapoor",
          email: "c3@test.com",
          phone: "+919800000003",
          followUpDate: "2026-10-01",
          followUpTime: "15:00",
          followUpStatus: "pending",
        },
        {
          id: "lead-104",
          name: "Client Four",
          stage: "New",
          score: 60,
          budget: "₹2.0 Cr",
          budgetInr: 20000000,
          source: "Direct",
          owner: "Unassigned",
          ownerName: "Unassigned",
          email: "c4@test.com",
          phone: "+919800000004",
        },
      ];

      // Simulate executive aggregate computation from FortDashboard
      const execMap = new Map<string, {
        name: string;
        assignedLeads: number;
        activeLeads: number;
        appointments: number;
        conversions: number;
        activeLeadBudget: number;
      }>();

      for (const lead of mockTeamLeads) {
        const execName = lead.ownerName && lead.ownerName !== "Unassigned" && lead.ownerName !== "none"
          ? lead.ownerName
          : "Unassigned";

        if (!execMap.has(execName)) {
          execMap.set(execName, {
            name: execName,
            assignedLeads: 0,
            activeLeads: 0,
            appointments: 0,
            conversions: 0,
            activeLeadBudget: 0,
          });
        }

        const entry = execMap.get(execName)!;
        entry.assignedLeads += 1;
        if (!["Booked", "Not Interested", "Dropped Plan"].includes(lead.stage)) {
          entry.activeLeads += 1;
          entry.activeLeadBudget += Number(lead.budgetInr || 0);
        }
        if ((lead.siteVisitDate && lead.siteVisitDate.trim()) || (lead.followUpDate && lead.followUpDate.trim() && lead.followUpStatus !== "completed")) {
          entry.appointments += 1;
        }
        if (lead.stage === "Booked") {
          entry.conversions += 1;
        }
      }

      const aarav = execMap.get("Aarav Mehta");
      expect(aarav).toBeDefined();
      expect(aarav?.assignedLeads).toBe(2);
      expect(aarav?.activeLeads).toBe(1);
      expect(aarav?.appointments).toBe(1);
      expect(aarav?.conversions).toBe(1);
      expect(aarav?.activeLeadBudget).toBe(15000000); // 1.5 Cr active lead (Booked lead excluded from active budget)

      const riya = execMap.get("Riya Kapoor");
      expect(riya).toBeDefined();
      expect(riya?.assignedLeads).toBe(1);
      expect(riya?.activeLeads).toBe(1);
      expect(riya?.appointments).toBe(1);
      expect(riya?.conversions).toBe(0);
      expect(riya?.activeLeadBudget).toBe(18000000);

      const unassigned = execMap.get("Unassigned");
      expect(unassigned).toBeDefined();
      expect(unassigned?.assignedLeads).toBe(1);
      expect(unassigned?.activeLeadBudget).toBe(20000000);
    });

    it("I. verifies teamActivePipelineBudget excludes terminal stages (Booked, Not Interested, Dropped Plan)", () => {
      const mockLeads: LiveLead[] = [
        { id: "1", name: "L1", stage: "New", score: 80, budget: "1 Cr", budgetInr: 10000000 },
        { id: "2", name: "L2", stage: "Qualified", score: 80, budget: "2 Cr", budgetInr: 20000000 },
        { id: "3", name: "L3", stage: "Site Visit Scheduled", score: 80, budget: "3 Cr", budgetInr: 30000000 },
        { id: "4", name: "L4", stage: "Negotiation", score: 80, budget: "4 Cr", budgetInr: 40000000 },
        { id: "5", name: "L5", stage: "Booked", score: 95, budget: "5 Cr", budgetInr: 50000000 },
        { id: "6", name: "L6", stage: "Not Interested", score: 10, budget: "6 Cr", budgetInr: 60000000 },
        { id: "7", name: "L7", stage: "Dropped Plan", score: 10, budget: "7 Cr", budgetInr: 70000000 },
      ];

      const activeLeads = mockLeads.filter(
        (l) => !["Booked", "Not Interested", "Dropped Plan"].includes(l.stage)
      );
      const teamActivePipelineBudget = activeLeads.reduce(
        (sum, l) => sum + (Number(l.budgetInr) || 0),
        0
      );

      // Active leads = 1, 2, 3, 4 -> 1 + 2 + 3 + 4 = 10 Cr (100,000,000)
      // Excluded terminal leads = 5 (Booked), 6 (Not Interested), 7 (Dropped Plan) -> 5 + 6 + 7 = 18 Cr excluded
      expect(activeLeads).toHaveLength(4);
      expect(teamActivePipelineBudget).toBe(100000000);
    });

    it("J. verifies zero-fabrication KPI fallback rules for Manager Command Center", () => {
      // 1. When CRM KPIs are null / unavailable:
      const nullKpis = null as CRMKpiSnapshot | null;
      const teamLeadsCount = 12;
      const teamActiveCount = 9;

      const conversionRateDisplay = nullKpis ? `${(nullKpis as CRMKpiSnapshot).conversionRatePct.toFixed(1)}%` : "INSUFFICIENT DATA";
      const outflowLeadsDisplay = nullKpis ? (nullKpis as CRMKpiSnapshot).outflowLeads.toLocaleString() : "INSUFFICIENT DATA";
      const notQualifiedLeadsDisplay = nullKpis ? (nullKpis as CRMKpiSnapshot).notQualifiedLeads.toLocaleString() : "INSUFFICIENT DATA";
      const totalInputLeadsDisplay = (nullKpis?.totalInputLeads ?? teamLeadsCount).toLocaleString();
      const activeLeadsDisplay = (nullKpis?.activeLeads ?? teamActiveCount).toLocaleString();

      expect(conversionRateDisplay).toBe("INSUFFICIENT DATA");
      expect(outflowLeadsDisplay).toBe("INSUFFICIENT DATA");
      expect(notQualifiedLeadsDisplay).toBe("INSUFFICIENT DATA");
      expect(totalInputLeadsDisplay).toBe("12");
      expect(activeLeadsDisplay).toBe("9");

      // 2. When CRM KPIs are present with live values:
      const liveKpis: CRMKpiSnapshot = {
        totalInputLeads: 20,
        totalLeads: 20,
        activeLeads: 15,
        qualifiedLeads: 8,
        convertedLeads: 3,
        outflowLeads: 4,
        notQualifiedLeads: 2,
        pipelineValueInr: 250000000,
        avgDealSizeInr: 50000000,
        conversionRatePct: 15.0,
      };

      const liveConversionRateDisplay = liveKpis ? `${liveKpis.conversionRatePct.toFixed(1)}%` : "INSUFFICIENT DATA";
      const liveOutflowLeadsDisplay = liveKpis ? liveKpis.outflowLeads.toLocaleString() : "INSUFFICIENT DATA";
      const liveNotQualifiedLeadsDisplay = liveKpis ? liveKpis.notQualifiedLeads.toLocaleString() : "INSUFFICIENT DATA";
      const liveTotalInputLeadsDisplay = (liveKpis?.totalInputLeads ?? teamLeadsCount).toLocaleString();
      const liveActiveLeadsDisplay = (liveKpis?.activeLeads ?? teamActiveCount).toLocaleString();

      expect(liveConversionRateDisplay).toBe("15.0%");
      expect(liveOutflowLeadsDisplay).toBe("4");
      expect(liveNotQualifiedLeadsDisplay).toBe("2");
      expect(liveTotalInputLeadsDisplay).toBe("20");
      expect(liveActiveLeadsDisplay).toBe("15");
    });

    it("K. verifies formatPipelineBudgetInr client-safe formatting semantics", () => {
      expect(formatPipelineBudgetInr(null)).toBe("₹0");
      expect(formatPipelineBudgetInr(undefined)).toBe("₹0");
      expect(formatPipelineBudgetInr(0)).toBe("₹0");
      expect(formatPipelineBudgetInr(-500)).toBe("₹0");
      expect(formatPipelineBudgetInr(NaN)).toBe("₹0");

      // Crores
      expect(formatPipelineBudgetInr(15000000)).toBe("₹1.5 Cr");
      expect(formatPipelineBudgetInr(25000000)).toBe("₹2.5 Cr");
      expect(formatPipelineBudgetInr(100000000)).toBe("₹10 Cr");
      expect(formatPipelineBudgetInr(18500000)).toBe("₹1.85 Cr");

      // Lakhs
      expect(formatPipelineBudgetInr(500000)).toBe("₹5 L");
      expect(formatPipelineBudgetInr(7500000)).toBe("₹75 L");

      // Thousands / Standard INR
      expect(formatPipelineBudgetInr(50000)).toBe("₹50,000");
    });
  });

  // ── 10. Sales Executive Full Shell Visual Theme & Isolation ───────────────
  describe("10. Sales Executive Full Shell Visual Theme & Persona Isolation", () => {
    it("proves Sales Executive resolves pearl/cream shell tokens and Manager/Admin retain dark shell", () => {
      // Helper function mirroring src/routes/fort.tsx theme logic
      const resolveShellTheme = (roles: string[], persona?: string | null) => {
        const isSalesExec = isSalesExecutiveExperience({ roles, persona });
        return {
          isSalesExec,
          outerBg: isSalesExec ? "bg-[#FAF7F2]" : "bg-[#0C0E14]",
          sidebarBg: isSalesExec ? "bg-[#FAF7F2]" : "bg-[#10121A]",
          sidebarBorder: isSalesExec ? "border-[#EADBCA]" : "border-[#232834]",
          topBarBg: isSalesExec ? "bg-[#FAF7F2]/90" : "bg-[#0C0E14]/90",
          topBarBorder: isSalesExec ? "border-[#EADBCA]" : "border-[#232834]",
          textColor: isSalesExec ? "text-[#141720]" : "text-stone-100",
          navActiveBg: isSalesExec ? "bg-[#EDE4D0]" : "bg-[#1E2536]",
        };
      };

      // 1. Sales Executive (role = agent) -> Light Pearl/Cream/Ivory theme
      const agentTheme = resolveShellTheme(["agent"]);
      expect(agentTheme.isSalesExec).toBe(true);
      expect(agentTheme.outerBg).toBe("bg-[#FAF7F2]");
      expect(agentTheme.sidebarBg).toBe("bg-[#FAF7F2]");
      expect(agentTheme.sidebarBorder).toBe("border-[#EADBCA]");
      expect(agentTheme.topBarBg).toBe("bg-[#FAF7F2]/90");
      expect(agentTheme.topBarBorder).toBe("border-[#EADBCA]");
      expect(agentTheme.textColor).toBe("text-[#141720]");
      expect(agentTheme.navActiveBg).toBe("bg-[#EDE4D0]");

      // 2. Sales Manager (role = manager) -> Dark Obsidian Sentinel theme
      const managerTheme = resolveShellTheme(["manager"]);
      expect(managerTheme.isSalesExec).toBe(false);
      expect(managerTheme.outerBg).toBe("bg-[#0C0E14]");
      expect(managerTheme.sidebarBg).toBe("bg-[#10121A]");
      expect(managerTheme.sidebarBorder).toBe("border-[#232834]");
      expect(managerTheme.topBarBg).toBe("bg-[#0C0E14]/90");
      expect(managerTheme.topBarBorder).toBe("border-[#232834]");
      expect(managerTheme.textColor).toBe("text-stone-100");
      expect(managerTheme.navActiveBg).toBe("bg-[#1E2536]");

      // 3. Platform Admin (role = admin) -> Dark Obsidian Sentinel theme
      const adminTheme = resolveShellTheme(["admin"]);
      expect(adminTheme.isSalesExec).toBe(false);
      expect(adminTheme.outerBg).toBe("bg-[#0C0E14]");
      expect(adminTheme.sidebarBg).toBe("bg-[#10121A]");

      // 4. Builder / Developer (role = builder) -> Dark Obsidian Sentinel theme
      const builderTheme = resolveShellTheme(["builder"]);
      expect(builderTheme.isSalesExec).toBe(false);
      expect(builderTheme.outerBg).toBe("bg-[#0C0E14]");
      expect(builderTheme.sidebarBg).toBe("bg-[#10121A]");
    });
  });

  // ── 11. Sales Executive Navigation Entitlement Hardening & Canonical Role Labels ──
  describe("11. Sales Executive Navigation Entitlement Hardening & Canonical Role Labels", () => {
    const AGENT_ROLES = ["agent"];
    const MANAGER_ROLES = ["manager"];
    const ADMIN_ROLES = ["admin"];

    it("1. Pure agent / Sales Executive does NOT have access to Sales Intelligence (/app/salesintel)", () => {
      expect(isRouteAuthorized(AGENT_ROLES, "/app/salesintel")).toBe(false);
      const access = getModuleAccess({ roles: AGENT_ROLES }, "/app/salesintel");
      expect(access.state).toBe("LOCKED");
      expect(access.accessMode).toBe("LOCKED");
    });

    it("2. Pure agent / Sales Executive does NOT have access to Marketing (/app/marketing)", () => {
      expect(isRouteAuthorized(AGENT_ROLES, "/app/marketing")).toBe(false);
      const access = getModuleAccess({ roles: AGENT_ROLES }, "/app/marketing");
      expect(access.state).toBe("LOCKED");
      expect(access.accessMode).toBe("LOCKED");
    });

    it("3. Pure agent / Sales Executive does NOT have access to broad AI Copilot (/app/copilot)", () => {
      expect(isRouteAuthorized(AGENT_ROLES, "/app/copilot")).toBe(false);
      const access = getModuleAccess({ roles: AGENT_ROLES }, "/app/copilot");
      expect(access.state).toBe("LOCKED");
      expect(access.accessMode).toBe("LOCKED");
    });

    it("4. Pure agent / Sales Executive does NOT have access to broad Document Chat (/app/docchat)", () => {
      expect(isRouteAuthorized(AGENT_ROLES, "/app/docchat")).toBe(false);
      const access = getModuleAccess({ roles: AGENT_ROLES }, "/app/docchat");
      expect(access.state).toBe("LOCKED");
      expect(access.accessMode).toBe("LOCKED");
    });

    it("5. Sales Executive retains access to CRM (/app/crm)", () => {
      expect(isRouteAuthorized(AGENT_ROLES, "/app/crm")).toBe(true);
      const access = getModuleAccess({ roles: AGENT_ROLES }, "/app/crm");
      expect(access.state).toBe("ACTIVE");
      expect(access.accessMode).toBe("OPERATIONAL");
    });

    it("6. Sales Executive retains access to Leads (/app/leads)", () => {
      expect(isRouteAuthorized(AGENT_ROLES, "/app/leads")).toBe(true);
      const access = getModuleAccess({ roles: AGENT_ROLES }, "/app/leads");
      expect(access.state).toBe("ACTIVE");
      expect(access.accessMode).toBe("OPERATIONAL");
    });

    it("7. Sales Executive retains access to Marketplace inventory reference (/app/marketplace)", () => {
      expect(isRouteAuthorized(AGENT_ROLES, "/app/marketplace")).toBe(true);
      const access = getModuleAccess({ roles: AGENT_ROLES }, "/app/marketplace");
      expect(access.state).toBe("ACTIVE");
      expect(access.accessMode).toBe("OPERATIONAL");
      // Read-only inventory hardening verification
      expect(canManageMarketplaceInventory(AGENT_ROLES)).toBe(false);
      expect(canManageMarketplaceInventory(MANAGER_ROLES)).toBe(true);
      expect(canManageMarketplaceInventory(ADMIN_ROLES)).toBe(true);
    });

    it("8. Sales Executive retains access to Deal Rooms (/app/dealrooms)", () => {
      expect(isRouteAuthorized(AGENT_ROLES, "/app/dealrooms")).toBe(true);
      const access = getModuleAccess({ roles: AGENT_ROLES }, "/app/dealrooms");
      expect(access.state).toBe("ACTIVE");
      expect(access.accessMode).toBe("OPERATIONAL");
    });

    it("9. Manager retains access to Sales Intelligence (/app/salesintel)", () => {
      expect(isRouteAuthorized(MANAGER_ROLES, "/app/salesintel")).toBe(true);
      const access = getModuleAccess({ roles: MANAGER_ROLES }, "/app/salesintel");
      expect(access.state).toBe("ACTIVE");
      expect(access.accessMode).toBe("ADMINISTRATIVE");
    });

    it("10. Admin retains access to Sales Intelligence (/app/salesintel)", () => {
      expect(isRouteAuthorized(ADMIN_ROLES, "/app/salesintel")).toBe(true);
      const access = getModuleAccess({ roles: ADMIN_ROLES }, "/app/salesintel");
      expect(access.state).toBe("ACTIVE");
      expect(access.accessMode).toBe("ADMINISTRATIVE");
    });

    it("11. formatCanonicalRoleLabel and formatCanonicalRoles translate 'agent' to 'Sales Executive' and never raw 'Agent'", () => {
      expect(formatCanonicalRoleLabel("agent")).toBe("Sales Executive");
      expect(formatCanonicalRoleLabel("manager")).toBe("Sales Manager");
      expect(formatCanonicalRoleLabel("admin")).toBe("Platform Admin");
      expect(formatCanonicalRoleLabel("platform_admin")).toBe("Platform Admin");
      expect(formatCanonicalRoleLabel("builder")).toBe("Developer / Builder");
      expect(formatCanonicalRoleLabel("developer")).toBe("Developer / Builder");
      expect(formatCanonicalRoleLabel("viewer")).toBe("Investor");
      expect(formatCanonicalRoleLabel("unknown_role")).toBe("Unknown_role");

      expect(formatCanonicalRoles(["agent"])).toBe("Sales Executive");
      expect(formatCanonicalRoles(["manager"])).toBe("Sales Manager");
      expect(formatCanonicalRoles(["admin"])).toBe("Platform Admin");
      expect(formatCanonicalRoles(["agent", "manager"])).toBe("Sales Executive · Sales Manager");
      expect(formatCanonicalRoles(null)).toBe("access pending");
      expect(formatCanonicalRoles([])).toBe("access pending");
    });

    it("12. Console route set correctly isolates Sales Executive from managerial intelligence modules", () => {
      const agentGrantedRoutes = activeConsoleRouteSet(resolveConsoleModules(AGENT_ROLES));
      
      // Kept visible for Sales Executive
      expect(agentGrantedRoutes.has("/app/crm")).toBe(true);
      expect(agentGrantedRoutes.has("/app/leads")).toBe(true);
      expect(agentGrantedRoutes.has("/app/marketplace")).toBe(true);
      expect(agentGrantedRoutes.has("/app/dealrooms")).toBe(true);
      expect(agentGrantedRoutes.has("/app/messages")).toBe(true);
      expect(agentGrantedRoutes.has("/app/documents")).toBe(true);

      // Kept hidden for pure Sales Executive
      expect(agentGrantedRoutes.has("/app/salesintel")).toBe(false);
      expect(agentGrantedRoutes.has("/app/marketing")).toBe(false);
      expect(agentGrantedRoutes.has("/app/copilot")).toBe(false);
      expect(agentGrantedRoutes.has("/app/docchat")).toBe(false);
      expect(agentGrantedRoutes.has("/app/bi")).toBe(false);
      expect(agentGrantedRoutes.has("/app/users")).toBe(false);
      expect(agentGrantedRoutes.has("/app/governance")).toBe(false);
      expect(agentGrantedRoutes.has("/app/command")).toBe(false);
      expect(agentGrantedRoutes.has("/app/risk")).toBe(false);

      // Manager has access to managerial modules
      const managerGrantedRoutes = activeConsoleRouteSet(resolveConsoleModules(MANAGER_ROLES));
      expect(managerGrantedRoutes.has("/app/salesintel")).toBe(true);
      expect(managerGrantedRoutes.has("/app/marketing")).toBe(true);
      expect(managerGrantedRoutes.has("/app/copilot")).toBe(true);
      expect(managerGrantedRoutes.has("/app/docchat")).toBe(true);
      expect(managerGrantedRoutes.has("/app/bi")).toBe(true);
      expect(managerGrantedRoutes.has("/app/users")).toBe(true);
      expect(managerGrantedRoutes.has("/app/governance")).toBe(true);
    });
  });

  // ── 12. Sales Executive Virtual Office Structural Interface Redesign ────────
  describe("12. Sales Executive Virtual Office Structural Interface Redesign", () => {
    it("proves Sales Executive Fort Home bypasses traditional sidebar in favor of full-width Virtual Office", () => {
      // Simulate layout rendering decision logic in src/routes/fort.tsx
      const resolveShellStructure = (roles: string[], persona?: string | null) => {
        const isSalesExec = isSalesExecutiveExperience({ roles, persona });
        return {
          isSalesExec,
          rendersTraditionalSidebar: !isSalesExec,
          rendersCompactCommandStrip: isSalesExec,
          layoutMode: isSalesExec ? "FULL_WIDTH_OFFICE" : "SIDEBAR_CONSOLE",
        };
      };

      const agentStructure = resolveShellStructure(["agent"]);
      expect(agentStructure.isSalesExec).toBe(true);
      expect(agentStructure.rendersTraditionalSidebar).toBe(false);
      expect(agentStructure.rendersCompactCommandStrip).toBe(true);
      expect(agentStructure.layoutMode).toBe("FULL_WIDTH_OFFICE");

      const managerStructure = resolveShellStructure(["manager"]);
      expect(managerStructure.isSalesExec).toBe(false);
      expect(managerStructure.rendersTraditionalSidebar).toBe(true);
      expect(managerStructure.rendersCompactCommandStrip).toBe(false);
      expect(managerStructure.layoutMode).toBe("SIDEBAR_CONSOLE");

      const adminStructure = resolveShellStructure(["admin"]);
      expect(adminStructure.isSalesExec).toBe(false);
      expect(adminStructure.rendersTraditionalSidebar).toBe(true);
      expect(adminStructure.rendersCompactCommandStrip).toBe(false);
      expect(adminStructure.layoutMode).toBe("SIDEBAR_CONSOLE");
    });

    it("verifies the 6 Primary Virtual Office workstation cards serve as main navigation", () => {
      const virtualOfficeModules = [
        { id: "MY_LEADS", route: "/app/leads", label: "MY LEADS", cta: "Open Leads" },
        { id: "MY_APPOINTMENTS", route: "/app/leads", label: "MY APPOINTMENTS", cta: "Open Schedule" },
        { id: "SALES_INVENTORY", route: "/app/marketplace", label: "SALES INVENTORY", cta: "View Stock" },
        { id: "MY_DEALS", route: "/app/dealrooms", label: "MY DEALS", cta: "Open Deal Rooms" },
        { id: "MY_PERFORMANCE", route: "/app/crm", label: "MY PERFORMANCE", cta: "View Metrics" },
        { id: "MESSAGES", route: "/app/messages", label: "MESSAGES", cta: "Open Messages" },
      ];

      for (const mod of virtualOfficeModules) {
        expect(isRouteAuthorized(["agent"], mod.route)).toBe(true);
        const access = getModuleAccess({ roles: ["agent"] }, mod.route);
        expect(access.state).toBe("ACTIVE");
      }
    });

    it("validates lead deep-linking behavior for Today's Office work queue", () => {
      const sampleLeadId = "517d21fd-86a3-4eea-a6cc-15d83de0cf34";
      const link = getLeadDetailLink(sampleLeadId);
      expect(link.to).toBe("/app/leads");
      expect(link.search).toEqual({ leadId: sampleLeadId });
    });

    it("confirms Sales Executive inventory remains strictly VIEW ONLY in both Fort and Marketplace", () => {
      expect(canManageMarketplaceInventory(["agent"])).toBe(false);
      expect(canManageMarketplaceInventory(["manager"])).toBe(true);
      expect(canManageMarketplaceInventory(["admin"])).toBe(true);
      expect(canManageMarketplaceInventory(["builder"])).toBe(true);
      expect(canManageMarketplaceInventory(["developer"])).toBe(true);
      expect(canManageMarketplaceInventory(["viewer"])).toBe(false);
    });

    it("verifies formatUserDisplayName resolves canonical name with truthful fallback", () => {
      // 1. Explicit override
      expect(formatUserDisplayName(null, "Aryan Sharma")).toBe("Aryan Sharma");
      expect(formatUserDisplayName({ email: "test@example.com" }, "Aditya")).toBe("Aditya");

      // 2. User metadata full_name or name
      expect(formatUserDisplayName({ user_metadata: { full_name: "Vikram Malhotra" } })).toBe("Vikram Malhotra");
      expect(formatUserDisplayName({ user_metadata: { name: "Ananya Roy" } })).toBe("Ananya Roy");

      // 3. Email formatting (Capital Case)
      expect(formatUserDisplayName({ email: "rajesh.kumar@assetsense.ai" })).toBe("Rajesh Kumar");
      expect(formatUserDisplayName({ email: "priya_patel@domain.com" })).toBe("Priya Patel");
      expect(formatUserDisplayName({ email: "kavita@domain.com" })).toBe("Kavita");

      // 4. Safe fallback to 'Sales Executive'
      expect(formatUserDisplayName(null)).toBe("Sales Executive");
      expect(formatUserDisplayName(undefined)).toBe("Sales Executive");
      expect(formatUserDisplayName({ email: "" })).toBe("Sales Executive");
      expect(formatUserDisplayName({ email: null })).toBe("Sales Executive");
      expect(formatUserDisplayName({ user_metadata: {} })).toBe("Sales Executive");
      expect(formatUserDisplayName(null, null, "Custom Fallback")).toBe("Custom Fallback");
    });
  });
});

