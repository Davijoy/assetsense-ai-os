import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";
import { InMemoryEventBus } from "@/lib/event-fabric/in-memory-event-bus";
import { EventMetadata } from "@/lib/event-fabric/event-metadata";
import { EventClassification } from "@/lib/event-fabric/event-classification";
import { EventPriority } from "@/lib/event-fabric/event-priority";
import { generateCorrelationId } from "@/lib/event-fabric/correlation-id";
import { generateCausationId } from "@/lib/event-fabric/causation-id";
import {
  MarketDataIngestedEvent,
  MarketSnapshotRequestedEvent,
  MarketSnapshotProcessedEvent,
  MarketRiskDetectedEvent,
  MarketRecommendationCreatedEvent,
  type MarketDataIngestedPayload,
  type MarketRiskDetectedPayload,
} from "@/lib/event-fabric/market-events";

// ─── Zod Validation Schemas ────────────────────────────────────────
const ListingSchema = z.object({
  id: z.string().optional(),
  source: z.enum(["magicbricks", "99acres", "housing"]),
  city: z.string().min(1),
  locality: z.string().optional(),
  title: z.string().optional(),
  property_type: z.enum(["apartment", "villa", "plot", "commercial"]),
  listing_type: z.enum(["sale", "rent"]),
  price: z.number().positive().optional(),
  price_unit: z.string().default("INR"),
  price_per_sqft: z.number().positive().optional(),
  area_sqft: z.number().positive().optional(),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().int().positive().optional(),
  floor: z.string().optional(),
  total_floors: z.number().int().positive().optional(),
  age_years: z.number().int().positive().optional(),
  furnishing: z.enum(["furnished", "semi-furnished", "unfurnished"]).optional(),
  builder: z.string().optional(),
  project: z.string().optional(),
  rera_id: z.string().optional(),
  url: z.string().url().optional(),
  scraped_at: z.string().datetime(),
});

const TrendSchema = z.object({
  city: z.string().min(1),
  locality: z.string().min(1),
  property_type: z.enum(["apartment", "villa", "plot", "commercial"]),
  avg_price_per_sqft: z.number().positive(),
  median_price: z.number().positive().optional(),
  total_listings: z.number().int().positive(),
  price_change_pct: z.number().optional(),
  demand_index: z.number().min(0).max(100).optional(),
  source: z.enum(["magicbricks", "99acres", "computed"]),
  period: z.string().regex(/^\d{4}-Q[1-4]$/),
  recorded_at: z.string().datetime().optional(),
});

const ComplianceSchema = z.object({
  source: z.string().min(1),
  record_type: z.enum(["project_registration", "notice", "amendment", "violation"]),
  project_name: z.string().min(1),
  promoter: z.string().optional(),
  rera_number: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  status: z.enum(["registered", "revoked", "lapsed", "under_review"]),
  registration_date: z.string().optional(),
  expiry_date: z.string().optional(),
  url: z.string().url().optional(),
  notes: z.string().optional(),
  scraped_at: z.string().datetime(),
});

const IngestionRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  apiKey: z.string().min(32),
  listings: z.array(ListingSchema).optional(),
  trends: z.array(TrendSchema).optional(),
  compliance: z.array(ComplianceSchema).optional(),
});

// ─── Types ─────────────────────────────────────────────────────────
type ListingInput = z.infer<typeof ListingSchema>;
type TrendInput = z.infer<typeof TrendSchema>;
type ComplianceInput = z.infer<typeof ComplianceSchema>;
type IngestionRequest = z.infer<typeof IngestionRequestSchema>;

interface IngestionResult {
  success: boolean;
  ingested: {
    listings: number;
    trends: number;
    compliance: number;
  };
  duplicates: {
    listings: number;
    trends: number;
    compliance: number;
  };
  errors: string[];
  correlationId: string;
}

// ─── In-Memory Deduplication Cache (per workspace) — retained as fast-path protection ────────────────
const deduplicationCache = new Map<
  string,
  {
    listingUrls: Set<string>;
    trendKeys: Set<string>;
    complianceReraNumbers: Set<string>;
  }
>();

