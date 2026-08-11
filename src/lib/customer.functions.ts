import { createServerFn } from "@tanstack/react-start";
import { requireRoles } from "@/integrations/supabase/role-middleware";
import { CustomerIntelligenceService } from "@/business-intelligence/customer/service";
import type { CustomerIntelligence, CustomerLevel, CustomerMovement, CustomerRecommendation } from "@/business-intelligence/customer/types";
import type { ICustomerRepository } from "@/business-intelligence/customer/repository";
import { InMemoryEventBus } from "@/lib/event-fabric/in-memory-event-bus";
import { EventMetadata } from "@/lib/event-fabric/event-metadata";
import { EventClassification } from "@/lib/event-fabric/event-classification";
import { EventPriority } from "@/lib/event-fabric/event-priority";
import { generateCorrelationId } from "@/lib/event-fabric/correlation-id";
import { generateCausationId } from "@/lib/event-fabric/causation-id";
import {
  CustomerSnapshotRequestedEvent,
  CustomerSnapshotProcessedEvent,
  CustomerRiskDetectedEvent,
  CustomerRecommendationCreatedEvent,
  type CustomerRiskDetectedPayload,
} from "@/lib/event-fabric/customer-events";
import { CustomerRiskEvaluator } from "@/decision-engine/customer/customer-risk-evaluator";
import type { DecisionContext } from "@/decision-engine/shared/decision-context";
import { InAppDispatcher } from "@/communication-hub/in-app/in-app-dispatcher";
import type { CommunicationRequest } from "@/communication-hub/shared/communication-request";
import type { CommunicationRecipient } from "@/communication-hub/shared/communication-recipient";
import type { ConsentPolicy } from "@/communication-hub/shared/consent-policy";
import type { QuietHoursPolicy } from "@/communication-hub/shared/quiet-hours-policy";
import type { RetryPolicy } from "@/communication-hub/shared/retry-policy";

