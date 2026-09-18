/**
 * Inventory Risk Decision Evaluator
 *
 * Consumes Inventory Intelligence output and produces structured decisions
 * for conditions such as excess available inventory, ageing, low absorption,
 * high-value unsold concentration, regional imbalance, and healthy state.
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
  InventoryIntelligence,
  InventorySummary,
  InventoryGrouping,
} from "../../business-intelligence/inventory/types";
import type { InventoryRiskDetectedPayload } from "../../lib/event-fabric/inventory-events";

// ══════════════════════════════════════════════════════════════════
//  DECISION THRESHOLDS — all thresholds in one place
// ══════════════════════════════════════════════════════════════════

export const INVENTORY_THRESHOLDS = {
  // Excess available inventory: availability % above this is "excess"
  EXCESS_AVAILABILITY_PCT: 70,
  // Low absorption: absorption % below this is "low"
  LOW_ABSORPTION_PCT: 30,
  // Ageing: inventory older than this (days) is "ageing"
  AGEING_WARNING_DAYS: 90,
  AGEING_CRITICAL_DAYS: 120,
  // High-value unsold concentration: count above this is a risk
  HIGH_VALUE_UNSOLD_THRESHOLD: 3,
  // Regional imbalance: a single region holding more than this % of available inventory
  REGIONAL_IMBALANCE_PCT: 60,
  // No inventory available: available count at or below this
  NO_INVENTORY_THRESHOLD: 0,
  // Confidence levels
  CONFIDENCE_HIGH: 0.9,
  CONFIDENCE_MEDIUM: 0.75,
  CONFIDENCE_LOW: 0.6,
} as const;

// ══════════════════════════════════════════════════════════════════
//  EVALUATOR
// ══════════════════════════════════════════════════════════════════

/**
 * Evaluates inventory intelligence and produces risk decisions.
 *
 * Implements the DecisionEvaluator contract for single-event evaluation,
 * and provides evaluateIntelligence() for the full multi-rule pass.
 */