function getDedupCache(workspaceId: string) {
  if (!deduplicationCache.has(workspaceId)) {
    deduplicationCache.set(workspaceId, {
      listingUrls: new Set(),
      trendKeys: new Set(),
      complianceReraNumbers: new Set(),
    });
  }
  return deduplicationCache.get(workspaceId)!;
}

function buildTrendKey(trend: TrendInput): string {
  return `${trend.city}|${trend.locality}|${trend.property_type}|${trend.period}`;
}

function buildListingIdempotencyKey(listing: ListingInput): string {
  const urlKey = listing.url ?? `${listing.source}-${listing.id ?? "no-id"}`;
  return `${listing.source}|${urlKey}|${listing.scraped_at}`;
}

function buildTrendIdempotencyKey(trend: TrendInput): string {
  return `${trend.source}|${buildTrendKey(trend)}|${trend.recorded_at ?? new Date().toISOString()}`;
}

function buildComplianceIdempotencyKey(compliance: ComplianceInput): string {
  return `${compliance.source}|${compliance.rera_number}|${compliance.record_type}|${compliance.scraped_at}`;
}

// ─── Event Metadata Builder ────────────────────────────────────────
function buildEventMetadata(
  eventType: string,
  workspaceId: string,
  correlationId: string,
  causationId?: string,
  classification: string = EventClassification.INTEGRATION,
  priority: string = EventPriority.MEDIUM,
): EventMetadata {
  return {
    eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    eventType,
    eventVersion: "1.0",
    timestamp: new Date().toISOString(),
    workspaceId,
    correlationId,
    causationId: causationId ?? generateCausationId(),
    classification: classification as any,
    priority: priority as any,
    source: {
      serviceName: "market-ingestion-service",
      version: "1.0.0",
    },
  };
}

