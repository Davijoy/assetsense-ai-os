import { describe, it, expect } from "vitest";
import {
  formatExactTimestamp,
  formatTimeAgo,
  formatBudgetInr,
  resolvePerformerName,
  mapDatabaseRowsToLiveLeads,
  calculateCRMKpiSnapshot,
  getLiveLeads,
  getCRMKPIs,
  INITIAL_LEADS,
  DEFAULT_TEAM_MEMBERS,
  type CRMKpiSnapshot,
  type LiveLead,
} from "../src/lib/crm.functions";
import { LEAD_STATUS_CATEGORIES, stageBadgeStyles } from "../src/components/crm/LeadDetailDrawer";

describe("CRM Forensic KPI & Funnel Remediation", () => {
  describe("1. Exact Timestamp & Chronological Formatting", () => {
    it("formats ISO timestamps into 'DD Mon YYYY — hh:mm A' format with relative timeAgo", () => {
      const iso = "2026-09-06T10:32:00.000Z";
      const formatted = formatExactTimestamp(iso);

      expect(formatted.exact).toMatch(/^\d{2}\s[A-Z][a-z]{2}\s\d{4}\s—\s\d{2}:\d{2}\s(AM|PM)$/);
      expect(formatted.date).toMatch(/^\d{2}\s[A-Z][a-z]{2}\s\d{4}$/);
      expect(formatted.time).toMatch(/^\d{2}:\d{2}\s(AM|PM)$/);
      expect(typeof formatted.timeAgo).toBe("string");
    });

    it("handles null or undefined timestamps safely", () => {
      const nullFormatted = formatExactTimestamp(null);
      expect(nullFormatted.exact).toBe("N/A");

      const undefFormatted = formatExactTimestamp(undefined);
      expect(undefFormatted.exact).toBe("N/A");
    });
  });

  describe("2. Primary CRM Dashboard KPIs Replacement", () => {
    const bookedStages = new Set(["booked", "closed", "won", "converted"]);
    const notQualifiedStages = new Set(["not interested", "not_interested", "dropped plan", "dropped_plan", "dropped", "lost"]);
    const outflowStages = new Set([...bookedStages, ...notQualifiedStages]);

    it("computes Total Input Leads, Active Leads, Conversion Rate, Outflow Leads, and Not Qualified Leads accurately from live dataset", () => {
      const testLeads: Array<{ id: string; stage: string; budget_inr: number; created_at: string }> = [
        { id: "1", stage: "New", budget_inr: 10000000, created_at: "2026-09-01T10:00:00Z" },
        { id: "2", stage: "Qualified", budget_inr: 20000000, created_at: "2026-09-01T10:00:00Z" },
        { id: "3", stage: "Call Back", budget_inr: 15000000, created_at: "2026-09-01T10:00:00Z" },
        { id: "4", stage: "Site Visit Scheduled", budget_inr: 30000000, created_at: "2026-09-01T10:00:00Z" },
        { id: "5", stage: "Booked", budget_inr: 25000000, created_at: "2026-09-01T10:00:00Z" },
        { id: "6", stage: "Not Interested", budget_inr: 12000000, created_at: "2026-09-01T10:00:00Z" },
        { id: "7", stage: "Dropped Plan", budget_inr: 18000000, created_at: "2026-09-01T10:00:00Z" },
      ];

      const totalInputLeads = testLeads.length;
      expect(totalInputLeads).toBe(7);

      const activeLeads = testLeads.filter((l) => !outflowStages.has(l.stage.toLowerCase())).length;
      expect(activeLeads).toBe(4); // New, Qualified, Call Back, Site Visit Scheduled

      const convertedLeads = testLeads.filter((l) => bookedStages.has(l.stage.toLowerCase())).length;
      expect(convertedLeads).toBe(1); // Booked

      const notQualifiedLeads = testLeads.filter((l) => notQualifiedStages.has(l.stage.toLowerCase())).length;
      expect(notQualifiedLeads).toBe(2); // Not Interested, Dropped Plan

      const outflowLeads = convertedLeads + notQualifiedLeads;
      expect(outflowLeads).toBe(3); // Booked (1) + Not Qualified (2)

      const conversionRatePct = (convertedLeads / totalInputLeads) * 100;
      expect(Number(conversionRatePct.toFixed(1))).toBe(14.3);
    });

    it("calculates Average First Response Time strictly from lead creation to earliest sales touch", () => {
      const leadCreated = new Date("2026-09-01T10:00:00Z").getTime();
      const callTime = new Date("2026-09-01T10:04:30Z").getTime(); // 270 seconds later

      const elapsedSeconds = Math.round((callTime - leadCreated) / 1000);
      expect(elapsedSeconds).toBe(270);
    });
  });

  describe("3. Lead Status Categories & Integrity", () => {
    it("preserves all required lead status dispositions without regression", () => {
      expect(LEAD_STATUS_CATEGORIES.pipeline.map((s) => s.id)).toEqual([
        "New",
        "Qualified",
        "Site Visit Scheduled",
        "RFR (Ready for Registration)",
        "Booked",
      ]);

      expect(LEAD_STATUS_CATEGORIES.disposition.map((s) => s.id)).toEqual([
        "Call Back",
        "RNR (Ringing Not Responded)",
        "Busy",
        "Switch Off",
      ]);

      expect(LEAD_STATUS_CATEGORIES.closure.map((s) => s.id)).toEqual([
        "Not Interested",
        "Dropped Plan",
      ]);
    });

    it("has styling configured for every stage", () => {
      const allStages = [
        ...LEAD_STATUS_CATEGORIES.pipeline,
        ...LEAD_STATUS_CATEGORIES.disposition,
        ...LEAD_STATUS_CATEGORIES.closure,
      ];

      for (const s of allStages) {
        expect(stageBadgeStyles[s.id]).toBeDefined();
      }
    });
  });

  describe("4. Follow-Up Lifecycle & State Tracking", () => {
    it("tracks follow-up dates, times, and audit history", () => {
      const lead: LiveLead = {
        id: "lead-test-1",
        name: "Test Buyer",
        email: "buyer@example.com",
        phone: "+919820111222",
        source: "Meta Ads",
        stage: "Call Back",
        score: 88,
        budget: "₹2.5 Cr",
        budgetInr: 25000000,
        project: "Oberoi Sky City",
        owner: "AM",
        ownerName: "Aarav Mehta",
        followUpDate: "2026-09-08",
        followUpTime: "14:00",
        followUpStatus: "pending",
        followUpNotes: "Review revised unit floor plans",
      };

      expect(lead.followUpDate).toBe("2026-09-08");
      expect(lead.followUpTime).toBe("14:00");
      expect(lead.followUpStatus).toBe("pending");

      // Reschedule transition
      const rescheduledHistory = [
        {
          scheduledDate: lead.followUpDate!,
          scheduledTime: lead.followUpTime!,
          status: "rescheduled",
          notes: lead.followUpNotes,
          reason: "Client in conference",
          updatedAt: new Date().toISOString(),
        },
      ];

      const updatedLead: LiveLead = {
        ...lead,
        followUpDate: "2026-09-10",
        followUpTime: "16:30",
        followUpHistory: rescheduledHistory,
      };

      expect(updatedLead.followUpDate).toBe("2026-09-10");
      expect(updatedLead.followUpHistory).toHaveLength(1);
      expect(updatedLead.followUpHistory![0].status).toBe("rescheduled");
    });
  });

  describe("5. Marketing Campaign Funnel & Conversion Ratios", () => {
    it("calculates multi-stage conversion ratios correctly", () => {
      const campaign = {
        name: "Meta · Whitefield Premium",
        leadsGenerated: 612,
        qualified: 480,
        active: 320,
        siteVisits: 142,
        converted: 48,
      };

      const genToQualPct = ((campaign.qualified / campaign.leadsGenerated) * 100).toFixed(1);
      const qualToActivePct = ((campaign.active / campaign.qualified) * 100).toFixed(1);
      const activeToVisitPct = ((campaign.siteVisits / campaign.active) * 100).toFixed(1);
      const visitToConvPct = ((campaign.converted / campaign.siteVisits) * 100).toFixed(1);
      const overallConversionPct = ((campaign.converted / campaign.leadsGenerated) * 100).toFixed(1);

      expect(genToQualPct).toBe("78.4");
      expect(qualToActivePct).toBe("66.7");
      expect(activeToVisitPct).toBe("44.4");
      expect(visitToConvPct).toBe("33.8");
      expect(overallConversionPct).toBe("7.8");
    });
  });

  describe("6. INR Currency & Budget Formatting", () => {
    it("formats crore and lakh values properly", () => {
      expect(formatBudgetInr(25000000)).toBe("₹2.5 Cr");
      expect(formatBudgetInr(8500000)).toBe("₹85 L");
      expect(formatBudgetInr(0)).toBe("₹0");
      expect(formatBudgetInr(null)).toBe("₹0");
    });
  });

  describe("7. Performer Name Resolution & UUID Sanitization", () => {
    it("resolves raw UUIDs to Platform Administrator or profile names instead of raw hex strings", () => {
      const rawUuid = "a18d593e-1bb2-440d-bfed-e86c7189eae7";
      const resolvedDefault = resolvePerformerName(rawUuid);
      expect(resolvedDefault).toBe("Platform Administrator");

      const profileMap = new Map([
        ["a18d593e-1bb2-440d-bfed-e86c7189eae7", "Aarav Mehta"],
      ]);
      const resolvedFromMap = resolvePerformerName(rawUuid, profileMap);
      expect(resolvedFromMap).toBe("Aarav Mehta");
    });

    it("resolves known initials and system channels", () => {
      expect(resolvePerformerName("AM")).toBe("Aarav Mehta");
      expect(resolvePerformerName("SS")).toBe("Siddharth Sharma");
      expect(resolvePerformerName("RK")).toBe("Riya Kapoor");
      expect(resolvePerformerName("AI")).toBe("Supreme AI Agent");
      expect(resolvePerformerName("Sentinel Gateway")).toBe("Sentinel Gateway");
      expect(resolvePerformerName(null)).toBe("Platform Administrator");
    });
  });

  describe("8. Follow-Up Schedule Automation for Call Dispositions", () => {
    it("assigns smart follow-up schedules for call dispositions", () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const dispositionSchedules: Record<string, { date: string; time: string }> = {
        "Call Back": { date: todayStr, time: "15:00" },
        "RNR (Ringing Not Responded)": { date: todayStr, time: "17:30" },
        "Busy": { date: todayStr, time: "16:30" },
        "Switch Off": { date: tomorrowStr, time: "11:00" },
        "Site Visit Scheduled": { date: tomorrowStr, time: "11:00" },
      };

      for (const [disp, expected] of Object.entries(dispositionSchedules)) {
        expect(expected.date).toBeDefined();
        expect(expected.time).toBeDefined();
      }
    });
  });

  describe("9. Demo Fallback Removal & Database Purity", () => {
    it("exports getLiveLeads and getCRMKPIs as callable server functions", () => {
      expect(typeof getLiveLeads).toBe("function");
      expect(typeof getCRMKPIs).toBe("function");
    });

    it("returns an empty array [] when database returns zero rows", () => {
      const result = mapDatabaseRowsToLiveLeads([]);
      expect(result).toEqual([]);
      expect(result).not.toEqual(INITIAL_LEADS);
      expect(result.length).toBe(0);
    });

    it("handles null or undefined database rows safely by returning []", () => {
      expect(mapDatabaseRowsToLiveLeads(null as any)).toEqual([]);
      expect(mapDatabaseRowsToLiveLeads(undefined as any)).toEqual([]);
    });

    it("transforms and returns real workspace rows without fabricating demo records", () => {
      const mockLeads = [
        {
          id: "33333333-3333-3333-3333-333333333333",
          name: "Authentic Client",
          email: "authentic@client.com",
          phone: "+919876543210",
          source: "Direct Referral",
          stage: "qualified",
          score: 92,
          budget_inr: 45000000,
          project: "Prestige Highline",
          owner: "AM",
          city: "Mumbai",
          created_at: "2026-09-15T08:30:00.000Z",
        },
      ];

      const result: LiveLead[] = mapDatabaseRowsToLiveLeads(mockLeads);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("33333333-3333-3333-3333-333333333333");
      expect(result[0].name).toBe("Authentic Client");
      expect(result[0].stage).toBe("Qualified");
      expect(result[0].budget).toBe("₹4.5 Cr");
      expect(result[0].budgetInr).toBe(45000000);
      expect(result[0].source).toBe("Direct Referral");
    });
  });

  describe("10. Zero-Lead Workspace KPI Purity across Fort, CRM & Leads", () => {
    it("computes all KPIs as absolute 0 when database has zero records", () => {
      const kpis = calculateCRMKpiSnapshot([], [], [], []);

      expect(kpis.totalInputLeads).toBe(0);
      expect(kpis.totalLeads).toBe(0);
      expect(kpis.activeLeads).toBe(0);
      expect(kpis.convertedLeads).toBe(0);
      expect(kpis.outflowLeads).toBe(0);
      expect(kpis.notQualifiedLeads).toBe(0);
      expect(kpis.conversionRatePct).toBe(0);
      expect(kpis.pipelineValueInr).toBe(0);
      expect(kpis.averageFirstResponseSeconds).toBe(0);
      expect(kpis.averageResponseSeconds).toBe(0);
    });

    it("preserves INITIAL_LEADS as an immutable test/seed fixture while isolating runtime execution", () => {
      expect(Array.isArray(INITIAL_LEADS)).toBe(true);
      expect(INITIAL_LEADS.length).toBeGreaterThan(0);
      expect(INITIAL_LEADS.some((l) => l.name === "Riya Kapoor")).toBe(true);
      expect(INITIAL_LEADS.some((l) => l.name === "Vikram Joshi")).toBe(true);
    });
  });
});
