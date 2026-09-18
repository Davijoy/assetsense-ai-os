/**
 * Market Intelligence Repository
 * Interface for market BI data access
 */

import type { MarketTrend, MarketOpportunity, MarketListing, MarketCompliance } from "./types";
import {
  INITIAL_DB_LISTINGS,
  INITIAL_DB_TRENDS,
  INITIAL_DB_COMPLIANCE,
  mapDBListingsToBI,
  mapDBTrendsToBI,
  mapDBComplianceToBI,
} from "./initial-market-data";

export interface IMarketRepository {
  getTrends(workspaceId: string): Promise<MarketTrend[]>;
  getOpportunities(workspaceId: string): Promise<MarketOpportunity[]>;
  getListings(workspaceId: string): Promise<MarketListing[]>;
  getCompliance(workspaceId: string): Promise<MarketCompliance[]>;
  saveTrend(trend: MarketTrend, workspaceId?: string): Promise<void>;
  recordOpportunity(opportunity: MarketOpportunity, workspaceId?: string): Promise<void>;
  saveListing(listing: MarketListing, workspaceId?: string): Promise<void>;
  saveCompliance(compliance: MarketCompliance, workspaceId?: string): Promise<void>;
}

export class SupabaseMarketRepository implements IMarketRepository {
  constructor(private readonly supabase: any) {}

  async getTrends(workspaceId: string): Promise<MarketTrend[]> {
    try {
      const { data, error } = await this.supabase
        .from("market_trends")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("recorded_at", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("[SupabaseMarketRepository] Failed to fetch trends, falling back to baseline dataset:", error.message);
        return mapDBTrendsToBI(INITIAL_DB_TRENDS);
      }

      if (!data || data.length === 0) {
        return mapDBTrendsToBI(INITIAL_DB_TRENDS);
      }

      return data.map((row: any) => ({
        id: row.id,
        category: row.category || row.property_type || "general",
        trend: row.trend || ((row.price_change_pct ?? 0) > 10 ? "rising" : (row.price_change_pct ?? 0) < -5 ? "falling" : "stable"),
        strength: row.strength ?? Math.min(100, Math.max(0, row.demand_index ?? 50)),
        timeWindow: row.time_window || row.period || "current",
        metadata: row.metadata ?? {
          priceChangePct: row.price_change_pct,
          demandIndex: row.demand_index,
          city: row.city,
          locality: row.locality,
          propertyType: row.property_type,
          avgPricePerSqft: row.avg_price_per_sqft,
          medianPrice: row.median_price,
          totalListings: row.total_listings,
          workspaceId: row.workspace_id,
        },
      }));
    } catch (err: any) {
      console.warn("[SupabaseMarketRepository] Exception in getTrends, using baseline dataset:", err?.message);
      return mapDBTrendsToBI(INITIAL_DB_TRENDS);
    }
  }

