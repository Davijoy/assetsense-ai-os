/**
 * Market Risk Decision Evaluator
 *
 * Consumes Market Intelligence output and produces structured decisions
 * for conditions such as price surges, high demand, undervalued listings,
 * new project registrations, supply-demand gaps, and healthy state.
 *
 * Rules are explicit and deterministic. Thresholds are documented in one place.
 * No LLM is used — intelligence is reproducible and auditable.
 */

import type { Event } from "../../lib/event-fabric/event";
import type { DecisionEvaluator } from "../shared/decision-evaluator";
import type { DecisionContext } from "../shared/decision-context";
import type { DecisionResult } from "../shared/decision-result";
import type { EvidenceItem } from "../../business-intelligence/shared/evidence-item";
import type {
  MarketIntelligence,
  MarketTrend,
  MarketOpportunity,
  MarketListing,
} from "../../business-intelligence/market/types";
import type { MarketRiskDetectedPayload } from "../../lib/event-fabric/market-events";

// ══════════════════════════════════════════════════════════════════
//  DECISION THRESHOLDS — all thresholds in one place
// ══════════════════════════════════════════════════════════════════

export const MARKET_THRESHOLDS = {
  // Price surge: price change % above this is a surge
  PRICE_SURGE_PCT: 15,
  // High demand: demand index above this
  HIGH_DEMAND_INDEX: 70,
  // Undervalued: price per sqft below this % of city average
  UNDERVALUED_DISCOUNT_PCT: 30,
  // Low supply: listings count below this
  LOW_SUPPLY_COUNT: 10,
  // No market data: total listings at or below this
  NO_DATA_THRESHOLD: 0,
  // Confidence levels
  CONFIDENCE_HIGH: 0.9,
  CONFIDENCE_MEDIUM: 0.75,
  CONFIDENCE_LOW: 0.6,
} as const;

// ══════════════════════════════════════════════════════════════════
//  EVALUATOR
// ══════════════════════════════════════════════════════════════════

/**
 * Evaluates market intelligence and produces risk/opportunity decisions.
 *
 * Implements the DecisionEvaluator contract for single-event evaluation,
 * and provides evaluateIntelligence() for the full multi-rule pass.
 */