// ─── Ingestion Server Function ────────────────────────────────────
export const ingestMarketData = createServerFn({ method: "POST" })
  .validator(IngestionRequestSchema)
  .handler(async ({ data }): Promise<IngestionResult> => {
    const { workspaceId, apiKey, listings, trends, compliance } = data;
    const correlationId = generateCorrelationId();
    const causationId = generateCausationId();
    const errors: string[] = [];

    // Verify API key (in production, use secure comparison)
    const expectedApiKey = process.env.MARKET_INGESTION_API_KEY;
    if (!expectedApiKey || apiKey !== expectedApiKey) {
      return {
        success: false,
        ingested: { listings: 0, trends: 0, compliance: 0 },
        duplicates: { listings: 0, trends: 0, compliance: 0 },
        errors: ["Invalid API key"],
        correlationId,
      };
    }

    const dedupCache = getDedupCache(workspaceId);
    const eventBus = new InMemoryEventBus();

    // Create ingestion run record
    const { data: ingestionRun, error: runError } = await supabase
      .from("market_ingestion_runs")
      .insert({
        workspace_id: workspaceId,
        correlation_id: correlationId,
        causation_id: causationId,
        source: "real_estate_agent",
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError) {
      errors.push(`Failed to create ingestion run: ${runError.message}`);
    }

    let ingestedListings = 0;
    let ingestedTrends = 0;
    let ingestedCompliance = 0;
    let duplicateListings = 0;
    let duplicateTrends = 0;
    let duplicateCompliance = 0;

    const now = new Date().toISOString();

    // Helper to get valid source or default
    const getValidSource = (source: string | undefined, dataType: "listings" | "trends" | "compliance"): "magicbricks" | "99acres" | "housing" | "rera" | "trend_analyzer" | "computed" => {
      if (!source) return "trend_analyzer";
      const validSources = ["magicbricks", "99acres", "housing", "rera", "trend_analyzer", "computed"] as const;
      if (validSources.includes(source as any)) return source as any;
      if (dataType === "listings") return "housing";
      if (dataType === "trends") return "computed";
      return "rera";
    };

    // ─── Process Listings ──────────────────────────────────────────
    if (listings && listings.length > 0) {
      for (const listing of listings) {
        const idempotencyKey = buildListingIdempotencyKey(listing);
        const urlKey = listing.url ?? `${listing.source}-${listing.id ?? "no-id"}`;

        // Fast-path in-memory check
        if (dedupCache.listingUrls.has(urlKey)) {
          duplicateListings++;
          continue;
        }

        // Durable idempotency check via Supabase
        const { data: existing } = await supabase
          .from("market_listings")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (existing) {
          duplicateListings++;
          dedupCache.listingUrls.add(urlKey);
          continue;
        }

        // Insert listing
        const { error } = await supabase.from("market_listings").insert({
          workspace_id: workspaceId,
          source: listing.source,
          city: listing.city,
          locality: listing.locality,
          title: listing.title,
          property_type: listing.property_type,
          listing_type: listing.listing_type,
          price: listing.price,
          price_unit: listing.price_unit,
          price_per_sqft: listing.price_per_sqft,
          area_sqft: listing.area_sqft,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          floor: listing.floor,
          total_floors: listing.total_floors,
          age_years: listing.age_years,
          furnishing: listing.furnishing,
          builder: listing.builder,
          project: listing.project,
          rera_id: listing.rera_id,
          url: listing.url,
          scraped_at: listing.scraped_at,
          provider_record_id: listing.id,
          idempotency_key: idempotencyKey,
          correlation_id: correlationId,
          causation_id: causationId,
          occurred_at: listing.scraped_at,
          recorded_at: now,
        });

        if (error) {
          errors.push(`Listing insert failed: ${error.message}`);
          continue;
        }

        ingestedListings++;
        dedupCache.listingUrls.add(urlKey);
      }
    }

    // ─── Process Trends ────────────────────────────────────────────
    if (trends && trends.length > 0) {
      for (const trend of trends) {
        const idempotencyKey = buildTrendIdempotencyKey(trend);
        const trendKey = buildTrendKey(trend);

        // Fast-path in-memory check
        if (dedupCache.trendKeys.has(trendKey)) {
          duplicateTrends++;
          continue;
        }

        // Durable idempotency check via Supabase
        const { data: existing } = await supabase
          .from("market_trends")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (existing) {
          duplicateTrends++;
          dedupCache.trendKeys.add(trendKey);
          continue;
        }

        // Insert trend
        const { error } = await supabase.from("market_trends").insert({
          workspace_id: workspaceId,
          city: trend.city,
          locality: trend.locality,
          property_type: trend.property_type,
          avg_price_per_sqft: trend.avg_price_per_sqft,
          median_price: trend.median_price,
          total_listings: trend.total_listings,
          price_change_pct: trend.price_change_pct,
          demand_index: trend.demand_index,
          source: trend.source,
          period: trend.period,
          recorded_at: trend.recorded_at ?? now,
          provider_record_id: `${trend.city}-${trend.locality}-${trend.property_type}-${trend.period}`,
          idempotency_key: idempotencyKey,
          correlation_id: correlationId,
          causation_id: causationId,
          occurred_at: trend.recorded_at ?? now,
        });

        if (error) {
          errors.push(`Trend insert failed: ${error.message}`);
          continue;
        }

        ingestedTrends++;
        dedupCache.trendKeys.add(trendKey);
      }
    }

    // ─── Process Compliance ────────────────────────────────────────
    if (compliance && compliance.length > 0) {
      for (const record of compliance) {
        const idempotencyKey = buildComplianceIdempotencyKey(record);

        // Fast-path in-memory check
        if (dedupCache.complianceReraNumbers.has(record.rera_number)) {
          duplicateCompliance++;
          continue;
        }

        // Durable idempotency check via Supabase
        const { data: existing } = await supabase
          .from("market_compliance")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (existing) {
          duplicateCompliance++;
          dedupCache.complianceReraNumbers.add(record.rera_number);
          continue;
        }

        // Insert compliance
        const { error } = await supabase.from("market_compliance").insert({
          workspace_id: workspaceId,
          source: record.source,
          record_type: record.record_type,
          project_name: record.project_name,
          promoter: record.promoter,
          rera_number: record.rera_number,
          city: record.city,
          state: record.state,
          status: record.status,
          registration_date: record.registration_date,
          expiry_date: record.expiry_date,
          url: record.url,
          notes: record.notes,
          scraped_at: record.scraped_at,
          provider_record_id: record.rera_number,
          idempotency_key: idempotencyKey,
          correlation_id: correlationId,
          causation_id: causationId,
          occurred_at: record.scraped_at,
        });

        if (error) {
          errors.push(`Compliance insert failed: ${error.message}`);
          continue;
        }

        ingestedCompliance++;
        dedupCache.complianceReraNumbers.add(record.rera_number);
      }
    }

    // ─── Update Ingestion Run ──────────────────────────────────────
    const finalStatus = errors.length > 0 && (ingestedListings + ingestedTrends + ingestedCompliance) === 0
      ? "failed"
      : errors.length > 0
        ? "partial"
        : "completed";

    if (ingestionRun) {
      await supabase
        .from("market_ingestion_runs")
        .update({
          status: finalStatus,
          listings_ingested: ingestedListings,
          listings_duplicates: duplicateListings,
          trends_ingested: ingestedTrends,
          trends_duplicates: duplicateTrends,
          compliance_ingested: ingestedCompliance,
          compliance_duplicates: duplicateCompliance,
          errors: errors.length > 0 ? errors : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", ingestionRun.id);
    }

    // ─── Publish DataIngestedEvent for each data type ──────────────
    const ingestedAt = new Date().toISOString();

    if (ingestedListings > 0) {
      const event = new MarketDataIngestedEvent(
        buildEventMetadata("MARKET.DataIngested", workspaceId, correlationId, causationId),
        {
          workspaceId,
          source: getValidSource(listings?.[0]?.source, "listings"),
          dataType: "listings",
          recordCount: ingestedListings,
          ingestedAt,
          correlationId,
        },
      );
      await eventBus.publish(event);
    }

    if (ingestedTrends > 0) {
      const event = new MarketDataIngestedEvent(
        buildEventMetadata("MARKET.DataIngested", workspaceId, correlationId, causationId),
        {
          workspaceId,
          source: getValidSource(trends?.[0]?.source, "trends"),
          dataType: "trends",
          recordCount: ingestedTrends,
          ingestedAt,
          correlationId,
        },
      );
      await eventBus.publish(event);
    }

    if (ingestedCompliance > 0) {
      const event = new MarketDataIngestedEvent(
        buildEventMetadata("MARKET.DataIngested", workspaceId, correlationId, causationId),
        {
          workspaceId,
          source: getValidSource(compliance?.[0]?.source, "compliance"),
          dataType: "compliance",
          recordCount: ingestedCompliance,
          ingestedAt,
          correlationId,
        },
      );
      await eventBus.publish(event);
    }

    return {
      success: finalStatus !== "failed",
      ingested: {
        listings: ingestedListings,
        trends: ingestedTrends,
        compliance: ingestedCompliance,
      },
      duplicates: {
        listings: duplicateListings,
        trends: duplicateTrends,
        compliance: duplicateCompliance,
      },
      errors,
      correlationId,
    };
  });

// ─── Market BI Snapshot Server Function ──────────────────────────────
import { MarketIntelligenceService } from "@/business-intelligence/market/service";
import type { MarketIntelligence, MarketTrend, MarketOpportunity, MarketListing, MarketCompliance } from "@/business-intelligence/market/types";
import { SupabaseMarketRepository } from "@/business-intelligence/market/repository";
import type { IMarketRepository } from "@/business-intelligence/market/repository";
import { MarketRiskEvaluator } from "@/decision-engine/market/market-risk-evaluator";
import type { DecisionContext } from "@/decision-engine/shared/decision-context";
import { InAppDispatcher } from "@/communication-hub/in-app/in-app-dispatcher";
import type { CommunicationRequest } from "@/communication-hub/shared/communication-request";
import type { CommunicationRecipient } from "@/communication-hub/shared/communication-recipient";
import type { ConsentPolicy } from "@/communication-hub/shared/consent-policy";
import type { QuietHoursPolicy } from "@/communication-hub/shared/quiet-hours-policy";
import type { RetryPolicy } from "@/communication-hub/shared/retry-policy";
import { requireRoles } from "@/integrations/supabase/role-middleware";
import { CommunicationChannel } from "@/communication-hub/shared/communication-channel";
import { CommunicationPriority } from "@/communication-hub/shared/communication-priority";

export type MarketBISnapshot = {
  intelligence: MarketIntelligence;
  recommendations?: MarketRecommendation[];
  deliveryStatus?: string;
  workspaceId: string;
  correlationId: string;
};

export type MarketRecommendation = {
  id: string;
  title: string;
  businessReason: string;
  affectedSegment: string;
  recommendedAction: string;
  expectedImpact: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  supportingMetrics: Record<string, string | number | boolean | null | undefined>;
  generatedAt: string;
  decisionReference?: string;
  correlationId: string;
};

function adaptMarketIntelligenceToBISnapshot(
  intelligence: MarketIntelligence,
  recommendations?: MarketRecommendation[],
  deliveryStatus?: string,
): Omit<MarketBISnapshot, "workspaceId" | "correlationId"> {
  return {
    intelligence,
    recommendations,
    deliveryStatus,
  };
}

function buildCommunicationRequest(
  decision: any,
  recommendation: MarketRecommendation,
  workspaceId: string,
  correlationId: string,
): CommunicationRequest {
  const priority: CommunicationPriority = decision.severity === "CRITICAL" ? "CRITICAL" : decision.severity === "HIGH" ? "HIGH" : "MEDIUM";
  
  return {
    communicationId: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    correlationId,
    causationId: recommendation.decisionReference ?? "",
    workspaceId,
    channel: "in_app" as CommunicationChannel,
    recipients: [{
      recipientId: "system",
      contact: "system@assetsense.ai",
      contactType: "in_app",
      name: "System",
      optedOut: false,
      metadata: {
        roles: ["admin", "manager"],
        preferences: { inApp: true, email: false, sms: false, whatsapp: false },
        consent: { marketing: false, transactional: true, operational: true },
      },
    }],
    templateId: "market-intelligence-notification",
    locale: "en-IN",
    priority,
    scheduledAt: new Date().toISOString(),
    consent: { 
      required: false, 
      withdrawn: false, 
      type: "EXPRESS" as const, 
      method: "WEB_FORM" as const, 
      grantedAt: new Date().toISOString(),
      revocable: true,
      version: "1.0",
      blanketConsent: true,
      coveredTypes: ["in_app" as CommunicationChannel],
      geographicalRestriction: false,
      allowedJurisdictions: ["IN"],
      language: "en",
      recorded: true,
    } as ConsentPolicy,
    quietHoursPolicy: { 
      enabled: true, 
      startTime: "22:00", 
      endTime: "07:00", 
      timezone: "Asia/Kolkata",
      days: [0,1,2,3,4,5,6], 
      allowUrgentOverride: true 
    } as QuietHoursPolicy,
    retryPolicy: { 
      enabled: true, 
      maxAttempts: 3, 
      baseDelayMs: 1000, 
      maxDelayMs: 30000, 
      backoffMultiplier: 2,
      jitter: true 
    } as RetryPolicy,
    humanReviewRequired: false,
    trackDelivery: true,
    trackOpens: false,
    trackClicks: false,
    channelConfig: {},
    isTest: false,
    metadata: {
      decisionId: decision.decisionId,
      recommendationId: recommendation.id,
      module: "market",
    },
  };
}

export const getMarketBISnapshot = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager", "agent", "viewer", "builder", "developer"])])
  .handler(async ({ context }): Promise<MarketBISnapshot> => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const workspaceId = await getCurrentWorkspaceId(supabase);
    if (!workspaceId) {
      throw new Error("No active workspace membership for the authenticated user");
    }
    const correlationId = generateCorrelationId();
    const causationId = generateCausationId();

    const eventBus = new InMemoryEventBus();

    // ─── Request Event ───
    const requestedEvent = new MarketSnapshotRequestedEvent(
      buildEventMetadata("MARKET.SnapshotRequested", workspaceId, correlationId, causationId),
      { workspaceId, requestedBy: userId, requestedAt: new Date().toISOString() },
    );
    await eventBus.publish(requestedEvent);

    // ─── Fetch Intelligence ───
    const repository = new SupabaseMarketRepository(supabase);
    const service = new MarketIntelligenceService(repository);
    const intelligence = await service.getContext(workspaceId);

    // ─── Processed Event ───
    const summary = intelligence.summary as any;
    const groupings = intelligence.groupings;
    const processedEvent = new MarketSnapshotProcessedEvent(
      buildEventMetadata("MARKET.SnapshotProcessed", workspaceId, correlationId, requestedEvent.metadata.eventId),
      {
        workspaceId,
        totalListings: summary?.totalListings ?? 0,
        totalTrends: summary?.totalTrends ?? 0,
        totalCompliance: summary?.totalCompliance ?? 0,
        avgPricePerSqft: summary?.avgPricePerSqft ?? 0,
        citiesCovered: (groupings?.byCity ?? []).map((c: any) => c.name),
        propertyTypesCovered: (groupings?.byPropertyType ?? []).map((c: any) => c.name),
        medianPricePerSqft: summary?.medianPricePerSqft ?? 0,
        priceChangePct: summary?.priceChangePct ?? 0,
        demandIndex: summary?.demandIndex ?? 0,
        topOpportunities: (intelligence.opportunities ?? []).length,
        generatedAt: intelligence.generatedAt ?? new Date().toISOString(),
      },
    );
    await eventBus.publish(processedEvent);

    // ─── Decision Engine ───
    const evaluator = new MarketRiskEvaluator();
    const decisionContext: DecisionContext = {
      workspaceId,
      correlationId,
      causationId: processedEvent.metadata.eventId,
      intelligenceEvents: [processedEvent],
      subjectType: "Market",
      subjectId: workspaceId,
      evaluatedAt: new Date().toISOString(),
      evidenceReferences: [],
      dataClassification: "internal",
      jurisdiction: "IN",
    };

    const decisions = await evaluator.evaluateIntelligence(intelligence, decisionContext);

    // ─── Recommendations & Communication ───
    const recommendations: MarketRecommendation[] = [];
    const dispatcher = new InAppDispatcher();
    let deliveryStatus = "no-decisions";

    for (const decision of decisions) {
      const riskEvent = new MarketRiskDetectedEvent(
        buildEventMetadata("MARKET.RiskDetected", workspaceId, correlationId, processedEvent.metadata.eventId, EventClassification.DECISION, EventPriority.HIGH),
        decision,
      );
      await eventBus.publish(riskEvent);

      const recommendation: MarketRecommendation = {
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: decision.title,
        businessReason: decision.explanation,
        affectedSegment: decision.affectedSegment,
        recommendedAction: decision.recommendedAction,
        expectedImpact: decision.expectedBusinessImpact,
        priority: decision.severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
        confidence: decision.confidence,
        supportingMetrics: { 
          decisionType: decision.decisionType, 
          evidence: JSON.stringify(decision.evidence) 
        },
        generatedAt: new Date().toISOString(),
        decisionReference: decision.decisionId,
        correlationId,
      };
      recommendations.push(recommendation);

      const recommendationEvent = new MarketRecommendationCreatedEvent(
        buildEventMetadata("MARKET.RecommendationCreated", workspaceId, correlationId, riskEvent.metadata.eventId, EventClassification.EXECUTION, EventPriority.MEDIUM),
        {
          recommendationId: recommendation.id,
          workspaceId,
          title: recommendation.title,
          businessReason: recommendation.businessReason,
          affectedSegment: recommendation.affectedSegment,
          recommendedAction: recommendation.recommendedAction,
          expectedImpact: recommendation.expectedImpact,
          priority: recommendation.priority,
          confidence: recommendation.confidence,
          supportingMetrics: recommendation.supportingMetrics,
          decisionReference: recommendation.decisionReference ?? "",
          generatedAt: recommendation.generatedAt,
          deliveryChannel: "IN_APP_NOTIFICATION",
          deliveryStatus: "pending",
        },
      );
      await eventBus.publish(recommendationEvent);

      const commRequest = buildCommunicationRequest(decision, recommendation, workspaceId, correlationId);
      const commResult = await dispatcher.dispatch(commRequest);
      deliveryStatus = commResult.status;
    }

    const snapshot = adaptMarketIntelligenceToBISnapshot(
      intelligence,
      recommendations.length > 0 ? recommendations : undefined,
      deliveryStatus,
    );
    
    return {
      ...snapshot,
      workspaceId,
      correlationId,
    };
  });