  async getOpportunities(workspaceId: string): Promise<MarketOpportunity[]> {
    try {
      const { data, error } = await this.supabase
        .from("market_opportunities")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("discovered_at", { ascending: false })
        .limit(50);

      if (error) {
        return [];
      }

      return (data ?? []).map((row: any) => ({
        id: row.id,
        type: row.type,
        confidence: row.confidence,
        estimatedValue: row.estimated_value,
        details: row.details ?? {},
        discovered_at: row.discovered_at ?? new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  async getListings(workspaceId: string): Promise<MarketListing[]> {
    try {
      const { data, error } = await this.supabase
        .from("market_listings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("scraped_at", { ascending: false })
        .limit(200);

      if (error) {
        console.warn("[SupabaseMarketRepository] Failed to fetch listings, falling back to baseline dataset:", error.message);
        return mapDBListingsToBI(INITIAL_DB_LISTINGS);
      }

      if (!data || data.length === 0) {
        return mapDBListingsToBI(INITIAL_DB_LISTINGS);
      }

      return data.map((row: any) => ({
        id: row.id,
        source: row.source,
        city: row.city,
        locality: row.locality,
        title: row.title,
        propertyType: row.property_type,
        listingType: row.listing_type,
        price: row.price,
        priceUnit: row.price_unit,
        pricePerSqft: row.price_per_sqft,
        areaSqft: row.area_sqft,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        floor: row.floor,
        totalFloors: row.total_floors,
        ageYears: row.age_years,
        furnishing: row.furnishing,
        builder: row.builder,
        project: row.project,
        reraId: row.rera_id,
        url: row.url,
        scraped_at: row.scraped_at ?? new Date().toISOString(),
        workspaceId: row.workspace_id,
        created_at: row.created_at ?? new Date().toISOString(),
      }));
    } catch (err: any) {
      console.warn("[SupabaseMarketRepository] Exception in getListings, using baseline dataset:", err?.message);
      return mapDBListingsToBI(INITIAL_DB_LISTINGS);
    }
  }

  async getCompliance(workspaceId: string): Promise<MarketCompliance[]> {
    try {
      const { data, error } = await this.supabase
        .from("market_compliance")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("scraped_at", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("[SupabaseMarketRepository] Failed to fetch compliance, falling back to baseline dataset:", error.message);
        return mapDBComplianceToBI(INITIAL_DB_COMPLIANCE);
      }

      if (!data || data.length === 0) {
        return mapDBComplianceToBI(INITIAL_DB_COMPLIANCE);
      }

      return data.map((row: any) => ({
        id: row.id,
        source: row.source,
        recordType: row.record_type,
        projectName: row.project_name,
        promoter: row.promoter,
        reraNumber: row.rera_number,
        city: row.city,
        state: row.state,
        status: row.status,
        registration_date: row.registration_date ?? undefined,
        expiry_date: row.expiry_date ?? undefined,
        url: row.url,
        notes: row.notes,
        scraped_at: row.scraped_at ?? new Date().toISOString(),
        workspaceId: row.workspace_id,
        created_at: row.created_at ?? new Date().toISOString(),
      }));
    } catch (err: any) {
      console.warn("[SupabaseMarketRepository] Exception in getCompliance, using baseline dataset:", err?.message);
      return mapDBComplianceToBI(INITIAL_DB_COMPLIANCE);
    }
  }

  async saveTrend(trend: MarketTrend, workspaceId?: string): Promise<void> {
    const targetWorkspaceId = trend.metadata.workspaceId ?? workspaceId;
    if (!targetWorkspaceId) {
      throw new Error("saveTrend requires an explicit workspaceId; refusing to write to a default workspace");
    }
    const { error } = await this.supabase
      .from("market_trends")
      .upsert({
        id: trend.id,
        category: trend.category,
        trend: trend.trend,
        strength: trend.strength,
        time_window: trend.timeWindow,
        metadata: trend.metadata,
        workspace_id: targetWorkspaceId,
        recorded_at: new Date().toISOString(),
      });

    if (error) throw new Error(error.message);
  }

  async recordOpportunity(opportunity: MarketOpportunity, workspaceId?: string): Promise<void> {
    const targetWorkspaceId = opportunity.details?.workspaceId ?? workspaceId;
    if (!targetWorkspaceId) {
      return;
    }
    try {
      const { error } = await this.supabase
        .from("market_opportunities")
        .upsert({
          id: opportunity.id,
          type: opportunity.type,
          confidence: opportunity.confidence,
          estimated_value: opportunity.estimatedValue,
          details: opportunity.details,
          discovered_at: opportunity.discovered_at,
          workspace_id: targetWorkspaceId,
        });

      if (error) {
        console.warn("[SupabaseMarketRepository] recordOpportunity failed:", error.message);
      }
    } catch (err: any) {
      console.warn("[SupabaseMarketRepository] recordOpportunity exception:", err?.message);
    }
  }

  async saveListing(listing: MarketListing): Promise<void> {
    const { error } = await this.supabase
      .from("market_listings")
      .upsert({
        id: listing.id,
        source: listing.source,
        city: listing.city,
        locality: listing.locality,
        title: listing.title,
        property_type: listing.propertyType,
        listing_type: listing.listingType,
        price: listing.price,
        price_unit: listing.priceUnit,
        price_per_sqft: listing.pricePerSqft,
        area_sqft: listing.areaSqft,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        floor: listing.floor,
        total_floors: listing.totalFloors,
        age_years: listing.ageYears,
        furnishing: listing.furnishing,
        builder: listing.builder,
        project: listing.project,
        rera_id: listing.reraId,
        url: listing.url,
        scraped_at: listing.scraped_at,
        workspace_id: listing.workspaceId,
        created_at: listing.created_at,
      });

    if (error) throw new Error(error.message);
  }

  async saveCompliance(compliance: MarketCompliance): Promise<void> {
    const { error } = await this.supabase
      .from("market_compliance")
      .upsert({
        id: compliance.id,
        source: compliance.source,
        record_type: compliance.recordType,
        project_name: compliance.projectName,
        promoter: compliance.promoter,
        rera_number: compliance.reraNumber,
        city: compliance.city,
        state: compliance.state,
        status: compliance.status,
        registration_date: compliance.registration_date,
        expiry_date: compliance.expiry_date,
        url: compliance.url,
        notes: compliance.notes,
        scraped_at: compliance.scraped_at,
        workspace_id: compliance.workspaceId,
        created_at: compliance.created_at,
      });

    if (error) throw new Error(error.message);
  }
}