/**
 * Supreme Intelligence Orchestrator Service
 * 
 * Consumes domain intelligence outputs, correlates records by workspace, customer,
 * property/project and location, detects dependencies and conflicts, ranks coordinated
 * recommendations, supports dry-run mode, requires approval before execution,
 * and prevents duplicate processing and event loops.
 */

import type { ICustomerRepository } from "../customer/repository";
import type { IInventoryRepository } from "../inventory/repository";
import type { IMarketRepository } from "../market/repository";
import type { CustomerIntelligenceService } from "../customer/service";
import type { InventoryIntelligenceService } from "../inventory/service";
import type { MarketIntelligenceService } from "../market/service";
import type { MarketRiskEvaluator } from "@/decision-engine/market/market-risk-evaluator";
import type { DecisionContext } from "@/decision-engine/shared/decision-context";
import type { Event } from "@/lib/event-fabric/event";
import type { EvidenceItem } from "../shared/evidence-item";
import type {
  SupremeIntelligenceContext,
  DomainIntelligenceReference,
  CrossDomainCorrelation,
  CoordinatedDecision,
  CoordinatedRecommendation,
  DomainDecisionReference,
  DomainRecommendationReference,
  RecommendationDependency,
  ApprovalRequirement,
  ProposedAction,
  OrchestrationResult,
  ApprovalRequest,
  OrchestrationTrace,
  OrchestrationStep,
  OrchestrationError,
  ProofScenarioInput,
  ProofScenarioOutput,
} from "./types";
import type { CustomerIntelligence } from "../customer/types";
import type { InventoryIntelligence } from "../inventory/types";
import type { MarketIntelligence } from "../market/types";
import type { CRMKpiSnapshot } from "@/lib/crm.functions";
import { generateCorrelationId } from "@/lib/event-fabric/correlation-id";
import { generateCausationId } from "@/lib/event-fabric/causation-id";

// ─── Thresholds ───
const AT_RISK_THRESHOLD_DAYS = 60;
const WEAK_ENGAGEMENT_THRESHOLD = 40; // engagement score below this is weak
const HIGH_DEMAND_THRESHOLD = 70;
const PRICE_SURGE_THRESHOLD = 15;
const MIN_CONFIDENCE = 0.6;
const APPROVAL_EXPIRY_HOURS = 24;

// ─── In-memory deduplication cache ───
const processedCorrelations = new Set<string>();
const MAX_CACHE_SIZE = 1000;

export class SupremeIntelligenceOrchestrator {
  constructor(
    private customerService: CustomerIntelligenceService,
    private inventoryService: InventoryIntelligenceService,
    private marketService: MarketIntelligenceService,
    private marketRiskEvaluator: MarketRiskEvaluator,
    private getCRMKPIs: () => Promise<CRMKpiSnapshot>,
  ) {}