export class MarketRiskEvaluator
  implements DecisionEvaluator<Event, MarketRiskDetectedPayload>
{
  /**
   * Full evaluation: runs all rules against the intelligence context
   * and returns every qualifying decision.
   */
  async evaluateIntelligence(
    intelligence: MarketIntelligence,
    context: DecisionContext,
  ): Promise<MarketRiskDetectedPayload[]> {
    const summary = intelligence.summary as Record<string, unknown> | undefined;
    const totalListings = (summary?.totalListings as number) ?? intelligence.listings.length;
    
    if (totalListings === 0 && intelligence.trends.length === 0) {
      // No market data — return a single "no data" decision
      return [this.noDataDecision(intelligence, context)];
    }

    const decisions: MarketRiskDetectedPayload[] = [];

    // Rule 1: Price surge detection
    const priceSurge = this.checkPriceSurge(intelligence, context);
    if (priceSurge) decisions.push(priceSurge);

    // Rule 2: High demand detection
    const highDemand = this.checkHighDemand(intelligence, context);
    if (highDemand) decisions.push(highDemand);

    // Rule 3: Undervalued listings
    const undervalued = this.checkUndervaluedListings(intelligence, context);
    if (undervalued) decisions.push(undervalued);

    // Rule 4: New project registrations (compliance opportunities)
    const newProjects = this.checkNewProjectRegistrations(intelligence, context);
    if (newProjects) decisions.push(newProjects);

    // Rule 5: Supply-demand gaps
    const supplyGap = this.checkSupplyDemandGap(intelligence, context);
    if (supplyGap) decisions.push(supplyGap);

    // Rule 6: Healthy market (only if no other decisions fired)
    if (decisions.length === 0) {
      decisions.push(this.healthyDecision(intelligence, context));
    }

    return decisions;
  }

  /**
   * Single-event evaluation for DecisionEvaluator contract compliance.
   * Expects the input event payload to contain summary fields.
   */
  async evaluate(
    input: Event,
    context: DecisionContext,
  ): Promise<DecisionResult<MarketRiskDetectedPayload> | undefined> {
    const payload = input.payload as Record<string, unknown>;
    const summary = {
      totalListings: Number(payload.totalListings ?? 0),
      totalTrends: Number(payload.totalTrends ?? 0),
      totalCompliance: Number(payload.totalCompliance ?? 0),
      avgPricePerSqft: Number(payload.avgPricePerSqft ?? 0),
      medianPricePerSqft: Number(payload.medianPricePerSqft ?? 0),
      priceChangePct: Number(payload.priceChangePct ?? 0),
      demandIndex: Number(payload.demandIndex ?? 0),
    };

    const intelligence: MarketIntelligence = {
      trends: [],
      opportunities: [],
      listings: [],
      compliance: [],
      summary,
    };

    const decisions = await this.evaluateIntelligence(intelligence, context);
    if (decisions.length === 0) return undefined;

    const first = decisions[0];
    return this.toDecisionResult(first);
  }

  // ── Rule implementations ──────────────────────────────────────────

  private checkPriceSurge(
    intelligence: MarketIntelligence,
    context: DecisionContext,
  ): MarketRiskDetectedPayload | null {
    const trends = intelligence.trends;
    const priceSurgeTrends = trends.filter(
      (t) => (t.metadata?.priceChangePct ?? 0) > MARKET_THRESHOLDS.PRICE_SURGE_PCT
    );

    if (priceSurgeTrends.length === 0) return null;

    const topSurge = priceSurgeTrends.reduce((max, t) => 
      (t.metadata?.priceChangePct ?? 0) > (max.metadata?.priceChangePct ?? 0) ? t : max
    );

    const priceChangePct = topSurge.metadata?.priceChangePct ?? 0;
    const city = topSurge.metadata?.city ?? "Unknown";
    const propertyType = topSurge.metadata?.propertyType ?? "all types";

    return this.buildDecision({
      context,
      decisionType: "PriceSurgeDetected",
      title: `Price surge detected: ${priceChangePct.toFixed(1)}% increase in ${city}`,
      explanation: `${priceSurgeTrends.length} market segments show price growth above ${MARKET_THRESHOLDS.PRICE_SURGE_PCT}%. Strongest surge: ${city} (${propertyType}) at ${priceChangePct.toFixed(1)}%. This indicates accelerating market momentum.`,
      severity: "HIGH",
      confidence: MARKET_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: `${city} - ${propertyType}`,
      recommendedAction: `Accelerate acquisition in surging segments. Increase marketing for listings in ${city}. Alert sales teams to prioritize high-growth inventory.`,
      expectedImpact: `Capture 15-25% additional value on new acquisitions in surging segments within 90 days.`,
      evidence: [
        { factor: "priceChangePct", value: priceChangePct, impact: priceChangePct, confidence: 0.95 },
        { factor: "surgeCount", value: priceSurgeTrends.length, impact: priceSurgeTrends.length, confidence: 0.9 },
        { factor: "city", value: city, impact: 0, confidence: 0.85 },
      ],
      humanReviewRequired: false,
    });
  }

  private checkHighDemand(
    intelligence: MarketIntelligence,
    context: DecisionContext,
  ): MarketRiskDetectedPayload | null {
    const trends = intelligence.trends;
    const highDemandTrends = trends.filter(
      (t) => (t.metadata?.demandIndex ?? 0) > MARKET_THRESHOLDS.HIGH_DEMAND_INDEX
    );

    if (highDemandTrends.length === 0) return null;

    const topDemand = highDemandTrends.reduce((max, t) => 
      (t.metadata?.demandIndex ?? 0) > (max.metadata?.demandIndex ?? 0) ? t : max
    );

    const demandIndex = topDemand.metadata?.demandIndex ?? 0;
    const city = topDemand.metadata?.city ?? "Unknown";
    const propertyType = topDemand.metadata?.propertyType ?? "all types";

    return this.buildDecision({
      context,
      decisionType: "HighDemandDetected",
      title: `High demand detected: demand index ${demandIndex} in ${city}`,
      explanation: `${highDemandTrends.length} market segments show demand index above ${MARKET_THRESHOLDS.HIGH_DEMAND_INDEX}. Strongest demand: ${city} (${propertyType}) at index ${demandIndex}. High demand with limited supply creates pricing power.`,
      severity: "HIGH",
      confidence: MARKET_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: `${city} - ${propertyType}`,
      recommendedAction: `Prioritize inventory allocation to high-demand segments. Consider price optimization for ${city}. Activate waitlist and pre-launch strategies.`,
      expectedImpact: `Achieve 10-20% price premium on new listings in high-demand segments. Reduce days-on-market by 30-50%.`,
      evidence: [
        { factor: "demandIndex", value: demandIndex, impact: demandIndex, confidence: 0.95 },
        { factor: "highDemandCount", value: highDemandTrends.length, impact: highDemandTrends.length, confidence: 0.9 },
        { factor: "city", value: city, impact: 0, confidence: 0.85 },
      ],
      humanReviewRequired: false,
    });
  }

  private checkUndervaluedListings(
    intelligence: MarketIntelligence,
    context: DecisionContext,
  ): MarketRiskDetectedPayload | null {
    const opportunities = intelligence.opportunities.filter(
      (o) => o.type === "undervalued_listing"
    );

    if (opportunities.length === 0) return null;

    const totalDiscount = opportunities.reduce((sum, o) => sum + (Number(o.details?.discountPct) ?? 0), 0);
    const avgDiscount = totalDiscount / opportunities.length;
    const topOpportunity = opportunities.reduce((max, o) => 
      (Number(o.details?.discountPct) ?? 0) > (Number(max.details?.discountPct) ?? 0) ? o : max
    );

    const topDiscountPct = Number(topOpportunity.details?.discountPct) ?? 0;
    const topCity = topOpportunity.details?.city ?? "Unknown";
    const topLocality = topOpportunity.details?.locality ?? "Unknown";
    const topPricePerSqft = topOpportunity.details?.pricePerSqft ?? 0;
    const topCityAvgPricePerSqft = topOpportunity.details?.cityAvgPricePerSqft ?? 0;

    return this.buildDecision({
      context,
      decisionType: "UndervaluedListingsDetected",
      title: `${opportunities.length} undervalued listings found (avg ${avgDiscount.toFixed(0)}% below market)`,
      explanation: `${opportunities.length} listings priced ${MARKET_THRESHOLDS.UNDERVALUED_DISCOUNT_PCT}%+ below city average. Best opportunity: ${topCity} - ${topLocality} at ${topDiscountPct}% discount (₹${topPricePerSqft}/sqft vs ₹${topCityAvgPricePerSqft}/sqft avg).`,
      severity: "MEDIUM",
      confidence: MARKET_THRESHOLDS.CONFIDENCE_MEDIUM,
      affectedSegment: "Undervalued available inventory",
      recommendedAction: `Fast-track acquisition of ${opportunities.length} undervalued listings. Negotiate bulk purchase discounts. Position for quick resale at market rates.`,
      expectedImpact: `Unlock ₹${Math.round(opportunities.reduce((sum, o) => sum + (Number(o.estimatedValue) ?? 0), 0)).toLocaleString("en-IN")} in immediate equity through below-market acquisitions.`,
      evidence: [
        { factor: "undervaluedCount", value: opportunities.length, impact: opportunities.length, confidence: 0.85 },
        { factor: "avgDiscountPct", value: avgDiscount, impact: avgDiscount, confidence: 0.8 },
        { factor: "topDiscountPct", value: topDiscountPct, impact: topDiscountPct, confidence: 0.75 },
      ],
      humanReviewRequired: true,
    });
  }

  private checkNewProjectRegistrations(
    intelligence: MarketIntelligence,
    context: DecisionContext,
  ): MarketRiskDetectedPayload | null {
    const opportunities = intelligence.opportunities.filter(
      (o) => o.type === "new_project_registration"
    );

    if (opportunities.length === 0) return null;

    const cities = [...new Set(opportunities.map((o) => o.details?.city).filter(Boolean))];

    return this.buildDecision({
      context,
      decisionType: "NewProjectRegistrations",
      title: `${opportunities.length} new RERA project registrations across ${cities.length} cities`,
      explanation: `${opportunities.length} newly registered projects detected. Cities: ${cities.join(", ")}. New registrations indicate fresh supply entering the market and potential early-bird opportunities.`,
      severity: "MEDIUM",
      confidence: MARKET_THRESHOLDS.CONFIDENCE_MEDIUM,
      affectedSegment: `New supply in: ${cities.join(", ")}`,
      recommendedAction: `Monitor new project launches for partnership opportunities. Evaluate pre-launch inventory allocation. Track promoter reputation and delivery timelines.`,
      expectedImpact: `Secure early access to ${opportunities.length} new projects. Potential 5-15% pre-launch pricing advantage.`,
      evidence: [
        { factor: "newProjectCount", value: opportunities.length, impact: opportunities.length, confidence: 0.9 },
        { factor: "citiesCount", value: cities.length, impact: cities.length, confidence: 0.85 },
        { factor: "cities", value: cities.join(", "), impact: 0, confidence: 0.8 },
      ],
      humanReviewRequired: false,
    });
  }

  private checkSupplyDemandGap(
    intelligence: MarketIntelligence,
    context: DecisionContext,
  ): MarketRiskDetectedPayload | null {
    const opportunities = intelligence.opportunities.filter(
      (o) => o.type === "supply_demand_gap"
    );

    if (opportunities.length === 0) return null;

    const topGap = opportunities.reduce((max, o) => 
      (Number(o.details?.demandIndex) ?? 0) > (Number(max.details?.demandIndex) ?? 0) ? o : max
    );

    const topGapCity = topGap.details?.city ?? "Unknown";
    const topGapPropertyType = topGap.details?.propertyType ?? "all property types";
    const topGapDemandIndex = Number(topGap.details?.demandIndex) ?? 0;
    const topGapListingCount = Number(topGap.details?.listingCount) ?? 0;

    return this.buildDecision({
      context,
      decisionType: "SupplyDemandGap",
      title: `Supply-demand gap: ${topGapCity} has ${topGapListingCount} listings but demand index ${topGapDemandIndex}`,
      explanation: `${opportunities.length} markets show high demand (index > ${MARKET_THRESHOLDS.HIGH_DEMAND_INDEX}) with low supply (< ${MARKET_THRESHOLDS.LOW_SUPPLY_COUNT} listings). Largest gap: ${topGapCity} with only ${topGapListingCount} listings and demand index ${topGapDemandIndex}.`,
      severity: "HIGH",
      confidence: MARKET_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: `${topGapCity} - ${topGapPropertyType}`,
      recommendedAction: `Aggressively source inventory in ${topGapCity}. Partner with developers for exclusive mandates. Consider land acquisition for new development.`,
      expectedImpact: `Capture dominant market share in ${opportunities.length} undersupplied markets. Achieve 20-40% faster sales velocity.`,
      evidence: [
        { factor: "gapCount", value: opportunities.length, impact: opportunities.length, confidence: 0.9 },
        { factor: "topGapCity", value: topGapCity, impact: 0, confidence: 0.85 },
        { factor: "topGapDemandIndex", value: topGapDemandIndex, impact: topGapDemandIndex, confidence: 0.8 },
        { factor: "topGapListingCount", value: topGapListingCount, impact: -topGapListingCount, confidence: 0.75 },
      ],
      humanReviewRequired: true,
    });
  }

  private noDataDecision(
    intelligence: MarketIntelligence,
    context: DecisionContext,
  ): MarketRiskDetectedPayload {
    return this.buildDecision({
      context,
      decisionType: "NoMarketData",
      title: "No market data available",
      explanation: "No market listings, trends, or compliance records were found for this workspace. The market intelligence cycle completed but found zero data points to analyse.",
      severity: "LOW",
      confidence: MARKET_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: "Entire workspace",
      recommendedAction: "Verify market data ingestion from real estate agent. Ensure API keys are configured. Check ingestion function logs for errors.",
      expectedImpact: "Once market data flows in, the intelligence cycle will produce real risk and opportunity assessments.",
      evidence: [
        { factor: "totalListings", value: 0, impact: 0, confidence: 1.0 },
        { factor: "totalTrends", value: 0, impact: 0, confidence: 1.0 },
        { factor: "totalCompliance", value: 0, impact: 0, confidence: 1.0 },
      ],
      humanReviewRequired: false,
    });
  }

  private healthyDecision(
    intelligence: MarketIntelligence,
    context: DecisionContext,
  ): MarketRiskDetectedPayload {
    const summary = intelligence.summary as Record<string, unknown> | undefined;
    const avgPricePerSqft = Number(summary?.avgPricePerSqft) ?? 0;
    const demandIndex = Number(summary?.demandIndex) ?? 50;
    const priceChangePct = Number(summary?.priceChangePct) ?? 0;

    return this.buildDecision({
      context,
      decisionType: "HealthyMarket",
      title: "Market conditions are healthy",
      explanation: `Market health is stable. Avg price: ₹${avgPricePerSqft.toLocaleString("en-IN")}/sqft. Demand index: ${demandIndex}. Price change: ${priceChangePct.toFixed(1)}%. No risk thresholds breached. ${intelligence.opportunities.length} opportunities identified for monitoring.`,
      severity: "LOW",
      confidence: MARKET_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: "All market segments",
      recommendedAction: "Continue current market monitoring strategy. Track price trends weekly. Review opportunity pipeline monthly.",
      expectedImpact: "Maintain market awareness. Early detection of emerging risks and opportunities.",
      evidence: [
        { factor: "avgPricePerSqft", value: avgPricePerSqft, impact: 0, confidence: 0.9 },
        { factor: "demandIndex", value: demandIndex, impact: 0, confidence: 0.9 },
        { factor: "priceChangePct", value: priceChangePct, impact: 0, confidence: 0.9 },
        { factor: "opportunitiesCount", value: intelligence.opportunities.length, impact: 0, confidence: 0.8 },
      ],
      humanReviewRequired: false,
    });
  }

  // ── Decision builder ────────────────────────────────────────────

  private buildDecision(params: {
    context: DecisionContext;
    decisionType: string;
    title: string;
    explanation: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    confidence: number;
    affectedSegment: string;
    recommendedAction: string;
    expectedImpact: string;
    evidence: EvidenceItem[];
    humanReviewRequired: boolean;
  }): MarketRiskDetectedPayload {
    return {
      decisionId: `dec-mkt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      workspaceId: params.context.workspaceId,
      decisionType: params.decisionType,
      title: params.title,
      explanation: params.explanation,
      severity: params.severity,
      confidence: params.confidence,
      affectedSegment: params.affectedSegment,
      recommendedAction: params.recommendedAction,
      expectedBusinessImpact: params.expectedImpact,
      humanReviewRequired: params.humanReviewRequired,
      evidence: params.evidence,
      createdAt: new Date().toISOString(),
    };
  }

  private toDecisionResult(
    payload: MarketRiskDetectedPayload,
  ): DecisionResult<MarketRiskDetectedPayload> {
    return {
      decisionType: payload.decisionType,
      confidence: payload.confidence,
      rationale: payload.title,
      explanation: payload.explanation,
      evidence: payload.evidence,
      payload,
      alternativesConsidered: [],
      expectedBusinessValue: payload.expectedBusinessImpact,
      estimatedRisk: payload.severity,
      humanReviewRequired: payload.humanReviewRequired,
      generatedAt: payload.createdAt,
      recommendedNextEvaluation: "24h",
    };
  }
}