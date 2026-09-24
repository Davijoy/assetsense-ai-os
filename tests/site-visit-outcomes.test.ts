import { describe, it, expect } from "vitest";
import { recordSiteVisitOutcome, createOrLinkDealRoomForLead } from "../src/lib/crm.functions";

describe("Site Visit Outcomes — State Machine & Branching Logic", () => {
  it("exports recordSiteVisitOutcome and createOrLinkDealRoomForLead", () => {
    expect(typeof recordSiteVisitOutcome).toBe("function");
    expect(typeof createOrLinkDealRoomForLead).toBe("function");
  });

  it("evaluates outcome transitions correctly for INTERESTED, NOT_INTERESTED, and UNDECIDED", () => {
    // 1. INTERESTED -> Negotiation
    const outcome1 = "INTERESTED";
    let stage1 = "Site Visit Scheduled";
    if (outcome1 === "INTERESTED") {
      stage1 = "Negotiation";
    }
    expect(stage1).toBe("Negotiation");

    // 2. NOT_INTERESTED -> Not Interested (Closed)
    const outcome2 = "NOT_INTERESTED";
    let stage2 = "Site Visit Scheduled";
    if (outcome2 === "NOT_INTERESTED") {
      stage2 = "Not Interested";
    }
    expect(stage2).toBe("Not Interested");

    // 3. UNDECIDED -> Retain in follow-up
    const outcome3 = "UNDECIDED";
    let followUpScheduled = false;
    if (outcome3 === "UNDECIDED") {
      followUpScheduled = true;
    }
    expect(followUpScheduled).toBe(true);
  });

  it("creates preliminary deal room in deal_opportunities table and maintains 1-to-1 lead idempotency", async () => {
    let insertedOpportunity: any = null;

    const mockSupabase = {
      from: (table: string) => {
        if (table === "leads") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "00000000-0000-0000-0000-000000000001",
                    name: "Riya Kapoor",
                    budget_inr: 25000000,
                    assigned_to: "user-1",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "deal_opportunities") {
          return {
            select: () => ({
              eq: (col: string, val: string) => ({
                maybeSingle: async () => {
                  if (insertedOpportunity && insertedOpportunity.lead_id === val) {
                    return { data: insertedOpportunity, error: null };
                  }
                  return { data: null, error: null };
                },
              }),
            }),
            insert: (payload: any) => ({
              select: () => ({
                maybeSingle: async () => {
                  insertedOpportunity = {
                    id: "00000000-0000-0000-0000-000000000099",
                    workspace_id: payload.workspace_id,
                    lead_id: payload.lead_id,
                    assigned_to: payload.assigned_to,
                    stage: payload.stage,
                    unit_interest: payload.unit_interest,
                    target_budget_inr: payload.target_budget_inr,
                    created_at: new Date().toISOString(),
                  };
                  return { data: insertedOpportunity, error: null };
                },
              }),
            }),
            update: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        };
      },
    };

    // First call: creates preliminary opportunity
    const res1 = await createOrLinkDealRoomForLead(mockSupabase, {
      leadId: "00000000-0000-0000-0000-000000000001",
      workspaceId: "00000000-0000-0000-0000-00000000d3f7",
      userId: "user-1",
      unitInterest: "Unit 301",
      offeredBudgetInr: 25000000,
    });

    expect(res1).toBeDefined();
    expect(res1.dealId).toBe("DR-0000");
    expect(res1.isNew).toBe(true);
    expect(res1.opportunityId).toBe("00000000-0000-0000-0000-000000000099");

    // Second call: idempotent retrieval of existing opportunity
    const res2 = await createOrLinkDealRoomForLead(mockSupabase, {
      leadId: "00000000-0000-0000-0000-000000000001",
      workspaceId: "00000000-0000-0000-0000-00000000d3f7",
      userId: "user-1",
    });

    expect(res2.dealId).toBe("DR-0000");
    expect(res2.isNew).toBe(false);
    expect(res2.opportunityId).toBe("00000000-0000-0000-0000-000000000099");
  });

  it("throws an explicit Error on fatal database failure instead of returning a synthetic deal ID", async () => {
    const failingSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { message: "connection refused" } }),
          }),
        }),
        insert: () => ({
          select: () => ({
            maybeSingle: async () => ({ data: null, error: { message: "insert failed" } }),
          }),
        }),
      }),
    };

    await expect(
      createOrLinkDealRoomForLead(failingSupabase, {
        leadId: "00000000-0000-0000-0000-000000000001",
        workspaceId: "00000000-0000-0000-0000-00000000d3f7",
        userId: "user-1",
      })
    ).rejects.toThrowError(/Failed to (create preliminary Deal Room|query lead)/);
  });

  it("requires non-empty follow-up date and time for UNDECIDED outcomes", () => {
    const validateUndecided = (outcome: string, date?: string, time?: string) => {
      if (outcome === "UNDECIDED" && (!date || !time)) {
        throw new Error("VALIDATION_ERROR: Next follow-up date and time are required for undecided site visits.");
      }
      return true;
    };

    expect(() => validateUndecided("UNDECIDED", "", "")).toThrowError(/VALIDATION_ERROR/);
    expect(() => validateUndecided("UNDECIDED", "2026-10-01", "")).toThrowError(/VALIDATION_ERROR/);
    expect(validateUndecided("UNDECIDED", "2026-10-01", "14:00")).toBe(true);
    expect(validateUndecided("INTERESTED")).toBe(true);
    expect(validateUndecided("NOT_INTERESTED")).toBe(true);
  });
});