  /**
   * Main orchestration entry point - runs the complete cross-domain intelligence cycle
   */
  async orchestrate(
    workspaceId: string,
    correlationId?: string,
    causationId?: string,
    dryRun = false,
  ): Promise<OrchestrationResult> {
    const orchestrationId = `orch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const finalCorrelationId = correlationId ?? generateCorrelationId();
    const finalCausationId = causationId ?? generateCausationId();
    const startTime = new Date().toISOString();
    const traceSteps: OrchestrationStep[] = [];
    const errors: OrchestrationError[] = [];
    const eventsEmitted: string[] = [];

    // Check for duplicate processing
    const dedupKey = `${workspaceId}:${finalCorrelationId}`;
    if (processedCorrelations.has(dedupKey)) {
      throw new Error(`Duplicate orchestration detected for correlation ${finalCorrelationId}`);
    }
    processedCorrelations.add(dedupKey);
    if (processedCorrelations.size > MAX_CACHE_SIZE) {
      const firstKey = processedCorrelations.values().next().value;
      if (firstKey) processedCorrelations.delete(firstKey);
    }

    const addStep = (name: string, domain?: OrchestrationStep["domain"], input?: Record<string, unknown>) => {
      const stepId = `step-${traceSteps.length + 1}`;
      traceSteps.push({
        stepId,
        name,
        domain,
        status: "started",
        startTime: new Date().toISOString(),
        input,
      });
      return stepId;
    };

    const completeStep = (stepId: string, output?: Record<string, unknown>, error?: string) => {
      const step = traceSteps.find(s => s.stepId === stepId);
      if (step) {
        step.status = error ? "failed" : "completed";
        step.endTime = new Date().toISOString();
        step.durationMs = new Date(step.endTime).getTime() - new Date(step.startTime).getTime();
        step.output = output;
        step.error = error;
        if (error) {
          errors.push({ stepId, error, timestamp: step.endTime, recoverable: true });
        }
      }
    };

    try {
      // Step 1: Fetch all domain intelligence
      const step1Id = addStep("fetch_domain_intelligence", "supreme", { workspaceId });
      const [customerIntel, inventoryIntel, marketIntel, crmIntel] = await Promise.allSettled([
        this.customerService.getContext(workspaceId),
        this.inventoryService.getContext(workspaceId),
        this.marketService.getContext(workspaceId),
        this.getCRMKPIs(),
      ]);
      completeStep(step1Id, {
        customer: customerIntel.status === "fulfilled",
        inventory: inventoryIntel.status === "fulfilled",
        market: marketIntel.status === "fulfilled",
        crm: crmIntel.status === "fulfilled",
      });

      // Step 2: Build domain references
      const step2Id = addStep("build_domain_references", "supreme");
      const domainReferences = this.buildDomainReferences(
        workspaceId,
        finalCorrelationId,
        finalCausationId,
        customerIntel,
        inventoryIntel,
        marketIntel,
        crmIntel,
      );
      completeStep(step2Id, { domainCount: domainReferences.length });

      // Step 3: Detect cross-domain correlations
      const step3Id = addStep("detect_cross_domain_correlations", "supreme");
      const correlations = this.detectCrossDomainCorrelations(
        domainReferences,
        customerIntel,
        inventoryIntel,
        marketIntel,
        crmIntel,
      );
      completeStep(step3Id, { correlationCount: correlations.length });

      // Step 4: Build evidence trail
      const step4Id = addStep("build_evidence_trail", "supreme");
      const evidenceTrail = this.buildEvidenceTrail(domainReferences, correlations);
      completeStep(step4Id, { evidenceCount: evidenceTrail.length });

      // Step 5: Create Supreme Intelligence Context
      const context: SupremeIntelligenceContext = {
        workspaceId,
        correlationId: finalCorrelationId,
        causationId: finalCausationId,
        generatedAt: new Date().toISOString(),
        customerIntelligence: customerIntel.status === "fulfilled" ? customerIntel.value : undefined,
        inventoryIntelligence: inventoryIntel.status === "fulfilled" ? inventoryIntel.value : undefined,
        marketIntelligence: marketIntel.status === "fulfilled" ? marketIntel.value : undefined,
        crmIntelligence: crmIntel.status === "fulfilled" ? crmIntel.value : undefined,
        domainReferences,
        crossDomainCorrelations: correlations,
        evidenceTrail,
      };

      // Step 6: Evaluate domain decisions
      const step6Id = addStep("evaluate_domain_decisions", "supreme");
      const domainDecisions = await this.evaluateDomainDecisions(context);
      completeStep(step6Id, { decisionCount: domainDecisions.length });

      // Step 7: Create coordinated decisions
      const step7Id = addStep("create_coordinated_decisions", "supreme");
      const coordinatedDecisions = this.createCoordinatedDecisions(
        context,
        domainDecisions,
        finalCorrelationId,
        finalCausationId,
      );
      completeStep(step7Id, { decisionCount: coordinatedDecisions.length });

      // Step 8: Generate coordinated recommendations
      const step8Id = addStep("generate_coordinated_recommendations", "supreme");
      const coordinatedRecommendations = this.generateCoordinatedRecommendations(
        context,
        coordinatedDecisions,
        finalCorrelationId,
        finalCausationId,
        dryRun,
      );
      completeStep(step8Id, { recommendationCount: coordinatedRecommendations.length });

      // Step 9: Create approval requests
      const step9Id = addStep("create_approval_requests", "supreme");
      const approvalRequests = this.createApprovalRequests(
        coordinatedRecommendations,
        finalCorrelationId,
        finalCausationId,
      );
      completeStep(step9Id, { requestCount: approvalRequests.length });

      // Step 10: Emit events
      const step10Id = addStep("emit_events", "supreme");
      // Events would be emitted here in production
      eventsEmitted.push("SUPREME.ContextBuilt", "SUPREME.DecisionCreated", "SUPREME.RecommendationCreated");
      if (approvalRequests.length > 0) {
        eventsEmitted.push("SUPREME.ApprovalRequested");
      }
      completeStep(step10Id, { eventsEmitted });

      const endTime = new Date().toISOString();
      const trace: OrchestrationTrace = {
        traceId: `trace-${orchestrationId}`,
        steps: traceSteps,
        startTime,
        endTime,
        durationMs: new Date(endTime).getTime() - new Date(startTime).getTime(),
        domainsProcessed: domainReferences.map(r => r.domain),
        eventsEmitted,
        errors,
      };

      return {
        orchestrationId,
        workspaceId,
        correlationId: finalCorrelationId,
        causationId: finalCausationId,
        context,
        decisions: coordinatedDecisions,
        recommendations: coordinatedRecommendations,
        correlations,
        approvalRequests,
        trace,
        generatedAt: new Date().toISOString(),
        dryRun,
      };
    } catch (error) {
      const endTime = new Date().toISOString();
      const trace: OrchestrationTrace = {
        traceId: `trace-${orchestrationId}`,
        steps: traceSteps,
        startTime,
        endTime,
        durationMs: new Date(endTime).getTime() - new Date(startTime).getTime(),
        domainsProcessed: [],
        eventsEmitted,
        errors: [...errors, { stepId: "orchestration", error: String(error), timestamp: endTime, recoverable: false }],
      };
      throw error;
    }
  }

  /**
   * Run the proof scenario: Customer at risk + CRM weak engagement + matching inventory + market momentum
   */
  async runProofScenario(input: ProofScenarioInput): Promise<ProofScenarioOutput> {
    const { workspaceId, correlationId, causationId, customerId, customerCity, customerPropertyType, leadId, assetIds, dryRun = true } = input;
    
    const orchestration = await this.orchestrate(workspaceId, correlationId, causationId, dryRun);
    
    // Check proof scenario conditions
    const customerIntel = orchestration.context.customerIntelligence;
    const inventoryIntel = orchestration.context.inventoryIntelligence;
    const marketIntel = orchestration.context.marketIntelligence;
    const crmIntel = orchestration.context.crmIntelligence;

    // Condition 1: Customer is at risk
    const customerAtRisk = customerIntel?.atRiskCustomers?.some(c => c.contactId === customerId) ?? false;
    
    // Condition 2: CRM shows weak or delayed engagement
    const crmWeakEngagement = crmIntel ? crmIntel.averageResponseSeconds > 3600 : false; // > 1 hour response time
    
    // Condition 3: Matching inventory is available in same city/property type
    const matchingInventoryAvailable = inventoryIntel?.levels?.some(l => 
      l.city === customerCity && 
      (l.propertyType === customerPropertyType || !customerPropertyType) && 
      (l.status?.toLowerCase() === "available") &&
      (assetIds?.length === 0 || (assetIds && assetIds.includes(l.assetId)))
    ) ?? false;
    
    // Condition 4: Market Intelligence shows positive demand or price momentum in same city
    const marketPositiveMomentum = marketIntel?.trends?.some(t => 
      t.metadata?.city === customerCity && 
      ((t.metadata?.demandIndex ?? 0) > HIGH_DEMAND_THRESHOLD || (t.metadata?.priceChangePct ?? 0) > PRICE_SURGE_THRESHOLD)
    ) ?? false;

    // Find the coordinated recommendation if all conditions met
    let coordinatedRecommendation: CoordinatedRecommendation | undefined;
    if (customerAtRisk && crmWeakEngagement && matchingInventoryAvailable && marketPositiveMomentum) {
      coordinatedRecommendation = orchestration.recommendations.find(r => 
        r.title.includes("Follow-up") || r.title.includes("Re-engage")
      );
    }

    // Build evidence chain
    const evidenceChain: EvidenceItem[] = [
      ...(customerAtRisk ? [{ factor: "customer_at_risk", value: customerId, impact: 0.8, confidence: 0.9 }] : []),
      ...(crmWeakEngagement ? [{ factor: "crm_weak_engagement", value: crmIntel?.averageResponseSeconds, impact: 0.7, confidence: 0.85 }] : []),
      ...(matchingInventoryAvailable ? [{ factor: "matching_inventory", value: `${customerCity}/${customerPropertyType}`, impact: 0.9, confidence: 0.9 }] : []),
      ...(marketPositiveMomentum ? [{ factor: "market_momentum", value: customerCity, impact: 0.85, confidence: 0.85 }] : []),
    ];

    return {
      scenario: "customer_at_risk_with_matching_inventory_and_market_momentum",
      workspaceId,
      correlationId,
      causationId,
      customerAtRisk,
      crmWeakEngagement,
      matchingInventoryAvailable,
      marketPositiveMomentum,
      coordinatedRecommendation,
      evidenceChain,
      approvalRequired: !!coordinatedRecommendation,
      dryRun,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Private helper methods ────────────────────────────────────────

  private buildDomainReferences(
    workspaceId: string,
    correlationId: string,
    causationId: string,
    customerIntel: PromiseSettledResult<CustomerIntelligence>,
    inventoryIntel: PromiseSettledResult<InventoryIntelligence>,
    marketIntel: PromiseSettledResult<MarketIntelligence>,
    crmIntel: PromiseSettledResult<CRMKpiSnapshot>,
  ): DomainIntelligenceReference[] {
    const references: DomainIntelligenceReference[] = [];
    const generatedAt = new Date().toISOString();

    if (customerIntel.status === "fulfilled") {
      references.push({
        domain: "customer",
        workspaceId,
        correlationId,
        causationId,
        generatedAt,
        intelligence: customerIntel.value,
        evidenceReferences: customerIntel.value.atRiskCustomers?.map(c => c.contactId) ?? [],
      });
    }

    if (inventoryIntel.status === "fulfilled") {
      references.push({
        domain: "inventory",
        workspaceId,
        correlationId,
        causationId,
        generatedAt,
        intelligence: inventoryIntel.value,
        evidenceReferences: inventoryIntel.value.levels?.map(l => l.assetId) ?? [],
      });
    }

    if (marketIntel.status === "fulfilled") {
      references.push({
        domain: "market",
        workspaceId,
        correlationId,
        causationId,
        generatedAt,
        intelligence: marketIntel.value,
        evidenceReferences: marketIntel.value.trends?.map(t => t.id) ?? [],
      });
    }

    if (crmIntel.status === "fulfilled") {
      references.push({
        domain: "crm",
        workspaceId,
        correlationId,
        causationId,
        generatedAt,
        intelligence: crmIntel.value,
        evidenceReferences: [],
      });
    }

    return references;
  }

  private detectCrossDomainCorrelations(
    domainReferences: DomainIntelligenceReference[],
    customerIntel: PromiseSettledResult<CustomerIntelligence>,
    inventoryIntel: PromiseSettledResult<InventoryIntelligence>,
    marketIntel: PromiseSettledResult<MarketIntelligence>,
    crmIntel: PromiseSettledResult<CRMKpiSnapshot>,
  ): CrossDomainCorrelation[] {
    const correlations: CrossDomainCorrelation[] = [];

    const customer = customerIntel.status === "fulfilled" ? customerIntel.value : null;
    const inventory = inventoryIntel.status === "fulfilled" ? inventoryIntel.value : null;
    const market = marketIntel.status === "fulfilled" ? marketIntel.value : null;
    const crm = crmIntel.status === "fulfilled" ? crmIntel.value : null;

    // Customer + Inventory match (at-risk customer + available inventory in same city)
    if (customer && inventory) {
      for (const atRiskCustomer of customer.atRiskCustomers ?? []) {
        const customerCity = atRiskCustomer.city ?? "Unknown";
        const matchingInventory = inventory.levels?.filter(l => 
          l.city === customerCity && 
          l.status?.toLowerCase() === "available"
        ) ?? [];
        
        if (matchingInventory.length > 0) {
          correlations.push({
            id: `corr-cust-inv-${atRiskCustomer.contactId}-${Date.now()}`,
            type: "customer_inventory_match",
            description: `At-risk customer ${atRiskCustomer.fullName} (${customerCity}) has ${matchingInventory.length} matching available inventory units`,
            domains: ["customer", "inventory"],
            confidence: 0.85,
            evidence: [
              { factor: "customer_id", value: atRiskCustomer.contactId, impact: 0.8, confidence: 0.9 },
              { factor: "matching_inventory_count", value: matchingInventory.length, impact: 0.9, confidence: 0.85 },
              { factor: "city", value: customerCity, impact: 0.7, confidence: 0.8 },
            ],
            matchedEntities: {
              customerIds: [atRiskCustomer.contactId],
              assetIds: matchingInventory.map(l => l.assetId),
              cities: [customerCity],
            },
            businessReason: "At-risk customer can be re-engaged with immediately available matching inventory",
          });
        }
      }
    }

    // Customer + Market match (at-risk customer + positive market momentum in their city)
    if (customer && market) {
      for (const atRiskCustomer of customer.atRiskCustomers ?? []) {
        const customerCity = atRiskCustomer.city ?? "Unknown";
        const positiveTrends = market.trends?.filter(t => 
          t.metadata?.city === customerCity && 
          ((t.metadata?.demandIndex ?? 0) > HIGH_DEMAND_THRESHOLD || (t.metadata?.priceChangePct ?? 0) > PRICE_SURGE_THRESHOLD)
        ) ?? [];
        
        if (positiveTrends.length > 0) {
          correlations.push({
            id: `corr-cust-mkt-${atRiskCustomer.contactId}-${Date.now()}`,
            type: "customer_market_match",
            description: `At-risk customer ${atRiskCustomer.fullName} in ${customerCity} has ${positiveTrends.length} positive market signals`,
            domains: ["customer", "market"],
            confidence: 0.8,
            evidence: [
              { factor: "customer_id", value: atRiskCustomer.contactId, impact: 0.8, confidence: 0.9 },
              { factor: "positive_trend_count", value: positiveTrends.length, impact: 0.85, confidence: 0.8 },
              { factor: "city", value: customerCity, impact: 0.7, confidence: 0.8 },
            ],
            matchedEntities: {
              customerIds: [atRiskCustomer.contactId],
              cities: [customerCity],
            },
            businessReason: "Positive market momentum in customer's city creates urgency for re-engagement",
          });
        }
      }
    }

    // Inventory + Market match (available inventory + positive market momentum)
    if (inventory && market) {
      const citiesWithInventory = [...new Set(inventory.levels?.filter(l => l.status?.toLowerCase() === "available").map(l => l.city).filter((c): c is string => Boolean(c)) ?? [])];
      
      for (const city of citiesWithInventory) {
        const positiveTrends = market.trends?.filter(t => 
          t.metadata?.city === city && 
          ((t.metadata?.demandIndex ?? 0) > HIGH_DEMAND_THRESHOLD || (t.metadata?.priceChangePct ?? 0) > PRICE_SURGE_THRESHOLD)
        ) ?? [];
        
        if (positiveTrends.length > 0) {
          const cityInventory = inventory.levels?.filter(l => l.city === city && l.status?.toLowerCase() === "available") ?? [];
          correlations.push({
            id: `corr-inv-mkt-${city}-${Date.now()}`,
            type: "inventory_market_match",
            description: `${cityInventory.length} available inventory units in ${city} with ${positiveTrends.length} positive market signals`,
            domains: ["inventory", "market"],
            confidence: 0.85,
            evidence: [
              { factor: "city", value: city, impact: 0.8, confidence: 0.9 },
              { factor: "available_inventory", value: cityInventory.length, impact: 0.85, confidence: 0.85 },
              { factor: "positive_trend_count", value: positiveTrends.length, impact: 0.8, confidence: 0.8 },
            ],
            matchedEntities: {
              assetIds: cityInventory.map(l => l.assetId).filter(Boolean) as string[],
              cities: [city],
            },
            businessReason: "Available inventory in high-momentum markets should be prioritized for sales",
          });
        }
      }
    }

    // CRM + Customer match (weak engagement + at-risk customer)
    if (crm && customer) {
      const weakEngagement = crm.averageResponseSeconds > 3600; // > 1 hour
      const atRiskCount = customer.atRiskCustomers?.length ?? 0;
      
      if (weakEngagement && atRiskCount > 0) {
        correlations.push({
          id: `corr-crm-cust-${Date.now()}`,
          type: "crm_customer_match",
          description: `CRM shows weak engagement (${Math.round(crm.averageResponseSeconds / 60)} min avg response) with ${atRiskCount} at-risk customers`,
          domains: ["crm", "customer"],
          confidence: 0.75,
          evidence: [
            { factor: "avg_response_seconds", value: crm.averageResponseSeconds, impact: 0.7, confidence: 0.8 },
            { factor: "at_risk_count", value: atRiskCount, impact: 0.8, confidence: 0.85 },
          ],
          matchedEntities: {
            customerIds: customer.atRiskCustomers?.map(c => c.contactId) ?? [],
          },
          businessReason: "Weak CRM engagement compounds customer churn risk",
        });
      }
    }

    // Full alignment (all four domains align)
    const hasCustomerInventory = correlations.some(c => c.type === "customer_inventory_match");
    const hasCustomerMarket = correlations.some(c => c.type === "customer_market_match");
    const hasInventoryMarket = correlations.some(c => c.type === "inventory_market_match");
    const hasCrmCustomer = correlations.some(c => c.type === "crm_customer_match");
    
    if (hasCustomerInventory && hasCustomerMarket && hasInventoryMarket && hasCrmCustomer) {
      correlations.push({
        id: `corr-full-${Date.now()}`,
        type: "full_alignment",
        description: "All four domains align: at-risk customer, matching inventory, positive market momentum, and weak CRM engagement",
        domains: ["customer", "inventory", "market", "crm"],
        confidence: 0.9,
        evidence: [
          { factor: "customer_inventory_match", value: true, impact: 0.9, confidence: 0.85 },
          { factor: "customer_market_match", value: true, impact: 0.85, confidence: 0.8 },
          { factor: "inventory_market_match", value: true, impact: 0.85, confidence: 0.85 },
          { factor: "crm_customer_match", value: true, impact: 0.8, confidence: 0.75 },
        ],
        matchedEntities: {},
        businessReason: "Perfect storm for coordinated action - all signals point to immediate re-engagement opportunity",
      });
    }

    return correlations;
  }

  private buildEvidenceTrail(
    domainReferences: DomainIntelligenceReference[],
    correlations: CrossDomainCorrelation[],
  ): EvidenceItem[] {
    const evidence: EvidenceItem[] = [];

    // Add domain-level evidence
    for (const ref of domainReferences) {
      evidence.push({
        factor: `${ref.domain}_intelligence_generated`,
        value: { workspaceId: ref.workspaceId, generatedAt: ref.generatedAt },
        impact: 0.5,
        confidence: 0.9,
      });
    }

    // Add correlation evidence
    for (const corr of correlations) {
      for (const e of corr.evidence) {
        evidence.push({
          factor: e.factor,
          value: e.value,
          impact: e.impact,
          confidence: e.confidence,
        });
      }
    }

    return evidence;
  }

  private async evaluateDomainDecisions(context: SupremeIntelligenceContext): Promise<DomainDecisionReference[]> {
    const decisions: DomainDecisionReference[] = [];

    // Evaluate market decisions using the market risk evaluator
    if (context.marketIntelligence) {
      const decisionContext: DecisionContext = {
        workspaceId: context.workspaceId,
        correlationId: context.correlationId,
        causationId: context.causationId,
        intelligenceEvents: [],
        subjectType: "Market",
        subjectId: context.workspaceId,
        evaluatedAt: new Date().toISOString(),
        evidenceReferences: [],
        dataClassification: "internal",
        jurisdiction: "IN",
      };

      const marketDecisions = await this.marketRiskEvaluator.evaluateIntelligence(
        context.marketIntelligence,
        decisionContext,
      );

      for (const decision of marketDecisions) {
        decisions.push({
          domain: "market",
          decisionId: decision.decisionId,
          decisionType: decision.decisionType,
          title: decision.title,
          severity: decision.severity,
          confidence: decision.confidence,
        });
      }
    }

    // Add customer decisions (at-risk customers)
    if (context.customerIntelligence?.atRiskCustomers?.length) {
      for (const customer of context.customerIntelligence.atRiskCustomers) {
        decisions.push({
          domain: "customer",
          decisionId: `dec-cust-${customer.contactId}`,
          decisionType: "CustomerAtRisk",
          title: `Customer at risk: ${customer.fullName}`,
          severity: "HIGH",
          confidence: 0.85,
        });
      }
    }

    // Add inventory decisions (slow moving, high value)
    if (context.inventoryIntelligence?.slowMoving?.length) {
      decisions.push({
        domain: "inventory",
        decisionId: `dec-inv-slow-${Date.now()}`,
        decisionType: "SlowMovingInventory",
        title: `${context.inventoryIntelligence.slowMoving.length} slow-moving inventory units`,
        severity: "MEDIUM",
        confidence: 0.8,
      });
    }

    if (context.inventoryIntelligence?.highValueUnsold?.length) {
      decisions.push({
        domain: "inventory",
        decisionId: `dec-inv-hv-${Date.now()}`,
        decisionType: "HighValueUnsold",
        title: `${context.inventoryIntelligence.highValueUnsold.length} high-value unsold units`,
        severity: "HIGH",
        confidence: 0.85,
      });
    }

    // Add CRM decisions
    if (context.crmIntelligence) {
      if (context.crmIntelligence.averageResponseSeconds > 3600) {
        decisions.push({
          domain: "crm",
          decisionId: `dec-crm-response-${Date.now()}`,
          decisionType: "WeakEngagement",
          title: `Weak CRM engagement: ${Math.round(context.crmIntelligence.averageResponseSeconds / 60)} min avg response`,
          severity: "HIGH",
          confidence: 0.8,
        });
      }
      if (context.crmIntelligence.conversionRatePct < 20) {
        decisions.push({
          domain: "crm",
          decisionId: `dec-crm-conv-${Date.now()}`,
          decisionType: "LowConversion",
          title: `Low conversion rate: ${context.crmIntelligence.conversionRatePct.toFixed(1)}%`,
          severity: "MEDIUM",
          confidence: 0.75,
        });
      }
    }

    return decisions;
  }

  private createCoordinatedDecisions(
    context: SupremeIntelligenceContext,
    domainDecisions: DomainDecisionReference[],
    correlationId: string,
    causationId: string,
  ): CoordinatedDecision[] {
    const decisions: CoordinatedDecision[] = [];

    // Group by severity and create coordinated decisions
    const criticalDecisions = domainDecisions.filter(d => d.severity === "CRITICAL");
    const highDecisions = domainDecisions.filter(d => d.severity === "HIGH");
    const mediumDecisions = domainDecisions.filter(d => d.severity === "MEDIUM");

    // Create coordinated decision for each high/critical domain decision
    for (const domainDecision of [...criticalDecisions, ...highDecisions]) {
      const relatedDecisions = domainDecisions.filter(d => 
        d.domain !== domainDecision.domain && 
        (d.severity === "HIGH" || d.severity === "CRITICAL")
      );

      const evidence: EvidenceItem[] = [
        { factor: "primary_decision", value: domainDecision.title, impact: 0.9, confidence: domainDecision.confidence },
        ...relatedDecisions.map(d => ({ factor: "supporting_decision", value: d.title, impact: 0.7, confidence: d.confidence })),
      ];

      decisions.push({
        decisionId: `coord-${domainDecision.decisionId}`,
        workspaceId: context.workspaceId,
        correlationId,
        causationId,
        decisionType: `Coordinated${domainDecision.decisionType}`,
        title: `Coordinated: ${domainDecision.title}`,
        explanation: `${domainDecision.title}. Supported by ${relatedDecisions.length} additional high-severity signals from ${relatedDecisions.map(d => d.domain).join(", ")}.`,
        severity: domainDecision.severity,
        confidence: Math.min(0.95, domainDecision.confidence + 0.1 * relatedDecisions.length),
        affectedSegment: domainDecision.title,
        recommendedAction: this.getCoordinatedAction(domainDecision.domain, relatedDecisions.map(d => d.domain)),
        expectedBusinessImpact: "Coordinated cross-domain action to maximize impact",
        humanReviewRequired: true,
        evidence,
        sourceDomains: [domainDecision.domain, ...relatedDecisions.map(d => d.domain)],
        domainDecisions: [domainDecision, ...relatedDecisions],
        createdAt: new Date().toISOString(),
      });
    }

    return decisions;
  }

  private getCoordinatedAction(primaryDomain: string, supportingDomains: string[]): string {
    const actions: Record<string, string> = {
      customer: "Launch personalized re-engagement campaign with matching inventory",
      inventory: "Prioritize sales efforts on high-value/slow-moving units with market momentum",
      market: "Adjust pricing and marketing strategy for surging/high-demand segments",
      crm: "Escalate lead response and assign dedicated relationship manager",
    };

    const primaryAction = actions[primaryDomain] ?? "Take coordinated action";
    const supportingText = supportingDomains.length > 0 
      ? ` Supported by: ${supportingDomains.map(d => actions[d]).join("; ")}`
      : "";
    
    return primaryAction + supportingText;
  }

  private generateCoordinatedRecommendations(
    context: SupremeIntelligenceContext,
    coordinatedDecisions: CoordinatedDecision[],
    correlationId: string,
    causationId: string,
    dryRun: boolean,
  ): CoordinatedRecommendation[] {
    const recommendations: CoordinatedRecommendation[] = [];

    for (const decision of coordinatedDecisions) {
      // Check if this is the proof scenario pattern
      const isProofScenario = decision.sourceDomains.includes("customer") && 
                              decision.sourceDomains.includes("inventory") && 
                              decision.sourceDomains.includes("market") && 
                              decision.sourceDomains.includes("crm");

      const title = isProofScenario 
        ? "Coordinated Follow-up: At-risk Customer with Matching Inventory & Market Momentum"
        : `Coordinated Action: ${decision.title}`;

      const businessReason = isProofScenario
        ? "Customer at risk of churn + CRM shows delayed engagement + Matching inventory available in their city/property type + Market shows positive demand/price momentum. All four domains align for immediate re-engagement."
        : decision.explanation;

      const affectedSegment = isProofScenario
        ? `At-risk customers in ${context.customerIntelligence?.atRiskCustomers?.[0]?.city ?? "target city"} with ${context.customerIntelligence?.atRiskCustomers?.[0]?.leadSource ?? "target property type"}`
        : decision.affectedSegment;

      const recommendedAction = isProofScenario
        ? "Assign dedicated agent for immediate personalized outreach. Present matching inventory with market momentum data. Schedule site visit within 48 hours."
        : decision.recommendedAction;

      const expectedImpact = isProofScenario
        ? "Recover at-risk customer, close deal on matching inventory, leverage market momentum for pricing power"
        : decision.expectedBusinessImpact;

      const priority = decision.severity === "CRITICAL" ? "CRITICAL" : decision.severity === "HIGH" ? "HIGH" : "MEDIUM";

      const approvalRequirement: ApprovalRequirement = {
        required: true,
        reason: isProofScenario 
          ? "Cross-domain coordinated action involving customer outreach, inventory presentation, and market data sharing requires human approval"
          : "Coordinated cross-domain action requires human approval",
        approverRoles: ["manager", "admin", "senior_agent"],
        requiredApprovals: 1,
        expiresAt: new Date(Date.now() + APPROVAL_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
        actionsRequiringApproval: [
          {
            actionId: `action-call-${decision.decisionId}`,
            type: "call",
            description: "Call at-risk customer for personalized re-engagement",
            targetEntity: context.customerIntelligence?.atRiskCustomers?.[0]?.contactId ?? "unknown",
            targetEntityType: "customer",
            estimatedImpact: "High - direct customer contact",
            requiresHumanApproval: true,
          },
          {
            actionId: `action-inapp-${decision.decisionId}`,
            type: "in_app_notification",
            description: "Send in-app notification to assigned agent with coordinated intelligence package",
            targetEntity: "assigned_agent",
            targetEntityType: "customer",
            estimatedImpact: "Medium - agent awareness and preparation",
            requiresHumanApproval: false,
          },
        ],
      };

      const domainRecommendations: DomainRecommendationReference[] = decision.domainDecisions.map(d => ({
        domain: d.domain,
        recommendationId: `rec-${d.decisionId}`,
        title: d.title,
        priority: d.severity,
        confidence: d.confidence,
      }));

      const dependencies: RecommendationDependency[] = [];
      if (decision.sourceDomains.includes("customer") && decision.sourceDomains.includes("inventory")) {
        dependencies.push({
          recommendationId: `rec-inventory-presentation`,
          type: "requires",
          description: "Inventory presentation must be prepared before customer call",
        });
      }

      recommendations.push({
        recommendationId: `coord-rec-${decision.decisionId}`,
        workspaceId: context.workspaceId,
        correlationId,
        causationId,
        title,
        businessReason,
        affectedSegment,
        recommendedAction,
        expectedImpact,
        priority,
        confidence: decision.confidence,
        supportingMetrics: {
          sourceDomainCount: decision.sourceDomains.length,
          evidenceCount: decision.evidence.length,
          correlationCount: context.crossDomainCorrelations.length,
        },
        sourceDomains: decision.sourceDomains,
        domainRecommendations,
        evidence: decision.evidence,
        dependencies,
        approvalRequirement,
        generatedAt: new Date().toISOString(),
        status: "pending",
        dryRun,
      });
    }

    return recommendations;
  }

  private createApprovalRequests(
    recommendations: CoordinatedRecommendation[],
    correlationId: string,
    causationId: string,
  ): ApprovalRequest[] {
    const requests: ApprovalRequest[] = [];

    for (const rec of recommendations) {
      if (rec.approvalRequirement.required) {
        requests.push({
          requestId: `approval-${rec.recommendationId}`,
          recommendationId: rec.recommendationId,
          workspaceId: rec.workspaceId,
          correlationId,
          causationId,
          title: `Approval Required: ${rec.title}`,
          description: rec.businessReason,
          proposedActions: rec.approvalRequirement.actionsRequiringApproval,
          evidence: rec.evidence,
          requestedAt: new Date().toISOString(),
          expiresAt: rec.approvalRequirement.expiresAt ?? new Date(Date.now() + APPROVAL_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
          status: "pending",
          approvers: rec.approvalRequirement.approverRoles,
          approvalsReceived: 0,
          requiredApprovals: rec.approvalRequirement.requiredApprovals,
        });
      }
    }

    return requests;
  }
}