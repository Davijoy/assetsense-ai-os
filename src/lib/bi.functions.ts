import { createServerFn } from "@tanstack/react-start";
import { requireRoles } from "@/integrations/supabase/role-middleware";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";
import { InventoryIntelligenceService } from "@/business-intelligence/inventory/service";
import type { InventoryIntelligence, InventoryLevel, InventoryMovement, InventoryRecommendation } from "@/business-intelligence/inventory/types";
import type { IInventoryRepository } from "@/business-intelligence/inventory/repository";
import { InMemoryEventBus } from "@/lib/event-fabric/in-memory-event-bus";
import { EventMetadata } from "@/lib/event-fabric/event-metadata";
import { EventClassification } from "@/lib/event-fabric/event-classification";
import { EventPriority } from "@/lib/event-fabric/event-priority";
import { generateCorrelationId } from "@/lib/event-fabric/correlation-id";
import { generateCausationId } from "@/lib/event-fabric/causation-id";
import {
  InventorySnapshotRequestedEvent,
  InventorySnapshotProcessedEvent,
  InventoryRiskDetectedEvent,
  InventoryRecommendationCreatedEvent,
  type InventoryRiskDetectedPayload,
} from "@/lib/event-fabric/inventory-events";
import { InventoryRiskEvaluator } from "@/decision-engine/inventory/inventory-risk-evaluator";
import type { DecisionContext } from "@/decision-engine/shared/decision-context";
import { InAppDispatcher } from "@/communication-hub/in-app/in-app-dispatcher";
import type { CommunicationRequest } from "@/communication-hub/shared/communication-request";
import type { CommunicationRecipient } from "@/communication-hub/shared/communication-recipient";
import type { ConsentPolicy } from "@/communication-hub/shared/consent-policy";
import type { QuietHoursPolicy } from "@/communication-hub/shared/quiet-hours-policy";
import type { RetryPolicy } from "@/communication-hub/shared/retry-policy";

export type BISnapshot = {
  kpis: {
    revenue_inr: number;
    units_sold: number;
    sales_velocity_days: number;
    cost_per_lead_inr: number;
    revenue_delta_pct: number;
    units_delta_pct: number;
  };
  revenueSeries: { m: string; actual: number; forecast: number }[];
  funnel: { stage: string; value: number }[];
  channel: { name: string; value: number }[];
  cohort: { week: string; new: number; return: number }[];
  regions: { name: string; deals: number; rev: number; growth: number }[];
  call_intents: { label: string; count: number }[];
  total_calls: number;
  qualified_pct: number;
  generated_at: string;
  recommendations?: InventoryRecommendation[];
  intelligence?: InventoryIntelligence;
  deliveryStatus?: string;
};

export class SupabaseInventoryRepository implements IInventoryRepository {
  constructor(private readonly supabase: any) {}

  async getLevels(workspaceId: string): Promise<InventoryLevel[]> {
    const { data, error } = await this.supabase
      .from("properties")
      .select("id,name,city,property_type,status,price_inr,developer,created_at,workspace_id")
      .eq("workspace_id", workspaceId)
      .limit(50);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: any, index: number) => ({
      assetId: row.id ?? `property-${index}`,
      quantity: 1,
      unit: "unit",
      lastUpdated: row.created_at ? new Date(row.created_at) : new Date(),
      threshold: 1,
      name: row.name ?? undefined,
      city: row.city ?? undefined,
      propertyType: row.property_type ?? undefined,
      status: row.status ?? "available",
      priceInr: row.price_inr ?? 0,
      developer: row.developer ?? undefined,
    }));
  }

  async getMovements(assetId: string): Promise<InventoryMovement[]> {
    void assetId;
    return [];
  }

  async updateLevel(_level: InventoryLevel): Promise<void> {
    return;
  }

  async recordMovement(_movement: InventoryMovement): Promise<void> {
    return;
  }
}

