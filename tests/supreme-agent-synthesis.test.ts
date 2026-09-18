import { describe, it, expect } from "vitest";
import {
  formatINR,
  formatDuration,
  formatPercent,
  formatCount,
  synthesizeCapabilityResults,
  composeNarrative,
  synthesizeAgentResponse,
  REGISTERED_CAPABILITIES,
} from "../src/lib/supreme-agent-synthesis";

const WS = "00000000-0000-0000-0000-00000000d3f7";
const TS = "2026-01-01T00:00:00.000Z";

function entry(capability: string, result: unknown) {
  return { capability, sourceService: capability, workspaceId: WS, timestamp: TS, result };
}

describe("Intelligence Synthesis — value normalization & formatting", () => {
  it("formats INR into Cr / Lakh / raw (no data alteration)", () => {
    expect(formatINR(2291200000)).toBe("₹229.12 Cr");
    expect(formatINR(5000000)).toBe("₹50 Lakh");
    expect(formatINR(120000)).toBe("₹1.2 Lakh");
    expect(formatINR(5000)).toBe("₹5,000");
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(null)).toBe("₹0");
    expect(formatINR(undefined)).toBe("₹0");
  });

  it("formats seconds into human durations", () => {
    expect(formatDuration(14340)).toBe("3h 59m");
    expect(formatDuration(42)).toBe("42s");
    expect(formatDuration(120)).toBe("2m");
    expect(formatDuration(90000)).toBe("1d 1h");
    expect(formatDuration(0)).toBe("n/a");
    expect(formatDuration(null)).toBe("n/a");
  });

  it("formats percentages with sensible precision", () => {
    expect(formatPercent(19.35)).toBe("19.35%");
    expect(formatPercent(50)).toBe("50%");
    expect(formatPercent(100)).toBe("100%");
    expect(formatPercent(0)).toBe("0%");
  });

  it("formats counts as integers", () => {
    expect(formatCount(4.7)).toBe("5");
    expect(formatCount("12")).toBe("12");
  });
});

describe("Intelligence Synthesis — CRM normalization (no invented benchmarks)", () => {
  it("summarizes CRM facts without labelling good/poor when no target exists", async () => {
    const s = await synthesizeCapabilityResults([
      entry("crm.getCRMKPIs", { activeLeads: 50, conversionRatePct: 19.35, pipelineValueInr: 2291200000, averageResponseSeconds: 14340, generatedAt: TS }),
    ]);
    expect(s.facts.some((f) => f.label === "Active leads" && f.value === "50")).toBe(true);
    expect(s.facts.some((f) => f.label === "Conversion rate" && f.value === "19.35%")).toBe(true);
    expect(s.facts.some((f) => f.label === "Pipeline value" && f.value === "₹229.12 Cr")).toBe(true);
    expect(s.facts.some((f) => f.label === "Average response time" && f.value === "3h 59m")).toBe(true);
    expect(s.limitations.some((l) => l.type === "missing_benchmark")).toBe(true);
    const convSig = s.signals.find((sg) => sg.type === "conversion");
    expect(convSig).toBeDefined();
    expect(convSig!.description).toContain("cannot classify this as good or poor");
    const respSig = s.signals.find((sg) => sg.type === "response_time");
    expect(respSig!.description).toContain("surfaced for review rather than classified as a breach");
  });

describe("Intelligence Synthesis — empty dataset handling & no fabrication", () => {
  it("customer risk: states explicitly no risk data instead of inventing risk", async () => {
    const s = await synthesizeCapabilityResults([
      entry("customer.getContext", { customerSummary: { total: 0, active: 0, inactive: 0, avgEngagementScore: 0 }, levels: [], atRiskCustomers: [], highValueCustomers: [] }),
    ]);
    expect(s.signals.some((sg) => sg.type === "at_risk_customer")).toBe(false);
    expect(s.risks.length).toBe(0);
    expect(s.limitations.some((l) => l.type === "empty_dataset" && l.message.includes("no customer-risk conclusion"))).toBe(true);
  });

  it("at-risk customers produce a risk signal + review recommendation with suggested capability", async () => {
    const s = await synthesizeCapabilityResults([
      entry("customer.getContext", { customerSummary: { total: 20, active: 12, inactive: 3, avgEngagementScore: 55 }, levels: [], atRiskCustomers: [{ contactId: "c1" }], highValueCustomers: [] }),
    ]);
    expect(s.risks.some((r) => r.type === "at_risk_customer")).toBe(true);
    expect(s.recommendations.some((r) => r.title.includes("at-risk") && r.suggestedCapability === "customer.getContext")).toBe(true);
    expect(s.nextBestActions.some((a) => a.suggestedCapability === "customer.getContext")).toBe(true);
  });
});

describe("Intelligence Synthesis — recommendation evidence linkage & next-best-action", () => {
  it("links the slow-moving recommendation to its evidence and a real match capability", async () => {
    const s = await synthesizeCapabilityResults([
      entry("inventory.getContext", { inventorySummary: { total: 40, available: 25, sold: 15, availabilityPct: 62.5, totalValue: 3000000000 }, levels: [], slowMovingCount: 6, slowMovingList: [{ assetId: "a1" }], highValueUnsold: 4 }),
    ]);
    const rec = s.recommendations.find((r) => r.suggestedCapability === "agent.matchPropertyCustomer");
    expect(rec).toBeDefined();
    expect(rec!.evidenceRefs.length).toBeGreaterThan(0);
    expect(REGISTERED_CAPABILITIES).toContain(rec!.suggestedCapability!);
    expect(s.nextBestActions.some((a) => a.suggestedCapability === "agent.matchPropertyCustomer")).toBe(true);
  });
});

});

