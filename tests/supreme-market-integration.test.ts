import { describe, it, expect } from "vitest";
import { SupremeIntelligenceOrchestrator } from "../src/business-intelligence/supreme/service";
import { MarketIntelligenceService } from "../src/business-intelligence/market/service";
import { SupabaseMarketRepository } from "../src/business-intelligence/market/repository";
import { MarketRiskEvaluator } from "../src/decision-engine/market/market-risk-evaluator";

describe("Market → Supreme Intelligence Integration (Dry-Run)", () => {
  it("should connect real Market service to Supreme orchestrator", async () => {
    const WORKSPACE_ID = "00000000-0000-0000-0000-00000000d3f7";

    // Create REAL Market service (not mock)
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    };

    const marketRepository = new SupabaseMarketRepository(mockSupabase as any);
    const marketService = new MarketIntelligenceService(marketRepository);
    const marketRiskEvaluator = new MarketRiskEvaluator();

    // Create Supreme orchestrator with REAL Market service
    const orchestrator = new SupremeIntelligenceOrchestrator(
      { getContext: async () => ({ atRiskCustomers: [], engagementScores: [], churnRisk: [], generatedAt: new Date().toISOString() }) },
      { getContext: async () => ({ levels: [], slowMoving: [], highValueUnsold: [], generatedAt: new Date().toISOString() }) },
      marketService,
      marketRiskEvaluator,
      async () => ({ pipelineValueInr: 0, activeLeads: 0, conversionRatePct: 0, averageResponseSeconds: 0 })
    );

    // Execute dry-run orchestration
    const result = await orchestrator.orchestrate(WORKSPACE_ID, undefined, undefined, true);

    // Capture runtime trace
    console.log("\n=== RUNTIME TRACE ===");
    console.log("WORKSPACE UUID:", WORKSPACE_ID);
    console.log("MARKET LISTINGS:", result.context?.marketIntelligence?.listings?.length ?? 0);
    console.log("MARKET TRENDS:", result.context?.marketIntelligence?.trends?.length ?? 0);
    console.log("MARKET COMPLIANCE:", result.context?.marketIntelligence?.compliance?.length ?? 0);
    console.log("MARKET OPPORTUNITIES:", result.context?.marketIntelligence?.opportunities?.length ?? 0);
    console.log("SUPREME CORRELATIONS:", result.correlations?.length ?? 0);
    console.log("SUPREME DECISIONS:", result.decisions?.length ?? 0);
    console.log("SUPREME RECOMMENDATIONS:", result.recommendations?.length ?? 0);
    console.log("SIMULATED APPROVALS:", result.approvalRequests?.length ?? 0);
    console.log("TRACE STEPS:", result.trace?.steps?.length ?? 0);
    console.log("DRY RUN:", result.dryRun);

    // Verify dry-run safety
    expect(result.dryRun).toBe(true);
    expect(result.approvalRequests).toHaveLength(0);
    expect(result.context.marketIntelligence).toBeDefined();
    expect(result.context.marketIntelligence).toBeDefined();
  });
});
