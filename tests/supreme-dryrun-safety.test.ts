import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MarketIntelligenceService } from "../src/business-intelligence/market/service";
import type {
  IMarketRepository,
} from "../src/business-intelligence/market/repository";
import type {
  MarketTrend,
  MarketOpportunity,
  MarketListing,
  MarketCompliance,
} from "../src/business-intelligence/market/types";

const WORKSPACE_ID = "00000000-0000-0000-0000-00000000d3f7";

/**
 * In-memory fake repository — used ONLY to prove the dry-run guard is
 * reachable and effective. Production wiring still uses the real
 * SupabaseMarketRepository; no real repository is replaced.
 */
class RecordingMarketRepository implements IMarketRepository {
  recordOpportunityCalls: MarketOpportunity[] = [];
  readCalls: Record<string, number> = {
    getTrends: 0,
    getOpportunities: 0,
    getListings: 0,
    getCompliance: 0,
  };

  async getTrends(_workspaceId: string): Promise<MarketTrend[]> {
    this.readCalls.getTrends++;
    return [];
  }
  async getOpportunities(_workspaceId: string): Promise<MarketOpportunity[]> {
    this.readCalls.getOpportunities++;
    return [];
  }
  async getListings(_workspaceId: string): Promise<MarketListing[]> {
    this.readCalls.getListings++;
    return [
      {
        id: "lst-1",
        source: "housing",
        city: "Bengaluru",
        locality: "Indiranagar",
        propertyType: "apartment",
        listingType: "sale",
        price: 8000000,
        priceUnit: "INR",
        pricePerSqft: 4500,
        areaSqft: 1200,
        bedrooms: 2,
        scraped_at: new Date().toISOString(),
        workspaceId: WORKSPACE_ID,
        created_at: new Date().toISOString(),
      },
    ];
  }
  async getCompliance(_workspaceId: string): Promise<MarketCompliance[]> {
    this.readCalls.getCompliance++;
    // A registered project yields a detected "new_project_registration"
    // opportunity in non-dry-run, giving recordOpportunity something to persist.
    return [
      {
        id: "comp-1",
        source: "rera",
        recordType: "project_registration",
        projectName: "Sentinel Residences",
        reraNumber: "RERA-BLR-001",
        city: "Bengaluru",
        state: "Karnataka",
        status: "registered",
        scraped_at: new Date().toISOString(),
        workspaceId: WORKSPACE_ID,
        created_at: new Date().toISOString(),
      },
    ];
  }
  async saveTrend(_trend: MarketTrend, _workspaceId?: string): Promise<void> {}
  async recordOpportunity(opportunity: MarketOpportunity, _workspaceId?: string): Promise<void> {
    this.recordOpportunityCalls.push(opportunity);
  }
  async saveListing(_listing: MarketListing, _workspaceId?: string): Promise<void> {}
  async saveCompliance(_compliance: MarketCompliance, _workspaceId?: string): Promise<void> {}
}

describe("Supreme dry-run safety — DEFECT 2 (market opportunity DB write)", () => {
  it("dryRun=true: real market READS execute, but recordOpportunity is NOT invoked", async () => {
    const repo = new RecordingMarketRepository();
    const service = new MarketIntelligenceService(repo as unknown as IMarketRepository);

    const ctx = await service.getContext(WORKSPACE_ID, true);

    // Real reads still executed during dry-run.
    expect(repo.readCalls.getTrends).toBeGreaterThan(0);
    expect(repo.readCalls.getOpportunities).toBeGreaterThan(0);
    expect(repo.readCalls.getListings).toBeGreaterThan(0);
    expect(repo.readCalls.getCompliance).toBeGreaterThan(0);

    // No persistence write during dry-run (DB MUTATIONS = 0).
    expect(repo.recordOpportunityCalls).toHaveLength(0);

    // Detected opportunities are still computed and returned in-memory.
    expect(ctx.opportunities.length).toBeGreaterThan(0);
    expect(ctx.opportunities.some((o) => o.type === "new_project_registration")).toBe(true);
  });

  it("dryRun=false: production persistence behavior is preserved (recordOpportunity invoked)", async () => {
    const repo = new RecordingMarketRepository();
    const service = new MarketIntelligenceService(repo as unknown as IMarketRepository);

    const ctx = await service.getContext(WORKSPACE_ID, false);

    // Production behavior unchanged: detected opportunities are persisted.
    expect(repo.recordOpportunityCalls.length).toBeGreaterThan(0);
    expect(ctx.opportunities.length).toBeGreaterThan(0);
  });
});

describe("Supreme dry-run safety — DEFECT 1 (communication / notification dispatch)", () => {
  it("publishOrchestrationEvents is guarded behind the dryRun flag in runSupremeOrchestration", () => {
    const libSrc = readFileSync(
      resolve(__dirname, "../src/lib/supreme-orchestrator.functions.ts"),
      "utf8",
    );

    // The publish call must be wrapped in a dry-run guard so that NO approval,
    // NO recommendation, and NO communication-hub event is dispatched in dry-run.
    const guarded = /if\s*\(!\s*\(\s*request\.dryRun\s*\?\?\s*false\s*\)\s*\)\s*\{\s*await\s+publishOrchestrationEvents\(result\)\s*;/s;
    expect(guarded.test(libSrc)).toBe(true);

    // Any bare `await publishOrchestrationEvents(result);` must be indented one
    // level deeper than the orchestrator call (proving it sits inside the guard
    // block) rather than as a top-level statement in the function body.
    const barePublish = /^\s{2}await\s+publishOrchestrationEvents\(result\);\s*$/m;
    const topLevel = /^\s{4}await\s+publishOrchestrationEvents\(result\);\s*$/m;
    expect(barePublish.test(libSrc)).toBe(false);
    expect(topLevel.test(libSrc)).toBe(false);
  });
});