/**
 * Market Intelligence Service
 * Orchestrates market analytics and opportunity identification
 */

import type { MarketTrend, MarketOpportunity, MarketIntelligence, MarketListing, MarketCompliance } from "./types";
import type { IMarketRepository } from "./repository";

// ─── Price change thresholds ───
const PRICE_SURGE_THRESHOLD_PCT = 15;
const PRICE_DROP_THRESHOLD_PCT = -10;
const HIGH_DEMAND_THRESHOLD = 70;
const LOW_DEMAND_THRESHOLD = 30;

export class MarketIntelligenceService {
  constructor(private repository: IMarketRepository) {}

  /**
   * Fetches raw market trends from the repository.
   */
  async getTrends(workspaceId: string): Promise<MarketTrend[]> {
    return this.repository.getTrends(workspaceId);
  }

  /**
   * Fetches raw market opportunities from the repository.
   */
  async getOpportunities(workspaceId: string): Promise<MarketOpportunity[]> {
    return this.repository.getOpportunities(workspaceId);
  }

  /**
   * Fetches raw market listings from the repository.
   */
  async getListings(workspaceId: string): Promise<MarketListing[]> {
    return this.repository.getListings(workspaceId);
  }

  /**
   * Fetches raw market compliance records from the repository.
   */
  async getCompliance(workspaceId: string): Promise<MarketCompliance[]> {
    return this.repository.getCompliance(workspaceId);
  }

  /**
   * Calculates a real summary from live market data.
   */
  async getSummary(workspaceId: string): Promise<Record<string, unknown>> {
    const [trends, listings, compliance] = await Promise.all([
      this.getTrends(workspaceId),
      this.getListings(workspaceId),
      this.getCompliance(workspaceId),
    ]);
    return this.calculateSummary(trends, listings, compliance) as unknown as Record<string, unknown>;
  }

