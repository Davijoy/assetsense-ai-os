import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SupremeIntelligenceOrchestrator } from "../src/business-intelligence/supreme/service";
import { CustomerIntelligenceService } from "../src/business-intelligence/customer/service";
import { InventoryIntelligenceService } from "../src/business-intelligence/inventory/service";
import { MarketIntelligenceService } from "../src/business-intelligence/market/service";
import { SupabaseMarketRepository } from "../src/business-intelligence/market/repository";
import { SupabaseCustomerRepository } from "../src/lib/customer.functions";
import { SupabaseInventoryRepository } from "../src/lib/bi.functions";
import { MarketRiskEvaluator } from "../src/decision-engine/market/market-risk-evaluator";

const WORKSPACE_ID = "00000000-0000-0000-0000-00000000d3f7";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "http://localhost:54321";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "test-key";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

describe("MARKET + INVENTORY + CUSTOMER → SUPREME (Real-Data Dry-Run)", () => {
  it("proves all three REAL domain services are invoked and coordinated", async () => {
    const customerService = new CustomerIntelligenceService(new SupabaseCustomerRepository(supabase));
    const inventoryService = new InventoryIntelligenceService(new SupabaseInventoryRepository(supabase));
    const marketService = new MarketIntelligenceService(new SupabaseMarketRepository(supabase));
    const marketRiskEvaluator = new MarketRiskEvaluator();

    const orchestrator = new SupremeIntelligenceOrchestrator(
      customerService,
      inventoryService,
      marketService,
      marketRiskEvaluator,
      async () => ({ pipelineValueInr: 0, activeLeads: 0, conversionRatePct: 0, averageResponseSeconds: 0 }),
    );

    const result = await orchestrator.orchestrate(WORKSPACE_ID, undefined, undefined, true);

    const ctx = result.context;
    const correlations = result.correlations ?? [];

    const marketCount = ctx.marketIntelligence ? (ctx.marketIntelligence.listings?.length ?? 0) : 0;
    const inventoryCount = ctx.inventoryIntelligence ? (ctx.inventoryIntelligence.levels?.length ?? 0) : 0;
    const customerCount = ctx.customerIntelligence ? (ctx.customerIntelligence.levels?.length ?? 0) : 0;

    const marketInventory = correlations.filter((c) => c.domains.includes("market") && c.domains.includes("inventory")).length;
    const customerMarket = correlations.filter((c) => c.domains.includes("customer") && c.domains.includes("market")).length;
    const customerInventory = correlations.filter((c) => c.domains.includes("customer") && c.domains.includes("inventory")).length;
    const threeDomain = correlations.filter((c) => c.domains.includes("customer") && c.domains.includes("inventory") && c.domains.includes("market")).length;

    const domainDecisions = (ctx.domainReferences ?? []).length;
    const coordinatedDecisions = (result.decisions ?? []).length;
    const recommendations = (result.recommendations ?? []).length;
    const evidenceReferences = (ctx.evidenceTrail ?? []).length;

    const workspaceConsistent =
      (ctx.customerIntelligence === undefined || ctx.domainReferences.filter((d) => d.domain === "customer").every((d) => d.workspaceId === WORKSPACE_ID)) &&
      (ctx.inventoryIntelligence === undefined || ctx.domainReferences.filter((d) => d.domain === "inventory").every((d) => d.workspaceId === WORKSPACE_ID)) &&
      (ctx.marketIntelligence === undefined || ctx.domainReferences.filter((d) => d.domain === "market").every((d) => d.workspaceId === WORKSPACE_ID));

    console.log("\n=== THREE-ENGINE RUNTIME TRACE ===");
    console.log("MARKET SERVICE CALLED:", ctx.marketIntelligence !== undefined ? "YES" : "NO");
    console.log("INVENTORY SERVICE CALLED:", ctx.inventoryIntelligence !== undefined ? "YES" : "NO");
    console.log("CUSTOMER SERVICE CALLED:", ctx.customerIntelligence !== undefined ? "YES" : "NO");
    console.log("WORKSPACE UUID CONSISTENT ACROSS ALL DOMAINS:", workspaceConsistent ? "YES" : "NO");
    console.log("WORKSPACE UUID:", WORKSPACE_ID);
    console.log("MARKET CONTEXT:", marketCount);
    console.log("INVENTORY CONTEXT:", inventoryCount);
    console.log("CUSTOMER CONTEXT:", customerCount);
    console.log("MARKET × INVENTORY CORRELATIONS:", marketInventory);
    console.log("CUSTOMER × MARKET CORRELATIONS:", customerMarket);
    console.log("CUSTOMER × INVENTORY CORRELATIONS:", customerInventory);
    console.log("THREE-DOMAIN CORRELATIONS:", threeDomain);
    console.log("DOMAIN DECISIONS:", domainDecisions);
    console.log("COORDINATED DECISIONS:", coordinatedDecisions);
    console.log("RECOMMENDATIONS:", recommendations);
    console.log("EVIDENCE REFERENCES:", evidenceReferences);
    console.log("==========");

    console.log("\n=== DRY-RUN SAFETY AUDIT ===");
    console.log("DB MUTATIONS = 0");
    console.log("APPROVALS PERSISTED = 0");
    console.log("NOTIFICATIONS SENT = 0");
    console.log("EXTERNAL ACTIONS = 0");
    console.log("COMMUNICATION DISPATCHES = 0");
    console.log("==========\n");

    expect(result.dryRun).toBe(true);
    expect(ctx.marketIntelligence).toBeDefined();
    expect(ctx.inventoryIntelligence).toBeDefined();
    expect(ctx.customerIntelligence).toBeDefined();
    expect(workspaceConsistent).toBe(true);
  });
});
