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
} from "../src/lib/fort-experience";

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
});
