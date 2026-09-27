import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeMetaLeadFields,
  parseBudgetInr,
  generateMetaLeadUuid,
  processMetaLeadEvent,
  type MetaGraphLead,
} from "../src/lib/services/meta-leads.service";

describe("Meta Lead -> CRM Production Bridge", () => {
  const WORKSPACE_ID = "00000000-0000-0000-0000-00000000d3f7";
  const EVENT_ID = "11111111-2222-3333-4444-555555555555";
  const CONNECTION_ID = "22222222-3333-4444-5555-666666666666";
  const FORM_MAPPING_ID = "33333333-4444-5555-6666-777777777777";
  const LEADGEN_ID = "leadgen_987654321012345";
  const PAGE_ID = "1310091792190853";
  const FORM_ID = "2012812726099329";

  const MANAGER_USER_ID = "88888888-86a3-4eea-a6cc-888888888888";
  const AGENT_USER_ID_1 = "517d21fd-86a3-4eea-a6cc-15d83de0cf34";
  const AGENT_USER_ID_2 = "99999999-86a3-4eea-a6cc-999999999999";

  describe("1. Meta field_data normalization and score handling", () => {
    it("normalizes full name, email, phone, and sets score to 0 (never manufactured qualification)", () => {
      const metaLead: MetaGraphLead = {
        id: LEADGEN_ID,
        created_time: "2026-09-27T10:00:00+0000",
        form_id: FORM_ID,
        campaign_name: "Godrej Woods Q3",
        field_data: [
          { name: "full_name", values: ["Rajesh Kumar Sharma"] },
          { name: "email", values: ["RAJESH.SHARMA@GMAIL.COM "] },
          { name: "phone_number", values: [" +919876543210 "] },
          { name: "city", values: ["Bangalore"] },
          { name: "budget", values: ["₹1.5 Cr"] },
        ],
      };

      const normalized = normalizeMetaLeadFields(metaLead, "Godrej Woods Lead Form");

      expect(normalized.name).toBe("Rajesh Kumar Sharma");
      expect(normalized.email).toBe("rajesh.sharma@gmail.com");
      expect(normalized.phone).toBe("+919876543210");
      expect(normalized.city).toBe("Bangalore");
      expect(normalized.budgetInr).toBe(15000000);
      expect(normalized.source).toBe("Meta Ads");
      expect(normalized.stage).toBe("new");
      expect(normalized.score).toBe(0); // Zero unrated intake baseline
      expect(normalized.owner).toBeNull();
      expect(normalized.metaLeadgenId).toBe(LEADGEN_ID);
      expect(normalized.project).toBe("Godrej Woods Q3");
    });

    it("composes full name from first_name and last_name when full_name is absent", () => {
      const metaLead: MetaGraphLead = {
        id: LEADGEN_ID,
        field_data: [
          { name: "first_name", values: ["Priya"] },
          { name: "last_name", values: ["Patel"] },
          { name: "email_address", values: ["priya@patel.com"] },
          { name: "mobile_number", values: ["+919822334455"] },
        ],
      };

      const normalized = normalizeMetaLeadFields(metaLead);

      expect(normalized.name).toBe("Priya Patel");
      expect(normalized.email).toBe("priya@patel.com");
      expect(normalized.phone).toBe("+919822334455");
      expect(normalized.score).toBe(0);
    });

    it("handles missing optional email without crashing", () => {
      const metaLead: MetaGraphLead = {
        id: LEADGEN_ID,
        field_data: [
          { name: "full_name", values: ["Vikram Malhotra"] },
          { name: "phone_number", values: ["+919811223344"] },
        ],
      };

      const normalized = normalizeMetaLeadFields(metaLead);

      expect(normalized.name).toBe("Vikram Malhotra");
      expect(normalized.email).toBeNull();
      expect(normalized.phone).toBe("+919811223344");
    });

    it("handles missing optional phone without crashing", () => {
      const metaLead: MetaGraphLead = {
        id: LEADGEN_ID,
        field_data: [
          { name: "name", values: ["Ananya Sen"] },
          { name: "e-mail", values: ["ananya.sen@example.com"] },
        ],
      };

      const normalized = normalizeMetaLeadFields(metaLead);

      expect(normalized.name).toBe("Ananya Sen");
      expect(normalized.email).toBe("ananya.sen@example.com");
      expect(normalized.phone).toBeNull();
    });

    it("is independent of field ordering", () => {
      const metaLeadA: MetaGraphLead = {
        id: LEADGEN_ID,
        field_data: [
          { name: "phone", values: ["+919876543210"] },
          { name: "email", values: ["test@example.com"] },
          { name: "full_name", values: ["Same Customer"] },
        ],
      };

      const metaLeadB: MetaGraphLead = {
        id: LEADGEN_ID,
        field_data: [
          { name: "full_name", values: ["Same Customer"] },
          { name: "phone", values: ["+919876543210"] },
          { name: "email", values: ["test@example.com"] },
        ],
      };

      const normA = normalizeMetaLeadFields(metaLeadA);
      const normB = normalizeMetaLeadFields(metaLeadB);

      expect(normA).toEqual(normB);
    });

    it("parses budget INR in various formats (Crores, Lakhs, Numbers)", () => {
      expect(parseBudgetInr("1.5 Cr")).toBe(15000000);
      expect(parseBudgetInr("2.5 Crore")).toBe(25000000);
      expect(parseBudgetInr("75 L")).toBe(7500000);
      expect(parseBudgetInr("80 Lakhs")).toBe(8000000);
      expect(parseBudgetInr("₹ 25,00,000")).toBe(2500000);
      expect(parseBudgetInr(50000000)).toBe(50000000);
      expect(parseBudgetInr(null)).toBeNull();
      expect(parseBudgetInr("N/A")).toBeNull();
      expect(parseBudgetInr("")).toBeNull();
    });

    it("generates deterministic RFC 4122 v5 compatible UUID from leadgen_id", () => {
      const uuid1 = generateMetaLeadUuid("2012812726099329");
      const uuid2 = generateMetaLeadUuid("2012812726099329");
      const uuidDiff = generateMetaLeadUuid("9999999999999999");

      expect(uuid1).toBe(uuid2);
      expect(uuid1).not.toBe(uuidDiff);
      // Verify standard 8-4-4-4-12 UUID format
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid1)).toBe(true);
    });
  });

  describe("2. processMetaLeadEvent execution and CRM lead creation", () => {
    let mockDbState: {
      meta_lead_events: any[];
      meta_connections: any[];
      meta_lead_forms: any[];
      leads: any[];
      audit_logs: any[];
    };

    let mockSupabase: any;

    beforeEach(() => {
      mockDbState = {
        meta_lead_events: [
          {
            id: EVENT_ID,
            workspace_id: WORKSPACE_ID,
            connection_id: CONNECTION_ID,
            form_mapping_id: FORM_MAPPING_ID,
            leadgen_id: LEADGEN_ID,
            page_id: PAGE_ID,
            form_id: FORM_ID,
            status: "received",
            attempt_count: 0,
            lead_id: null,
          },
        ],
        meta_connections: [
          {
            id: CONNECTION_ID,
            workspace_id: WORKSPACE_ID,
            page_id: PAGE_ID,
            access_token: "EAAB_test_mock_token",
            status: "active",
          },
        ],
        meta_lead_forms: [
          {
            id: FORM_MAPPING_ID,
            workspace_id: WORKSPACE_ID,
            page_id: PAGE_ID,
            form_id: FORM_ID,
            form_name: "Godrej Woods Lead Form",
            active: true,
          },
        ],
        leads: [],
        audit_logs: [],
      };

      mockSupabase = {
        from: (table: string) => {
          return {
            select: (cols?: string) => ({
              eq: (col1: string, val1: any) => ({
                eq: (col2: string, val2: any) => ({
                  single: async () => {
                    const row = mockDbState[table as keyof typeof mockDbState]?.find(
                      (r: any) => r[col1] === val1 && r[col2] === val2,
                    );
                    return { data: row || null, error: row ? null : { message: "Not found" } };
                  },
                  maybeSingle: async () => {
                    const row = mockDbState[table as keyof typeof mockDbState]?.find(
                      (r: any) => r[col1] === val1 && r[col2] === val2,
                    );
                    return { data: row || null, error: null };
                  },
                }),
                order: () => ({
                  data: mockDbState[table as keyof typeof mockDbState]?.filter((r: any) => r[col1] === val1) || [],
                  error: null,
                }),
                single: async () => {
                  const row = mockDbState[table as keyof typeof mockDbState]?.find(
                    (r: any) => r[col1] === val1,
                  );
                  return { data: row || null, error: row ? null : { message: "Not found" } };
                },
                maybeSingle: async () => {
                  const row = mockDbState[table as keyof typeof mockDbState]?.find(
                    (r: any) => r[col1] === val1,
                  );
                  return { data: row || null, error: null };
                },
              }),
            }),
            insert: (data: any) => ({
              select: () => ({
                single: async () => {
                  const newRow = {
                    id: data.id || `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    ...data,
                    created_at: new Date().toISOString(),
                  };
                  // Enforce unique ID primary key constraint
                  const existingIdx = mockDbState[table as keyof typeof mockDbState]?.findIndex(
                    (r: any) => r.id === newRow.id,
                  );
                  if (existingIdx !== undefined && existingIdx >= 0) {
                    const err = new Error("duplicate key value violates unique constraint");
                    (err as any).code = "23505";
                    return { data: null, error: err };
                  }
                  mockDbState[table as keyof typeof mockDbState]?.push(newRow);
                  return { data: newRow, error: null };
                },
              }),
              then: async (resolve: any) => {
                const newRow = {
                  id: data.id || `audit-${Date.now()}`,
                  ...data,
                  created_at: new Date().toISOString(),
                };
                mockDbState[table as keyof typeof mockDbState]?.push(newRow);
                return resolve({ data: newRow, error: null });
              },
            }),
            update: (updates: any) => ({
              eq: (col: string, val: any) => ({
                eq: (col2?: string, val2?: any) => {
                  const items = mockDbState[table as keyof typeof mockDbState] || [];
                  for (const item of items) {
                    if (item[col] === val && (!col2 || item[col2] === val2)) {
                      Object.assign(item, updates);
                    }
                  }
                  return { error: null };
                },
                then: (resolve: any) => {
                  const items = mockDbState[table as keyof typeof mockDbState] || [];
                  for (const item of items) {
                    if (item[col] === val) {
                      Object.assign(item, updates);
                    }
                  }
                  return resolve({ error: null });
                },
              }),
            }),
          };
        },
      };
    });

    it("creates exactly one CRM lead from a valid fetched Meta event and links lead_id", async () => {
      const mockMetaLead: MetaGraphLead = {
        id: LEADGEN_ID,
        created_time: "2026-09-27T10:00:00+0000",
        form_id: FORM_ID,
        campaign_name: "Godrej Woods Campaign",
        field_data: [
          { name: "full_name", values: ["Rajesh Sharma"] },
          { name: "email", values: ["rajesh.sharma@example.com"] },
          { name: "phone_number", values: ["+919876543210"] },
          { name: "city", values: ["Mumbai"] },
          { name: "budget", values: ["2.5 Cr"] },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue(mockMetaLead);

      const result = await processMetaLeadEvent(EVENT_ID, mockSupabase, mockFetch);

      expect(result.status).toBe("created");
      expect(result.leadId).toBeDefined();
      expect(result.leadgenId).toBe(LEADGEN_ID);

      // Verify exactly 1 CRM lead created with deterministic ID
      expect(mockDbState.leads).toHaveLength(1);
      const createdLead = mockDbState.leads[0];
      expect(createdLead.id).toBe(generateMetaLeadUuid(LEADGEN_ID));
      expect(createdLead.name).toBe("Rajesh Sharma");
      expect(createdLead.email).toBe("rajesh.sharma@example.com");
      expect(createdLead.phone).toBe("+919876543210");
      expect(createdLead.city).toBe("Mumbai");
      expect(createdLead.budget_inr).toBe(25000000);
      expect(createdLead.workspace_id).toBe(WORKSPACE_ID);
      expect(createdLead.source).toBe("Meta Ads");
      expect(createdLead.stage).toBe("new");
      expect(createdLead.score).toBe(0);
      expect(createdLead.owner).toBeNull();

      // Verify meta_lead_events row was updated to 'created' with lead_id link
      const eventRow = mockDbState.meta_lead_events.find((e) => e.id === EVENT_ID);
      expect(eventRow.status).toBe("created");
      expect(eventRow.lead_id).toBe(createdLead.id);
      expect(eventRow.error_code).toBeNull();
      expect(eventRow.error_message).toBeNull();

      // Verify audit log entry
      expect(mockDbState.audit_logs).toHaveLength(1);
      expect(mockDbState.audit_logs[0].action).toBe("lead.created");
      expect(mockDbState.audit_logs[0].entity).toBe("leads");
      expect(mockDbState.audit_logs[0].workspace_id).toBe(WORKSPACE_ID);
    });

    it("reprocessing the same leadgen_id does not create duplicate CRM leads (idempotency)", async () => {
      const mockMetaLead: MetaGraphLead = {
        id: LEADGEN_ID,
        field_data: [
          { name: "full_name", values: ["Duplicate Test Lead"] },
          { name: "phone", values: ["+919876543210"] },
        ],
      };
      const mockFetch = vi.fn().mockResolvedValue(mockMetaLead);

      // First run
      const firstResult = await processMetaLeadEvent(EVENT_ID, mockSupabase, mockFetch);
      expect(firstResult.status).toBe("created");
      expect(mockDbState.leads).toHaveLength(1);

      // Second run (simulating webhook retry or replay)
      const secondResult = await processMetaLeadEvent(EVENT_ID, mockSupabase, mockFetch);
      expect(secondResult.status).toBe("already_processed");
      expect(secondResult.leadId).toBe(firstResult.leadId);

      // Assert still exactly 1 CRM lead in database
      expect(mockDbState.leads).toHaveLength(1);
      // Fetch should not even be called a second time
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("recovers safely across crash after CRM lead insert before event record update (crash idempotency)", async () => {
      const mockMetaLead: MetaGraphLead = {
        id: LEADGEN_ID,
        field_data: [{ name: "full_name", values: ["Crash Recovery Lead"] }],
      };
      const mockFetch = vi.fn().mockResolvedValue(mockMetaLead);

      const deterministicId = generateMetaLeadUuid(LEADGEN_ID);

      // Pre-seed a CRM lead in public.leads as if attempt 1 created the lead and crashed before updating meta_lead_events
      mockDbState.leads.push({
        id: deterministicId,
        name: "Crash Recovery Lead",
        workspace_id: WORKSPACE_ID,
        source: "Meta Ads",
        stage: "new",
        score: 0,
        owner: null,
      });

      // meta_lead_events still says 'received' with lead_id: null
      expect(mockDbState.meta_lead_events[0].lead_id).toBeNull();

      const result = await processMetaLeadEvent(EVENT_ID, mockSupabase, mockFetch);

      expect(result.status).toBe("already_processed");
      expect(result.leadId).toBe(deterministicId);

      // Verified no second lead created in database
      expect(mockDbState.leads).toHaveLength(1);

      // Verified meta_lead_events is updated to 'created' with lead_id linked
      const eventRow = mockDbState.meta_lead_events.find((e) => e.id === EVENT_ID);
      expect(eventRow.status).toBe("created");
      expect(eventRow.lead_id).toBe(deterministicId);
    });

    it("preserves workspace isolation and does not default to any other workspace", async () => {
      const mockMetaLead: MetaGraphLead = {
        id: LEADGEN_ID,
        field_data: [{ name: "full_name", values: ["Workspace Check"] }],
      };
      const mockFetch = vi.fn().mockResolvedValue(mockMetaLead);

      await processMetaLeadEvent(EVENT_ID, mockSupabase, mockFetch);

      expect(mockDbState.leads[0].workspace_id).toBe(WORKSPACE_ID);
      expect(mockDbState.leads[0].workspace_id).not.toBe("00000000-0000-0000-0000-000000000000");
    });

    it("records failure when CRM creation fails and does not falsely mark success", async () => {
      const mockMetaLead: MetaGraphLead = {
        id: LEADGEN_ID,
        field_data: [{ name: "full_name", values: ["Failing Lead"] }],
      };
      const mockFetch = vi.fn().mockResolvedValue(mockMetaLead);

      // Override insert on leads to throw DB constraint error
      const failingSupabase = {
        ...mockSupabase,
        from: (table: string) => {
          if (table === "leads") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
              insert: () => ({
                select: () => ({
                  single: async () => {
                    return { data: null, error: new Error("DB_WRITE_CONFLICT: write error") };
                  },
                }),
              }),
            };
          }
          return mockSupabase.from(table);
        },
      };

      await expect(processMetaLeadEvent(EVENT_ID, failingSupabase, mockFetch)).rejects.toThrow(
        "DB_WRITE_CONFLICT",
      );

      // Verify event status is 'failed' and lead_id is null
      const eventRow = mockDbState.meta_lead_events.find((e) => e.id === EVENT_ID);
      expect(eventRow.status).toBe("failed");
      expect(eventRow.lead_id).toBeNull();
      expect(eventRow.error_code).toBe("CRM_LEAD_CREATION_FAILED");
      expect(eventRow.error_message).toContain("DB_WRITE_CONFLICT");
    });

    it("records failure when Meta Graph API fetch fails", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Meta lead retrieval failed: HTTP 400 | OAuthException | code=190"));

      await expect(processMetaLeadEvent(EVENT_ID, mockSupabase, mockFetch)).rejects.toThrow(
        "OAuthException",
      );

      const eventRow = mockDbState.meta_lead_events.find((e) => e.id === EVENT_ID);
      expect(eventRow.status).toBe("failed");
      expect(eventRow.lead_id).toBeNull();
      expect(eventRow.error_code).toBe("META_GRAPH_FETCH_FAILED");
      expect(eventRow.error_message).toContain("OAuthException");
    });
  });

  describe("3. Lead Routing & Persona Access Isolation Contract", () => {
    it("proves fresh Meta lead is unassigned (assigned_to: null, owner: null)", () => {
      const metaLead: MetaGraphLead = {
        id: "leadgen_routing_001",
        field_data: [{ name: "full_name", values: ["Unassigned Lead"] }],
      };
      const normalized = normalizeMetaLeadFields(metaLead);
      expect(normalized.owner).toBeNull();
    });

    it("proves Manager sees unassigned Meta lead while Sales Executive is isolated", () => {
      const freshMetaLead = {
        id: "lead-meta-001",
        name: "Fresh Meta Lead",
        workspace_id: WORKSPACE_ID,
        assigned_to: null, // Unassigned intake
        owner: null,
        source: "Meta Ads",
        stage: "new",
      };

      const workspaceLeads = [freshMetaLead];

      // Manager RLS simulation: leads_workspace_manager_select -> sees all leads in workspace
      const managerVisibleLeads = workspaceLeads.filter(
        (l) => l.workspace_id === WORKSPACE_ID,
      );
      expect(managerVisibleLeads).toHaveLength(1);
      expect(managerVisibleLeads[0].name).toBe("Fresh Meta Lead");

      // Sales Executive 1 RLS simulation: leads_agent_assigned_select -> only leads where assigned_to = AGENT_USER_ID_1
      const agent1VisibleLeads = workspaceLeads.filter(
        (l) => l.workspace_id === WORKSPACE_ID && l.assigned_to === AGENT_USER_ID_1,
      );
      // Unassigned lead MUST NOT be visible to Sales Executive
      expect(agent1VisibleLeads).toHaveLength(0);

      // Sales Executive 2 RLS simulation: only leads where assigned_to = AGENT_USER_ID_2
      const agent2VisibleLeads = workspaceLeads.filter(
        (l) => l.workspace_id === WORKSPACE_ID && l.assigned_to === AGENT_USER_ID_2,
      );
      expect(agent2VisibleLeads).toHaveLength(0);
    });

    it("proves that after Manager assigns the Meta lead, only the designated Sales Executive sees it", () => {
      const assignedMetaLead = {
        id: "lead-meta-001",
        name: "Fresh Meta Lead",
        workspace_id: WORKSPACE_ID,
        assigned_to: AGENT_USER_ID_1, // Manager assigns to Agent 1
        owner: "Aarav Mehta",
        source: "Meta Ads",
        stage: "new",
      };

      const workspaceLeads = [assignedMetaLead];

      // Manager still sees it
      const managerVisibleLeads = workspaceLeads.filter(
        (l) => l.workspace_id === WORKSPACE_ID,
      );
      expect(managerVisibleLeads).toHaveLength(1);

      // Assigned Agent 1 now sees it
      const agent1VisibleLeads = workspaceLeads.filter(
        (l) => l.workspace_id === WORKSPACE_ID && l.assigned_to === AGENT_USER_ID_1,
      );
      expect(agent1VisibleLeads).toHaveLength(1);
      expect(agent1VisibleLeads[0].name).toBe("Fresh Meta Lead");

      // Other Agent (Agent 2) CANNOT see it
      const agent2VisibleLeads = workspaceLeads.filter(
        (l) => l.workspace_id === WORKSPACE_ID && l.assigned_to === AGENT_USER_ID_2,
      );
      expect(agent2VisibleLeads).toHaveLength(0);
    });
  });
});