function adaptInventoryIntelligenceToBISnapshot(
  inventory: InventoryIntelligence,
  recommendations?: InventoryRecommendation[],
  deliveryStatus?: string,
): BISnapshot {
  const summary = inventory.inventorySummary;
  const groupings = inventory.groupings;

  const revenueInr = summary?.soldValue ?? 0;
  const unitsSold = summary?.sold ?? 0;
  const absorptionPct = summary?.absorptionPct ?? 0;
  const availabilityPct = summary?.availabilityPct ?? 0;

  const regions = (groupings?.byCity ?? []).map((g) => ({
    name: g.name,
    deals: g.sold,
    rev: g.value,
    growth: g.total > 0 ? Math.round((g.sold / g.total) * 100) : 0,
  }));

  const funnel = (groupings?.byStatus ?? []).map((g) => ({
    stage: g.name,
    value: g.total,
  }));

  const channel = (groupings?.byProject ?? []).slice(0, 5).map((g) => ({
    name: g.name,
    value: g.total,
  }));

  const cohort = (inventory.ageingBuckets ?? []).map((b) => ({
    week: b.bucket,
    new: b.count,
    return: 0,
  }));

  return {
    kpis: {
      revenue_inr: revenueInr,
      units_sold: unitsSold,
      sales_velocity_days: 0,
      cost_per_lead_inr: 0,
      revenue_delta_pct: absorptionPct,
      units_delta_pct: availabilityPct,
    },
    revenueSeries: [],
    funnel,
    channel,
    cohort,
    regions,
    call_intents: [],
    total_calls: 0,
    qualified_pct: 0,
    generated_at: inventory.generatedAt ?? new Date().toISOString(),
    recommendations,
    intelligence: inventory,
    deliveryStatus,
  };
}

function buildEventMetadata(
  eventType: string,
  workspaceId: string,
  correlationId: string,
  causationId?: string,
  classification: string = EventClassification.DOMAIN,
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
      serviceName: "inventory-intelligence-service",
      version: "1.0.0",
    },
  };
}

function buildCommunicationRequest(
  decision: InventoryRiskDetectedPayload,
  recommendation: InventoryRecommendation,
  workspaceId: string,
  correlationId: string,
): CommunicationRequest {
  const now = new Date().toISOString();
  const recipient: CommunicationRecipient = {
    recipientId: `role-admin-${workspaceId}`,
    contact: "admin@inventory.intelligence",
    contactType: "role",
    name: "Inventory Admin",
    locale: "en-US",
    timezone: "Asia/Kolkata",
    optedOut: false,
    metadata: { role: "admin" },
  };

  const consent: ConsentPolicy = {
    required: false,
    type: "IMPLIED",
    method: "OTHER",
    grantedAt: now,
    revocable: true,
    withdrawn: false,
    version: "1.0",
    blanketConsent: true,
    coveredTypes: ["IN_APP_NOTIFICATION"],
    geographicalRestriction: false,
    allowedJurisdictions: ["IN"],
    language: "en-US",
    recorded: true,
  };

  const quietHours: QuietHoursPolicy = {
    enabled: false,
    startTime: "22:00",
    endTime: "06:00",
    timezone: "Asia/Kolkata",
    days: [0, 1, 2, 3, 4, 5, 6],
    allowUrgentOverride: true,
  };

  const retry: RetryPolicy = {
    enabled: true,
    maxAttempts: 3,
    baseDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
    jitter: true,
  };

  return {
    communicationId: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    decisionId: decision.decisionId,
    workspaceId,
    correlationId,
    causationId: decision.decisionId,
    channel: "IN_APP_NOTIFICATION",
    recipients: [recipient],
    templateId: "inventory-intelligence-v1",
    locale: "en-US",
    priority: recommendation.priority as any,
    scheduledAt: now,
    consent,
    quietHoursPolicy: quietHours,
    retryPolicy: retry,
    humanReviewRequired: decision.humanReviewRequired,
    trackDelivery: true,
    trackOpens: false,
    trackClicks: false,
    channelConfig: {},
    isTest: false,
    metadata: {
      title: recommendation.title,
      message: recommendation.recommendedAction,
      recipientRole: "admin",
      decisionReference: decision.decisionId,
      affectedSegment: decision.affectedSegment,
      expectedImpact: decision.expectedBusinessImpact,
    },
  };
}