export type CustomerBISnapshot = {
  kpis: {
    total_contacts: number;
    active_contacts: number;
    new_contacts: number;
    inactive_contacts: number;
    customer_contacts: number;
    avg_engagement_score: number;
    active_pct: number;
    customer_pct: number;
    inactive_pct: number;
    do_not_contact_pct: number;
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
  recommendations?: CustomerRecommendation[];
  intelligence?: CustomerIntelligence;
  deliveryStatus?: string;
};

export class SupabaseCustomerRepository implements ICustomerRepository {
  constructor(private readonly supabase: any) {}

  async getLevels(workspaceId: string): Promise<CustomerLevel[]> {
    const { data, error } = await this.supabase
      .from("contacts")
      .select("id,first_name,last_name,full_name,email,phone,company,job_title,city,state,country,lead_source,status,preferred_contact_method,do_not_contact,tags,created_at,updated_at")
      .eq("workspace_id", workspaceId)
      .limit(100);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: any, index: number) => ({
      contactId: row.id ?? `contact-${index}`,
      fullName: row.full_name ?? `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
      email: row.email ?? "",
      phone: row.phone ?? undefined,
      company: row.company ?? undefined,
      jobTitle: row.job_title ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      country: row.country ?? "IN",
      leadSource: row.lead_source ?? undefined,
      status: row.status ?? "NEW",
      preferredContactMethod: row.preferred_contact_method ?? "email",
      doNotContact: row.do_not_contact ?? false,
      tags: row.tags ?? [],
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
      // Enriched fields (would come from deals/activities in real implementation)
      engagementScore: undefined,
      lastActivityAt: undefined,
      totalDeals: undefined,
      totalValueInr: undefined,
    }));
  }

  async getMovements(contactId: string): Promise<CustomerMovement[]> {
    void contactId;
    return [];
  }

  async updateLevel(_level: CustomerLevel): Promise<void> {
    return;
  }

  async recordMovement(_movement: CustomerMovement): Promise<void> {
    return;
  }
}

function adaptCustomerIntelligenceToBISnapshot(
  intelligence: CustomerIntelligence,
  recommendations?: CustomerRecommendation[],
  deliveryStatus?: string,
): CustomerBISnapshot {
  const summary = intelligence.customerSummary;
  const groupings = intelligence.groupings;

  const totalContacts = summary?.total ?? 0;
  const activeContacts = summary?.active ?? 0;
  const newContacts = summary?.new ?? 0;
  const inactiveContacts = summary?.inactive ?? 0;
  const customerContacts = summary?.customer ?? 0;
  const avgEngagementScore = summary?.avgEngagementScore ?? 0;
  const activePct = summary?.activePct ?? 0;
  const customerPct = summary?.customerPct ?? 0;
  const inactivePct = summary?.inactivePct ?? 0;
  const doNotContactPct = summary?.doNotContactPct ?? 0;

  const regions = (groupings?.byCity ?? []).map((g) => ({
    name: g.name,
    deals: g.customer,
    rev: g.value,
    growth: g.total > 0 ? Math.round((g.customer / g.total) * 100) : 0,
  }));

  const funnel = (groupings?.byStatus ?? []).map((g) => ({
    stage: g.name,
    value: g.total,
  }));

  const channel = (groupings?.byLeadSource ?? []).slice(0, 5).map((g) => ({
    name: g.name,
    value: g.total,
  }));

  const cohort = (intelligence.engagementBuckets ?? []).map((b) => ({
    week: b.bucket,
    new: b.count,
    return: 0,
  }));

  return {
    kpis: {
      total_contacts: totalContacts,
      active_contacts: activeContacts,
      new_contacts: newContacts,
      inactive_contacts: inactiveContacts,
      customer_contacts: customerContacts,
      avg_engagement_score: avgEngagementScore,
      active_pct: activePct,
      customer_pct: customerPct,
      inactive_pct: inactivePct,
      do_not_contact_pct: doNotContactPct,
    },
    revenueSeries: [],
    funnel,
    channel,
    cohort,
    regions,
    call_intents: [],
    total_calls: 0,
    qualified_pct: 0,
    generated_at: intelligence.generatedAt ?? new Date().toISOString(),
    recommendations,
    intelligence: intelligence,
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
      serviceName: "customer-intelligence-service",
      version: "1.0.0",
    },
  };
}

function buildCommunicationRequest(
  decision: CustomerRiskDetectedPayload,
  recommendation: CustomerRecommendation,
  workspaceId: string,
  correlationId: string,
): CommunicationRequest {
  const now = new Date().toISOString();
  const recipient: CommunicationRecipient = {
    recipientId: `role-admin-${workspaceId}`,
    contact: "admin@customer.intelligence",
    contactType: "role",
    name: "Customer Admin",
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
    templateId: "customer-intelligence-v1",
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

export const getCustomerBISnapshot = createServerFn({ method: "GET" })
  .middleware([requireRoles(["admin", "manager", "viewer"])])
  .handler(async ({ context }): Promise<CustomerBISnapshot> => {
    const { supabase } = context as { supabase: any; workspaceId?: string };
    const workspaceId = (context as { workspaceId?: string }).workspaceId ?? "default";

    const eventBus = new InMemoryEventBus();
    const correlationId = generateCorrelationId();

    const requestedEvent = new CustomerSnapshotRequestedEvent(
      buildEventMetadata("CUSTOMER.SnapshotRequested", workspaceId, correlationId),
      { workspaceId, requestedBy: "system", requestedAt: new Date().toISOString() },
    );
    await eventBus.publish(requestedEvent);

    const repository = new SupabaseCustomerRepository(supabase);
    const service = new CustomerIntelligenceService(repository);
    const intelligence = await service.getContext(workspaceId);

    const summary = intelligence.customerSummary;
    const groupings = intelligence.groupings;
    const processedEvent = new CustomerSnapshotProcessedEvent(
      buildEventMetadata(
        "CUSTOMER.SnapshotProcessed",
        workspaceId,
        correlationId,
        requestedEvent.metadata.eventId,
        EventClassification.INTELLIGENCE,
        EventPriority.MEDIUM,
      ),
      {
        workspaceId,
        totalContacts: summary?.total ?? 0,
        activeContacts: summary?.active ?? 0,
        newContacts: summary?.new ?? 0,
        inactiveContacts: summary?.inactive ?? 0,
        customerContacts: summary?.customer ?? 0,
        partnerContacts: summary?.partner ?? 0,
        vendorContacts: summary?.vendor ?? 0,
        referralContacts: summary?.referral ?? 0,
        totalValueInr: summary?.totalValueInr ?? 0,
        avgEngagementScore: summary?.avgEngagementScore ?? 0,
        leadSourceDistribution: (groupings?.byLeadSource ?? []).reduce((acc: Record<string, number>, g) => ({ ...acc, [g.name]: g.total }), {}),
        cityDistribution: (groupings?.byCity ?? []).reduce((acc: Record<string, number>, g) => ({ ...acc, [g.name]: g.total }), {}),
        statusDistribution: (groupings?.byStatus ?? []).reduce((acc: Record<string, number>, g) => ({ ...acc, [g.name]: g.total }), {}),
        generatedAt: intelligence.generatedAt ?? new Date().toISOString(),
      },
    );
    await eventBus.publish(processedEvent);

    const evaluator = new CustomerRiskEvaluator();
    const decisionContext: DecisionContext = {
      workspaceId,
      correlationId,
      causationId: processedEvent.metadata.eventId,
      intelligenceEvents: [processedEvent],
      subjectType: "Customer",
      subjectId: workspaceId,
      evaluatedAt: new Date().toISOString(),
      evidenceReferences: [],
      dataClassification: "internal",
      jurisdiction: "IN",
    };

    const decisions = await evaluator.evaluateIntelligence(intelligence, decisionContext);

    const recommendations: CustomerRecommendation[] = [];
    const dispatcher = new InAppDispatcher();
    let deliveryStatus = "no-decisions";

    for (const decision of decisions) {
      const riskEvent = new CustomerRiskDetectedEvent(
        buildEventMetadata(
          "CUSTOMER.RiskDetected",
          workspaceId,
          correlationId,
          processedEvent.metadata.eventId,
          EventClassification.DECISION,
          EventPriority.HIGH,
        ),
        decision,
      );
      await eventBus.publish(riskEvent);

      const recommendation: CustomerRecommendation = {
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
          evidenceCount: String(decision.evidence.length),
          topFactor: decision.evidence[0]?.factor ?? "none",
          topImpact: String(decision.evidence[0]?.impact ?? 0),
        },
        generatedAt: new Date().toISOString(),
        decisionReference: decision.decisionId,
        correlationId,
      };
      recommendations.push(recommendation);

      const recommendationEvent = new CustomerRecommendationCreatedEvent(
        buildEventMetadata(
          "CUSTOMER.RecommendationCreated",
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

    return adaptCustomerIntelligenceToBISnapshot(
      intelligence,
      recommendations.length > 0 ? recommendations : undefined,
      deliveryStatus,
    );
  });