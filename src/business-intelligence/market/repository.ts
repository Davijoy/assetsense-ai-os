/**
 * Market Intelligence Repository
 * Interface for market BI data access
 */

import type { MarketTrend, MarketOpportunity, MarketListing, MarketCompliance } from "./types";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace.service";

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
    const { data, error } = await this.supabase
      .from("market_trends")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("recorded_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: any) => ({
      id: row.id,
      category: row.category,
      trend: row.trend,
      strength: row.strength,
      timeWindow: row.time_window,
      metadata: row.metadata ?? {},
    }));
  }

  async getOpportunities(workspaceId: string): Promise<MarketOpportunity[]> {
    const { data, error } = await this.supabase
      .from("market_opportunities")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("discovered_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: any) => ({
      id: row.id,
      type: row.type,
      confidence: row.confidence,
      estimatedValue: row.estimated_value,
      details: row.details ?? {},
      discovered_at: row.discovered_at ?? new Date().toISOString(),
    }));
  }

  async getListings(workspaceId: string): Promise<MarketListing[]> {
    const { data, error } = await this.supabase
      .from("market_listings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("scraped_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: any) => ({
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
  }

  async getCompliance(workspaceId: string): Promise<MarketCompliance[]> {
    const { data, error } = await this.supabase
      .from("market_compliance")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("scraped_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: any) => ({
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
  }

  async saveTrend(trend: MarketTrend, workspaceId?: string): Promise<void> {
    const { error } = await this.supabase
      .from("market_trends")
      .upsert({
        id: trend.id,
        category: trend.category,
        trend: trend.trend,
        strength: trend.strength,
        time_window: trend.timeWindow,
        metadata: trend.metadata,
        workspace_id: trend.metadata.workspaceId ?? workspaceId ?? DEFAULT_WORKSPACE_ID,
        recorded_at: new Date().toISOString(),
      });

    if (error) throw new Error(error.message);
  }

  async recordOpportunity(opportunity: MarketOpportunity, workspaceId?: string): Promise<void> {
    const { error } = await this.supabase
      .from("market_opportunities")
      .upsert({
        id: opportunity.id,
        type: opportunity.type,
        confidence: opportunity.confidence,
        estimated_value: opportunity.estimatedValue,
        details: opportunity.details,
        discovered_at: opportunity.discoveredAt.toISOString(),
        workspace_id: opportunity.details.workspaceId ?? workspaceId ?? DEFAULT_WORKSPACE_ID,
      });

    if (error) throw new Error(error.message);
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
        scraped_at: listing.scrapedAt.toISOString(),
        workspace_id: listing.workspaceId,
        created_at: listing.createdAt.toISOString(),
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
        registration_date: compliance.registrationDate?.toISOString(),
        expiry_date: compliance.expiryDate?.toISOString(),
        url: compliance.url,
        notes: compliance.notes,
        scraped_at: compliance.scrapedAt.toISOString(),
        workspace_id: compliance.workspaceId,
        created_at: compliance.createdAt.toISOString(),
      });

    if (error) throw new Error(error.message);
  }
}