export const getBISnapshot = createServerFn({ method: "GET" })
  .middleware([requireRoles(["admin", "manager", "viewer"])])
  .handler(async ({ context }): Promise<BISnapshot> => {
        const { supabase } = context as { supabase: any };
    // Resolve the caller's real workspace from the authenticated session via the
    // `current_workspace_id` RPC (RLS-safe: runs as the authed user). Fail safely
    // if the user has no membership — never fall back to a default/foreign workspace.
    const workspaceId = await getCurrentWorkspaceId(supabase);
    if (!workspaceId) {
      throw new Error("No active workspace membership for the authenticated user");
    }

    const eventBus = new InMemoryEventBus();
    const correlationId = generateCorrelationId();

    const requestedEvent = new InventorySnapshotRequestedEvent(
      buildEventMetadata("INVENTORY.SnapshotRequested", workspaceId, correlationId),
      { workspaceId, requestedBy: "system", requestedAt: new Date().toISOString() },
    );
    await eventBus.publish(requestedEvent);

    const repository = new SupabaseInventoryRepository(supabase);
    const service = new InventoryIntelligenceService(repository);
    const inventory = await service.getContext(workspaceId);

    const summary = inventory.inventorySummary;
    const processedEvent = new InventorySnapshotProcessedEvent(
      buildEventMetadata(
        "INVENTORY.SnapshotProcessed",
        workspaceId,
        correlationId,
        requestedEvent.metadata.eventId,
        EventClassification.INTELLIGENCE,
        EventPriority.MEDIUM,
      ),
      {
        workspaceId,
        totalUnits: summary?.total ?? 0,
        availableUnits: summary?.available ?? 0,
        soldUnits: summary?.sold ?? 0,
        reservedUnits: summary?.reserved ?? 0,
        blockedUnits: summary?.blocked ?? 0,
        totalValueInr: summary?.totalValue ?? 0,
        availableValueInr: summary?.availableValue ?? 0,
        soldValueInr: summary?.soldValue ?? 0,
        availabilityPct: summary?.availabilityPct ?? 0,
        soldPct: summary?.soldPct ?? 0,
        absorptionPct: summary?.absorptionPct ?? 0,
        ageingOver90Days: (inventory.ageingBuckets ?? [])
          .filter((b) => b.bucket.includes("91") || b.bucket.includes("120"))
          .reduce((sum, b) => sum + b.count, 0),
        slowMovingCount: inventory.slowMoving?.length ?? 0,
        highValueUnsoldCount: inventory.highValueUnsold?.length ?? 0,
        generatedAt: inventory.generatedAt ?? new Date().toISOString(),
      },
    );
    await eventBus.publish(processedEvent);

    const evaluator = new InventoryRiskEvaluator();
    const decisionContext: DecisionContext = {
      workspaceId,
      correlationId,
      causationId: processedEvent.metadata.eventId,
      intelligenceEvents: [processedEvent],
      subjectType: "Inventory",
      subjectId: workspaceId,
      evaluatedAt: new Date().toISOString(),
      evidenceReferences: [],
      dataClassification: "internal",
      jurisdiction: "IN",
    };

    const decisions = await evaluator.evaluateIntelligence(inventory, decisionContext);

    const recommendations: InventoryRecommendation[] = [];
    const dispatcher = new InAppDispatcher();
    let deliveryStatus = "no-decisions";

    for (const decision of decisions) {
      const riskEvent = new InventoryRiskDetectedEvent(
        buildEventMetadata(
          "INVENTORY.RiskDetected",
          workspaceId,
          correlationId,
          processedEvent.metadata.eventId,
          EventClassification.DECISION,
          EventPriority.HIGH,
        ),
        decision,
      );
      await eventBus.publish(riskEvent);

      const recommendation: InventoryRecommendation = {
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: decision.title,
        businessReason: decision.explanation,
        affectedSegment: decision.affectedSegment,
        recommendedAction: decision.recommendedAction,
        expectedImpact: decision.expectedBusinessImpact,
        priority: decision.severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
        confidence: decision.confidence,
        supportingMetrics: { decisionType: decision.decisionType, evidence: decision.evidence },
        generatedAt: new Date().toISOString(),
        decisionReference: decision.decisionId,
        correlationId,
      };
      recommendations.push(recommendation);

      const recommendationEvent = new InventoryRecommendationCreatedEvent(
        buildEventMetadata(
          "INVENTORY.RecommendationCreated",
          workspaceId,
          correlationId,
          riskEvent.metadata.eventId,
          EventClassification.EXECUTION,
          EventPriority.MEDIUM,
        ),
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

    return adaptInventoryIntelligenceToBISnapshot(
      inventory,
      recommendations.length > 0 ? recommendations : undefined,
      deliveryStatus,
    );
  });