export class InventoryRiskEvaluator
  implements DecisionEvaluator<Event, InventoryRiskDetectedPayload>
{
  /**
   * Full evaluation: runs all rules against the intelligence context
   * and returns every qualifying decision.
   */
  async evaluateIntelligence(
    intelligence: InventoryIntelligence,
    context: DecisionContext,
  ): Promise<InventoryRiskDetectedPayload[]> {
    const summary = intelligence.inventorySummary;
    if (!summary || summary.total === 0) {
      // No inventory — return a single "no inventory" decision
      return [this.noInventoryDecision(intelligence, context)];
    }

    const decisions: InventoryRiskDetectedPayload[] = [];

    // Rule 1: Excess available inventory
    const excess = this.checkExcessAvailable(summary, intelligence, context);
    if (excess) decisions.push(excess);

    // Rule 2: Ageing beyond 90/120 days
    const ageing = this.checkAgeing(intelligence, context);
    if (ageing) decisions.push(ageing);

    // Rule 3: Low absorption
    const lowAbsorption = this.checkLowAbsorption(summary, intelligence, context);
    if (lowAbsorption) decisions.push(lowAbsorption);

    // Rule 4: High-value unsold concentration
    const highValue = this.checkHighValueUnsold(intelligence, context);
    if (highValue) decisions.push(highValue);

    // Rule 5: Regional/project imbalance
    const imbalance = this.checkRegionalImbalance(intelligence, context);
    if (imbalance) decisions.push(imbalance);

    // Rule 7: Healthy inventory (only if no other decisions fired)
    if (decisions.length === 0) {
      decisions.push(this.healthyDecision(summary, context));
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
  ): Promise<DecisionResult<InventoryRiskDetectedPayload> | undefined> {
    const payload = input.payload as Record<string, unknown>;
    const summary: InventorySummary = {
      total: Number(payload.totalUnits ?? 0),
      available: Number(payload.availableUnits ?? 0),
      sold: Number(payload.soldUnits ?? 0),
      reserved: Number(payload.reservedUnits ?? 0),
      blocked: Number(payload.blockedUnits ?? 0),
      availabilityPct: Number(payload.availabilityPct ?? 0),
      soldPct: Number(payload.soldPct ?? 0),
      absorptionPct: Number(payload.absorptionPct ?? 0),
      avgValue: 0,
      totalValue: Number(payload.totalValueInr ?? 0),
      availableValue: Number(payload.availableValueInr ?? 0),
      soldValue: Number(payload.soldValueInr ?? 0),
    };

    const intelligence: InventoryIntelligence = {
      levels: [],
      movements: [],
      inventorySummary: summary,
    };

    const decisions = await this.evaluateIntelligence(intelligence, context);
    if (decisions.length === 0) return undefined;

    const first = decisions[0];
    return this.toDecisionResult(first);
  }

  // ── Rule implementations ──────────────────────────────────────────

  private checkExcessAvailable(
    summary: InventorySummary,
    intelligence: InventoryIntelligence,
    context: DecisionContext,
  ): InventoryRiskDetectedPayload | null {
    if (summary.availabilityPct < INVENTORY_THRESHOLDS.EXCESS_AVAILABILITY_PCT) {
      return null;
    }

    return this.buildDecision({
      context,
      decisionType: "ExcessAvailableInventory",
      title: `Excess available inventory: ${summary.availabilityPct}% available`,
      explanation: `${summary.available} of ${summary.total} units are available (above ${INVENTORY_THRESHOLDS.EXCESS_AVAILABILITY_PCT}% threshold). Available inventory value: ₹${summary.availableValue.toLocaleString("en-IN")}.`,
      severity: "HIGH",
      confidence: INVENTORY_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: "All available inventory",
      recommendedAction: `Increase marketing exposure and lead prioritisation for ${summary.available} available units. Consider targeted incentives for slow-moving segments.`,
      expectedImpact: `Reduce available inventory by 20-30% within 60 days through accelerated sales focus.`,
      evidence: [
        { factor: "availabilityPct", value: summary.availabilityPct, impact: summary.availabilityPct, confidence: 0.95 },
        { factor: "availableUnits", value: summary.available, impact: summary.available, confidence: 0.9 },
        { factor: "availableValueInr", value: summary.availableValue, impact: summary.availableValue, confidence: 0.85 },
      ],
      humanReviewRequired: false,
    });
  }

  private checkAgeing(
    intelligence: InventoryIntelligence,
    context: DecisionContext,
  ): InventoryRiskDetectedPayload | null {
    const buckets = intelligence.ageingBuckets ?? [];
    const over90 = buckets
      .filter((b) => b.bucket.includes("91") || b.bucket.includes("120"))
      .reduce((sum, b) => sum + b.count, 0);
    const over120 = buckets.find((b) => b.bucket.includes("Over 120"));

    if (over90 === 0) return null;

    const isCritical = (over120?.count ?? 0) > 0;
    const slowMovingCount = intelligence.slowMoving?.length ?? 0;

    return this.buildDecision({
      context,
      decisionType: "InventoryAgeing",
      title: `Inventory ageing: ${over90} units older than 90 days${isCritical ? ` (${over120?.count} over 120 days)` : ""}`,
      explanation: `${over90} available units have been listed for more than 90 days. ${slowMovingCount} are classified as slow-moving. Ageing inventory ties up capital and may require repricing.`,
      severity: isCritical ? "CRITICAL" : "HIGH",
      confidence: INVENTORY_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: "Ageing available inventory",
      recommendedAction: isCritical
        ? `Prioritise leads for ${over120?.count ?? 0} units ageing over 120 days. Review pricing and consider ₹150-300/sqft reduction.`
        : `Monitor ${over90} units ageing 91-120 days. Prepare incentive plans if not sold within 30 days.`,
      expectedImpact: `Clear ${Math.ceil(over90 * 0.4)} ageing units within 45 days through targeted incentives.`,
      evidence: [
        { factor: "unitsOver90Days", value: over90, impact: over90, confidence: 0.9 },
        { factor: "unitsOver120Days", value: over120?.count ?? 0, impact: (over120?.count ?? 0) * 2, confidence: 0.85 },
        { factor: "slowMovingCount", value: slowMovingCount, impact: slowMovingCount, confidence: 0.8 },
      ],
      humanReviewRequired: isCritical,
    });
  }

  private checkLowAbsorption(
    summary: InventorySummary,
    intelligence: InventoryIntelligence,
    context: DecisionContext,
  ): InventoryRiskDetectedPayload | null {
    if (summary.absorptionPct >= INVENTORY_THRESHOLDS.LOW_ABSORPTION_PCT) {
      return null;
    }
    if (summary.total < 5) return null; // Not enough data for meaningful absorption

    return this.buildDecision({
      context,
      decisionType: "LowAbsorption",
      title: `Low absorption rate: only ${summary.absorptionPct}% of sellable inventory sold`,
      explanation: `Absorption is ${summary.absorptionPct}% (below ${INVENTORY_THRESHOLDS.LOW_ABSORPTION_PCT}% threshold). ${summary.sold} sold out of ${summary.sold + summary.available} sellable units. This indicates weak demand or pricing issues.`,
      severity: "HIGH",
      confidence: INVENTORY_THRESHOLDS.CONFIDENCE_MEDIUM,
      affectedSegment: "Sellable inventory (sold + available)",
      recommendedAction: `Increase marketing exposure for low-absorption projects. Review pricing competitiveness against comps. Activate channel partner incentives.`,
      expectedImpact: `Improve absorption to 40%+ within 60 days through combined marketing and pricing actions.`,
      evidence: [
        { factor: "absorptionPct", value: summary.absorptionPct, impact: -summary.absorptionPct, confidence: 0.85 },
        { factor: "soldUnits", value: summary.sold, impact: -summary.sold, confidence: 0.8 },
        { factor: "sellableUnits", value: summary.sold + summary.available, impact: summary.sold + summary.available, confidence: 0.75 },
      ],
      humanReviewRequired: false,
    });
  }

  private checkHighValueUnsold(
    intelligence: InventoryIntelligence,
    context: DecisionContext,
  ): InventoryRiskDetectedPayload | null {
    const highValue = intelligence.highValueUnsold ?? [];
    if (highValue.length < INVENTORY_THRESHOLDS.HIGH_VALUE_UNSOLD_THRESHOLD) {
      return null;
    }

    const totalValue = highValue.reduce((sum, l) => sum + (l.priceInr ?? 0), 0);
    const topItem = highValue[0];

    return this.buildDecision({
      context,
      decisionType: "HighValueUnsoldConcentration",
      title: `High-value unsold concentration: ${highValue.length} units worth ₹${totalValue.toLocaleString("en-IN")}`,
      explanation: `${highValue.length} high-value units (above 1.5× average price) remain unsold. Total capital locked: ₹${totalValue.toLocaleString("en-IN")}. Top unit: ${topItem?.name ?? "Unknown"} at ₹${(topItem?.priceInr ?? 0).toLocaleString("en-IN")}.`,
      severity: "HIGH",
      confidence: INVENTORY_THRESHOLDS.CONFIDENCE_MEDIUM,
      affectedSegment: "High-value available inventory",
      recommendedAction: `Review pricing for ${highValue.length} high-value unsold units. Consider premium channel activation (NRI, HNI) and flexible payment plans.`,
      expectedImpact: `Unlock ₹${Math.round(totalValue * 0.3).toLocaleString("en-IN")} in capital by converting 30% of high-value inventory within 90 days.`,
      evidence: [
        { factor: "highValueUnsoldCount", value: highValue.length, impact: highValue.length, confidence: 0.85 },
        { factor: "lockedValueInr", value: totalValue, impact: totalValue, confidence: 0.8 },
        { factor: "topUnitPrice", value: topItem?.priceInr ?? 0, impact: (topItem?.priceInr ?? 0), confidence: 0.7 },
      ],
      humanReviewRequired: true,
    });
  }

  private checkRegionalImbalance(
    intelligence: InventoryIntelligence,
    context: DecisionContext,
  ): InventoryRiskDetectedPayload | null {
    const byCity = intelligence.groupings?.byCity ?? [];
    if (byCity.length === 0) return null;

    const totalAvailable = byCity.reduce((sum, g) => sum + g.available, 0);
    if (totalAvailable === 0) return null;

    const dominant = byCity
      .filter((g) => g.available > 0)
      .map((g) => ({ ...g, pct: (g.available / totalAvailable) * 100 }))
      .sort((a, b) => b.pct - a.pct)[0];

    if (!dominant || dominant.pct < INVENTORY_THRESHOLDS.REGIONAL_IMBALANCE_PCT) {
      return null;
    }

    return this.buildDecision({
      context,
      decisionType: "RegionalImbalance",
      title: `Regional imbalance: ${dominant.name} holds ${dominant.pct.toFixed(1)}% of available inventory`,
      explanation: `${dominant.name} concentrates ${dominant.available} of ${totalAvailable} available units (${dominant.pct.toFixed(1)}%). This creates geographic risk concentration and limits portfolio diversification.`,
      severity: "MEDIUM",
      confidence: INVENTORY_THRESHOLDS.CONFIDENCE_LOW,
      affectedSegment: `Region: ${dominant.name}`,
      recommendedAction: `Reallocate sales focus toward other regions. Consider cross-region marketing campaigns. Evaluate pricing in ${dominant.name} to accelerate clearance.`,
      expectedImpact: `Reduce ${dominant.name} concentration to below 50% within 90 days by accelerating sales there and boosting other regions.`,
      evidence: [
        { factor: "dominantRegionPct", value: dominant.pct, impact: dominant.pct, confidence: 0.8 },
        { factor: "dominantRegionAvailable", value: dominant.available, impact: dominant.available, confidence: 0.75 },
        { factor: "totalAvailable", value: totalAvailable, impact: totalAvailable, confidence: 0.7 },
      ],
      humanReviewRequired: false,
    });
  }

  private noInventoryDecision(
    intelligence: InventoryIntelligence,
    context: DecisionContext,
  ): InventoryRiskDetectedPayload {
    return this.buildDecision({
      context,
      decisionType: "NoInventory",
      title: "No inventory available",
      explanation: "No inventory records were found for this workspace. The inventory intelligence cycle completed but found zero units to analyse.",
      severity: "LOW",
      confidence: INVENTORY_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: "Entire workspace",
      recommendedAction: "Verify inventory data ingestion. Ensure properties are being created with the correct workspace_id.",
      expectedImpact: "Once inventory data flows in, the intelligence cycle will produce real risk assessments.",
      evidence: [
        { factor: "totalUnits", value: 0, impact: 0, confidence: 1.0 },
      ],
      humanReviewRequired: false,
    });
  }

  private healthyDecision(
    summary: InventorySummary,
    context: DecisionContext,
  ): InventoryRiskDetectedPayload {
    return this.buildDecision({
      context,
      decisionType: "HealthyInventory",
      title: "Inventory is healthy",
      explanation: `Inventory health is good. ${summary.available} available, ${summary.sold} sold, ${summary.reserved} reserved. Absorption: ${summary.absorptionPct}%. Availability: ${summary.availabilityPct}%. No risk thresholds breached.`,
      severity: "LOW",
      confidence: INVENTORY_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: "All inventory",
      recommendedAction: "Continue current sales and marketing strategy. Monitor ageing buckets weekly.",
      expectedImpact: "Maintain healthy absorption above 30% and availability below 70%.",
      evidence: [
        { factor: "availabilityPct", value: summary.availabilityPct, impact: 0, confidence: 0.9 },
        { factor: "absorptionPct", value: summary.absorptionPct, impact: 0, confidence: 0.9 },
        { factor: "totalUnits", value: summary.total, impact: 0, confidence: 1.0 },
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
  }): InventoryRiskDetectedPayload {
    return {
      decisionId: `dec-inv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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
    payload: InventoryRiskDetectedPayload,
  ): DecisionResult<InventoryRiskDetectedPayload> {
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