describe("Intelligence Synthesis — cross-domain no-fabrication", () => {
  it("supreme with no correlations reports the absence rather than inventing a story", async () => {
    const s = await synthesizeCapabilityResults([
      entry("supreme.orchestrate", { orchestration: { decisions: [], recommendations: [], correlations: [], approvalRequests: [], context: { evidenceTrail: [] } } }),
    ]);
    expect(s.limitations.some((l) => l.type === "unsupported_inference")).toBe(true);
    expect(s.risks.some((r) => r.type === "cross_domain_correlation")).toBe(false);
  });

  it("single market request yields no fabricated cross-domain correlation", async () => {
    const s = await synthesizeCapabilityResults([
      entry("market.getContext", { listings: [{ id: "l1" }], trends: [], opportunities: [], compliance: [], demandAnalysis: { overallDemandIndex: 80 }, priceAnalysis: { priceTrend: "rising" } }),
    ]);
    expect(s.signals.some((sg) => sg.type === "cross_domain_correlation")).toBe(false);
    expect(s.narrative.toLowerCase()).not.toContain("high-value unsold inventory and strong customer demand");
  });
});

describe("Intelligence Synthesis — natural language & evidence retention", () => {
  it("produces a natural-language narrative (headline, key facts, confidence), not raw JSON", async () => {
    const s = await synthesizeCapabilityResults([
      entry("crm.getCRMKPIs", { activeLeads: 50, conversionRatePct: 19.35, pipelineValueInr: 2291200000, averageResponseSeconds: 14340, generatedAt: TS }),
    ]);
    expect(s.narrative.length).toBeGreaterThan(0);
    expect(s.narrative).toContain("Key facts");
    expect(s.narrative).toContain("Confidence:");
    expect(s.narrative).toContain("without a good/poor classification");
    expect(s.narrative).not.toContain("2291200000");
    expect(s.narrative).not.toContain("{");
  });

  it("retains raw evidence (capability, raw result, workspace, timestamp, refs)", async () => {
    const raw = { activeLeads: 7, conversionRatePct: 10, pipelineValueInr: 9000000, averageResponseSeconds: 60 };
    const s = await synthesizeCapabilityResults([entry("crm.getCRMKPIs", raw)]);
    expect(s.evidence.length).toBe(1);
    expect(s.evidence[0].capability).toBe("crm.getCRMKPIs");
    expect(s.evidence[0].raw).toEqual(raw);
    expect(s.evidence[0].workspaceId).toBe(WS);
    expect(s.evidence[0].timestamp).toBe(TS);
    expect(s.evidence[0].evidenceRefs).toContain("crm.getCRMKPIs");
    expect(s.evidence[0].sourceService.length).toBeGreaterThan(0);
  });

  it("synthesizeAgentResponse advances confirmed step results into the model", async () => {
    const s = await synthesizeAgentResponse({
      evidence: {
        workspaceId: WS,
        timestamp: TS,
        finalStatus: "completed",
        stepResults: [
          { capability: "customer.getContext", status: "completed", result: { customerSummary: { total: 5, active: 5, inactive: 0, avgEngagementScore: 60 }, levels: [], atRiskCustomers: [], highValueCustomers: [] } },
        ],
      },
    });
    expect(s.facts.some((f) => f.label === "Customers" && f.value === "5")).toBe(true);
    expect(s.evidence[0].capability).toBe("customer.getContext");
  });
});