  /**
   * Returns the full intelligence context: trends, opportunities, listings, compliance,
   * summary, groupings, price analysis, demand analysis, and opportunities.
   */
  async getContext(workspaceId: string, dryRun = false): Promise<MarketIntelligence> {
    const [trends, opportunities, listings, compliance] = await Promise.all([
      this.getTrends(workspaceId),
      this.getOpportunities(workspaceId),
      this.getListings(workspaceId),
      this.getCompliance(workspaceId),
    ]);

    const summary = this.calculateSummary(trends, listings, compliance);
    const groupings = this.calculateGroupings(listings);
    const priceAnalysis = this.calculatePriceAnalysis(listings);
    const demandAnalysis = this.calculateDemandAnalysis(listings, trends);
    const opportunities_detected = this.identifyOpportunities(listings, trends, compliance);

    // Persist newly identified opportunities — SAFETY: skipped in dry-run so no
    // DB write to market_opportunities occurs (DB MUTATIONS=0). Real market
    // READS above remain live, and detected opportunities are still returned
    // in-memory for the caller.
    if (!dryRun) {
      for (const opportunity of opportunities_detected) {
        await this.repository.recordOpportunity(opportunity, workspaceId);
      }
    }

    return {
      trends,
      opportunities: opportunities_detected,
      listings,
      compliance,
      summary,
      groupings,
      priceAnalysis,
      demandAnalysis,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates recommendations from the intelligence context.
   * Delegates to the decision engine in the full cycle; this method
   * provides a direct BI-layer view for testing.
   */
  async getRecommendations(
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    const context = await this.getContext(workspaceId);
    return [
      {
        workspaceId,
        generatedAt: context.generatedAt,
        summary: context.summary,
        opportunities: context.opportunities.length,
        priceAnalysis: context.priceAnalysis,
        demandAnalysis: context.demandAnalysis,
      },
    ];
  }

  // ─── Private calculation helpers ──────────────────────────────────

  private calculateSummary(
    trends: MarketTrend[],
    listings: MarketListing[],
    compliance: MarketCompliance[],
  ): Record<string, string | number | boolean | null | undefined> {
    const totalListings = listings.length;
    const totalTrends = trends.length;
    const totalCompliance = compliance.length;

    // Cities covered
    const cities = new Set(listings.map((l) => l.city).filter(Boolean));
    const citiesCovered = Array.from(cities);

    // Property types covered
    const propertyTypes = new Set(listings.map((l) => l.propertyType).filter(Boolean));
    const propertyTypesCovered = Array.from(propertyTypes);

    // Average price per sqft
    const listingsWithPrice = listings.filter((l) => l.pricePerSqft !== undefined && l.pricePerSqft! > 0);
    const avgPricePerSqft = listingsWithPrice.length > 0
      ? listingsWithPrice.reduce((sum, l) => sum + (l.pricePerSqft ?? 0), 0) / listingsWithPrice.length
      : 0;

    // Median price per sqft
    const sortedPrices = listingsWithPrice.map((l) => l.pricePerSqft!).sort((a, b) => a - b);
    const medianPricePerSqft = sortedPrices.length > 0
      ? sortedPrices[Math.floor(sortedPrices.length / 2)]
      : 0;

    // Price change percentage (from trends)
    const trendsWithChange = trends.filter((t) => t.metadata?.priceChangePct !== undefined);
    const avgPriceChangePct = trendsWithChange.length > 0
      ? trendsWithChange.reduce((sum, t) => sum + (t.metadata.priceChangePct ?? 0), 0) / trendsWithChange.length
      : 0;

    // Demand index (from trends)
    const trendsWithDemand = trends.filter((t) => t.metadata?.demandIndex !== undefined);
    const avgDemandIndex = trendsWithDemand.length > 0
      ? trendsWithDemand.reduce((sum, t) => sum + (t.metadata.demandIndex ?? 0), 0) / trendsWithDemand.length
      : 50;

    // Compliance status breakdown
    const complianceByStatus = compliance.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalListings,
      totalTrends,
      totalCompliance,
      citiesCovered: citiesCovered.join(","),
      propertyTypesCovered: propertyTypesCovered.join(","),
      avgPricePerSqft: Math.round(avgPricePerSqft * 100) / 100,
      medianPricePerSqft: Math.round(medianPricePerSqft * 100) / 100,
      priceChangePct: Math.round(avgPriceChangePct * 100) / 100,
      demandIndex: Math.round(avgDemandIndex * 100) / 100,
      complianceByStatus: JSON.stringify(complianceByStatus),
      topOpportunities: 0, // Will be calculated in identifyOpportunities
    };
  }

  private calculateGroupings(listings: MarketListing[]): {
    byCity: { name: string; count: number; avgPricePerSqft: number; totalValue: number }[];
    byPropertyType: { name: string; count: number; avgPricePerSqft: number; totalValue: number }[];
    byListingType: { name: string; count: number; avgPricePerSqft: number; totalValue: number }[];
    bySource: { name: string; count: number; avgPricePerSqft: number; totalValue: number }[];
  } {
    return {
      byCity: this.groupBy(listings, (l) => l.city ?? "Unknown"),
      byPropertyType: this.groupBy(listings, (l) => l.propertyType),
      byListingType: this.groupBy(listings, (l) => l.listingType),
      bySource: this.groupBy(listings, (l) => l.source),
    };
  }

  private groupBy(
    listings: MarketListing[],
    keyFn: (listing: MarketListing) => string,
  ): { name: string; count: number; avgPricePerSqft: number; totalValue: number }[] {
    const map = new Map<string, { name: string; count: number; avgPricePerSqft: number; totalValue: number }>();

    for (const listing of listings) {
      const key = keyFn(listing);
      const existing = map.get(key) ?? {
        name: key,
        count: 0,
        avgPricePerSqft: 0,
        totalValue: 0,
      };

      existing.count++;
      existing.totalValue += listing.price ?? 0;

      if (listing.pricePerSqft !== undefined && listing.pricePerSqft > 0) {
        existing.avgPricePerSqft =
          (existing.avgPricePerSqft * (existing.count - 1) + listing.pricePerSqft) / existing.count;
      }

      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }

  private calculatePriceAnalysis(listings: MarketListing[]): {
    priceRanges: { range: string; count: number; percentage: number }[];
    avgPriceByCity: { city: string; avgPrice: number; avgPricePerSqft: number; count: number }[];
    priceTrend: "rising" | "falling" | "stable";
  } {
    const listingsWithPrice = listings.filter((l) => l.price !== undefined && l.price! > 0);
    const total = listingsWithPrice.length;

    // Price ranges
    const ranges = [
      { label: "Under 50L", min: 0, max: 5_000_000 },
      { label: "50L - 1Cr", min: 5_000_000, max: 10_000_000 },
      { label: "1Cr - 2Cr", min: 10_000_000, max: 20_000_000 },
      { label: "2Cr - 5Cr", min: 20_000_000, max: 50_000_000 },
      { label: "5Cr+", min: 50_000_000, max: Infinity },
    ];

    const priceRanges = ranges.map((r) => {
      const count = listingsWithPrice.filter((l) => (l.price ?? 0) >= r.min && (l.price ?? 0) < r.max).length;
      return {
        range: r.label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
      };
    });

    // Avg price by city
    const cityMap = new Map<string, { totalPrice: number; totalPricePerSqft: number; count: number; countPerSqft: number }>();
    for (const listing of listingsWithPrice) {
      const city = listing.city ?? "Unknown";
      const existing = cityMap.get(city) ?? { totalPrice: 0, totalPricePerSqft: 0, count: 0, countPerSqft: 0 };
      existing.totalPrice += listing.price ?? 0;
      existing.count++;
      if (listing.pricePerSqft !== undefined && listing.pricePerSqft > 0) {
        existing.totalPricePerSqft += listing.pricePerSqft;
        existing.countPerSqft++;
      }
      cityMap.set(city, existing);
    }

    const avgPriceByCity = Array.from(cityMap.entries())
      .map(([city, data]) => ({
        city,
        avgPrice: data.count > 0 ? Math.round(data.totalPrice / data.count) : 0,
        avgPricePerSqft: data.countPerSqft > 0 ? Math.round((data.totalPricePerSqft / data.countPerSqft) * 100) / 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Price trend (simplified - would use historical data in production)
    const priceTrend = "stable" as const;

    return { priceRanges, avgPriceByCity, priceTrend };
  }

  private calculateDemandAnalysis(
    listings: MarketListing[],
    trends: MarketTrend[],
  ): {
    demandByCity: { city: string; demandIndex: number; listingCount: number; avgDaysOnMarket: number }[];
    demandByPropertyType: { propertyType: string; demandIndex: number; listingCount: number }[];
    overallDemandIndex: number;
    demandTrend: "increasing" | "decreasing" | "stable";
  } {
    // Demand by city (using trends data where available)
    const cityDemandMap = new Map<string, { demandIndex: number; listingCount: number }>();
    for (const listing of listings) {
      const city = listing.city ?? "Unknown";
      const existing = cityDemandMap.get(city) ?? { demandIndex: 50, listingCount: 0 };
      existing.listingCount++;
      cityDemandMap.set(city, existing);
    }

    // Override with trend data
    for (const trend of trends) {
      if (trend.metadata?.city && trend.metadata?.demandIndex !== undefined) {
        const city = trend.metadata.city as string;
        const existing = cityDemandMap.get(city) ?? { demandIndex: 50, listingCount: 0 };
        existing.demandIndex = trend.metadata.demandIndex as number;
        cityDemandMap.set(city, existing);
      }
    }

    const demandByCity = Array.from(cityDemandMap.entries())
      .map(([city, data]) => ({
        city,
        demandIndex: data.demandIndex,
        listingCount: data.listingCount,
        avgDaysOnMarket: 0, // Would need historical data
      }))
      .sort((a, b) => b.demandIndex - a.demandIndex);

    // Demand by property type
    const typeDemandMap = new Map<string, { demandIndex: number; listingCount: number }>();
    for (const listing of listings) {
      const existing = typeDemandMap.get(listing.propertyType) ?? { demandIndex: 50, listingCount: 0 };
      existing.listingCount++;
      typeDemandMap.set(listing.propertyType, existing);
    }

    for (const trend of trends) {
      if (trend.metadata?.propertyType && trend.metadata?.demandIndex !== undefined) {
        const existing = typeDemandMap.get(trend.metadata.propertyType as string) ?? { demandIndex: 50, listingCount: 0 };
        existing.demandIndex = trend.metadata.demandIndex as number;
        typeDemandMap.set(trend.metadata.propertyType as string, existing);
      }
    }

    const demandByPropertyType = Array.from(typeDemandMap.entries())
      .map(([propertyType, data]) => ({
        propertyType,
        demandIndex: data.demandIndex,
        listingCount: data.listingCount,
      }))
      .sort((a, b) => b.demandIndex - a.demandIndex);

    // Overall demand index
    const overallDemandIndex = demandByCity.length > 0
      ? Math.round(demandByCity.reduce((sum, d) => sum + d.demandIndex, 0) / demandByCity.length)
      : 50;

    // Demand trend (simplified)
    const demandTrend = "stable" as const;

    return { demandByCity, demandByPropertyType, overallDemandIndex, demandTrend };
  }

  private identifyOpportunities(
    listings: MarketListing[],
    trends: MarketTrend[],
    compliance: MarketCompliance[],
  ): MarketOpportunity[] {
    const opportunities: MarketOpportunity[] = [];

    // 1. Price surge opportunities (areas with high price growth)
    const priceSurgeTrends = trends.filter(
      (t) => (t.metadata?.priceChangePct ?? 0) > PRICE_SURGE_THRESHOLD_PCT
    );
    for (const trend of priceSurgeTrends) {
      if (trend.metadata?.city) {
        opportunities.push({
          id: `opp-price-surge-${trend.metadata.city}-${Date.now()}`,
          type: "price_surge",
          confidence: Math.min(0.9, 0.5 + (trend.metadata?.priceChangePct ?? 0) / 100),
          estimatedValue: 0,
          details: {
            city: trend.metadata.city,
            priceChangePct: trend.metadata.priceChangePct,
            propertyType: trend.metadata.propertyType,
            period: trend.timeWindow,
          },
          discovered_at: new Date().toISOString(),
        });
      }
    }

    // 2. High demand opportunities
    const highDemandTrends = trends.filter(
      (t) => (t.metadata?.demandIndex ?? 0) > HIGH_DEMAND_THRESHOLD
    );
    for (const trend of highDemandTrends) {
      if (trend.metadata?.city) {
        opportunities.push({
          id: `opp-high-demand-${trend.metadata.city}-${Date.now()}`,
          type: "high_demand",
          confidence: Math.min(0.9, 0.5 + (trend.metadata?.demandIndex ?? 0) / 200),
          estimatedValue: 0,
          details: {
            city: trend.metadata.city,
            demandIndex: trend.metadata.demandIndex,
            propertyType: trend.metadata.propertyType,
            period: trend.timeWindow,
          },
          discovered_at: new Date().toISOString(),
        });
      }
    }

    // 3. Undervalued listings (price per sqft significantly below city average)
    const cityAvgPricePerSqft = new Map<string, number>();
    const cityListings = new Map<string, MarketListing[]>();
    for (const listing of listings) {
      if (listing.pricePerSqft !== undefined && listing.pricePerSqft > 0) {
        const city = listing.city ?? "Unknown";
        if (!cityListings.has(city)) cityListings.set(city, []);
        cityListings.get(city)!.push(listing);
      }
    }
    for (const [city, cityListingsArr] of cityListings.entries()) {
      const avg = cityListingsArr.reduce((sum, l) => sum + (l.pricePerSqft ?? 0), 0) / cityListingsArr.length;
      cityAvgPricePerSqft.set(city, avg);
    }
    for (const listing of listings) {
      if (listing.pricePerSqft !== undefined && listing.pricePerSqft > 0) {
        const cityAvg = cityAvgPricePerSqft.get(listing.city ?? "Unknown") ?? 0;
        if (cityAvg > 0 && listing.pricePerSqft < cityAvg * 0.7) { // 30% below average
          opportunities.push({
            id: `opp-undervalued-${listing.id}`,
            type: "undervalued_listing",
            confidence: 0.7,
            estimatedValue: (cityAvg - listing.pricePerSqft) * (listing.areaSqft ?? 1000),
            details: {
              listingId: listing.id,
              city: listing.city,
              locality: listing.locality,
              pricePerSqft: listing.pricePerSqft,
              cityAvgPricePerSqft: cityAvg,
              discountPct: Math.round((1 - listing.pricePerSqft / cityAvg) * 100),
            },
            discovered_at: new Date().toISOString(),
          });
        }
      }
    }

    // 4. Compliance opportunities (newly registered projects)
    const newRegistrations = compliance.filter(
      (c) => c.recordType === "project_registration" && c.status === "registered"
    );
    for (const record of newRegistrations.slice(0, 10)) {
      opportunities.push({
        id: `opp-new-project-${record.reraNumber}`,
        type: "new_project_registration",
        confidence: 0.8,
        estimatedValue: 0,
        details: {
          reraNumber: record.reraNumber,
          projectName: record.projectName,
          city: record.city,
          promoter: record.promoter,
          registration_date: record.registration_date ?? "",
        },
        discovered_at: new Date().toISOString(),
      });
    }

    // 5. Low supply / high demand gaps
    const lowSupplyCities = Array.from(cityListings.entries())
      .filter(([, listings]) => listings.length < 10)
      .map(([city]) => city);
    for (const city of lowSupplyCities) {
      const demandTrend = trends.find(
        (t) => t.metadata?.city === city && (t.metadata?.demandIndex ?? 0) > HIGH_DEMAND_THRESHOLD
      );
      if (demandTrend) {
        opportunities.push({
          id: `opp-supply-gap-${city}-${Date.now()}`,
          type: "supply_demand_gap",
          confidence: 0.75,
          estimatedValue: 0,
          details: {
            city,
            listingCount: cityListings.get(city)?.length ?? 0,
            demandIndex: demandTrend.metadata?.demandIndex,
            propertyType: demandTrend.metadata?.propertyType,
          },
          discovered_at: new Date().toISOString(),
        });
      }
    }

    return opportunities;
  }
}