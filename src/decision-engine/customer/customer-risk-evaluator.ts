/**
 * Customer Risk Decision Evaluator
 *
 * Consumes Customer Intelligence output and produces structured decisions
 * for conditions such as low engagement, high churn risk, lead source imbalance,
 * high-value customer concentration, do-not-contact compliance, and healthy state.
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
  CustomerIntelligence,
  CustomerSummary,
  CustomerGrouping,
} from "../../business-intelligence/customer/types";
import type { CustomerRiskDetectedPayload } from "../../lib/event-fabric/customer-events";

// ══════════════════════════════════════════════════════════════════
//  DECISION THRESHOLDS — all thresholds in one place
// ══════════════════════════════════════════════════════════════════

export const CUSTOMER_THRESHOLDS = {
  // Low engagement: average engagement score below this
  LOW_ENGAGEMENT_SCORE: 40,
  // High churn risk: inactive percentage above this
  HIGH_CHURN_RISK_PCT: 30,
  // Lead source concentration: a single source holding more than this % of contacts
  LEAD_SOURCE_CONCENTRATION_PCT: 50,
  // High-value customer concentration: count above this is a risk
  HIGH_VALUE_CUSTOMER_THRESHOLD: 5,
  // Do-not-contact compliance: percentage above this is a risk
  DO_NOT_CONTACT_PCT: 5,
  // No contacts: total count at or below this
  NO_CONTACTS_THRESHOLD: 0,
  // Low active percentage: active % below this
  LOW_ACTIVE_PCT: 20,
  // Confidence levels
  CONFIDENCE_HIGH: 0.9,
  CONFIDENCE_MEDIUM: 0.75,
  CONFIDENCE_LOW: 0.6,
} as const;

// ══════════════════════════════════════════════════════════════════
//  EVALUATOR
// ══════════════════════════════════════════════════════════════════

/**
 * Evaluates customer intelligence and produces risk decisions.
 *
 * Implements the DecisionEvaluator contract for single-event evaluation,
 * and provides evaluateIntelligence() for the full multi-rule pass.
 */
export class CustomerRiskEvaluator
  implements DecisionEvaluator<Event, CustomerRiskDetectedPayload>
{
  /**
   * Full evaluation: runs all rules against the intelligence context
   * and returns every qualifying decision.
   */
  async evaluateIntelligence(
    intelligence: CustomerIntelligence,
    context: DecisionContext,
  ): Promise<CustomerRiskDetectedPayload[]> {
    const summary = intelligence.customerSummary;
    if (!summary || summary.total === 0) {
      // No contacts — return a single "no contacts" decision
      return [this.noContactsDecision(intelligence, context)];
    }

    const decisions: CustomerRiskDetectedPayload[] = [];

    // Rule 1: Low engagement score
    const lowEngagement = this.checkLowEngagement(summary, intelligence, context);
    if (lowEngagement) decisions.push(lowEngagement);

    // Rule 2: High churn risk (high inactive percentage)
    const highChurn = this.checkHighChurnRisk(summary, intelligence, context);
    if (highChurn) decisions.push(highChurn);

    // Rule 3: Lead source concentration
    const leadSourceConcentration = this.checkLeadSourceConcentration(intelligence, context);
    if (leadSourceConcentration) decisions.push(leadSourceConcentration);

    // Rule 4: High-value customer concentration
    const highValue = this.checkHighValueCustomerConcentration(intelligence, context);
    if (highValue) decisions.push(highValue);

    // Rule 5: Do-not-contact compliance risk
    const dncRisk = this.checkDoNotContactCompliance(summary, intelligence, context);
    if (dncRisk) decisions.push(dncRisk);

    // Rule 6: Low active percentage
    const lowActive = this.checkLowActivePercentage(summary, intelligence, context);
    if (lowActive) decisions.push(lowActive);

    // Rule 7: Healthy customer base (only if no other decisions fired)
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
  ): Promise<DecisionResult<CustomerRiskDetectedPayload> | undefined> {
    const payload = input.payload as Record<string, unknown>;
    const summary: CustomerSummary = {
      total: Number(payload.totalContacts ?? 0),
      active: Number(payload.activeContacts ?? 0),
      new: Number(payload.newContacts ?? 0),
      inactive: Number(payload.inactiveContacts ?? 0),
      customer: Number(payload.customerContacts ?? 0),
      partner: Number(payload.partnerContacts ?? 0),
      vendor: Number(payload.vendorContacts ?? 0),
      referral: Number(payload.referralContacts ?? 0),
      archived: Number(payload.archivedContacts ?? 0),
      totalValueInr: Number(payload.totalValueInr ?? 0),
      avgEngagementScore: Number(payload.avgEngagementScore ?? 0),
      activePct: Number(payload.activePct ?? 0),
      customerPct: Number(payload.customerPct ?? 0),
      inactivePct: Number(payload.inactivePct ?? 0),
      doNotContactPct: Number(payload.doNotContactPct ?? 0),
    };

    const intelligence: CustomerIntelligence = {
      levels: [],
      movements: [],
      customerSummary: summary,
    };

    const decisions = await this.evaluateIntelligence(intelligence, context);
    if (decisions.length === 0) return undefined;

    const first = decisions[0];
    return this.toDecisionResult(first);
  }

  // ── Rule implementations ──────────────────────────────────────────

  private checkLowEngagement(
    summary: CustomerSummary,
    intelligence: CustomerIntelligence,
    context: DecisionContext,
  ): CustomerRiskDetectedPayload | null {
    if (summary.avgEngagementScore >= CUSTOMER_THRESHOLDS.LOW_ENGAGEMENT_SCORE) {
      return null;
    }
    if (summary.total < 5) return null; // Not enough data for meaningful engagement

    return this.buildDecision({
      context,
      decisionType: "LowEngagement",
      title: `Low customer engagement: average score ${summary.avgEngagementScore}`,
      explanation: `Average engagement score is ${summary.avgEngagementScore} (below ${CUSTOMER_THRESHOLDS.LOW_ENGAGEMENT_SCORE} threshold). ${summary.total} contacts analyzed. Low engagement indicates poor relationship health and potential churn.`,
      severity: "HIGH",
      confidence: CUSTOMER_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: "All contacts",
      recommendedAction: `Launch re-engagement campaign for ${summary.inactive + summary.new} inactive/new contacts. Prioritize high-value at-risk customers. Review communication frequency and content relevance.`,
      expectedImpact: `Improve average engagement score by 20-30 points within 60 days through targeted outreach.`,
      evidence: [
        { factor: "avgEngagementScore", value: summary.avgEngagementScore, impact: -summary.avgEngagementScore, confidence: 0.95 },
        { factor: "totalContacts", value: summary.total, impact: summary.total, confidence: 0.9 },
        { factor: "inactiveContacts", value: summary.inactive, impact: summary.inactive, confidence: 0.85 },
      ],
      humanReviewRequired: false,
    });
  }

  private checkHighChurnRisk(
    summary: CustomerSummary,
    intelligence: CustomerIntelligence,
    context: DecisionContext,
  ): CustomerRiskDetectedPayload | null {
    if (summary.inactivePct < CUSTOMER_THRESHOLDS.HIGH_CHURN_RISK_PCT) {
      return null;
    }
    if (summary.total < 10) return null; // Not enough data for meaningful churn analysis

    const atRiskCount = intelligence.atRiskCustomers?.length ?? 0;

    return this.buildDecision({
      context,
      decisionType: "HighChurnRisk",
      title: `High churn risk: ${summary.inactivePct}% inactive contacts`,
      explanation: `${summary.inactive} of ${summary.total} contacts are inactive (${summary.inactivePct}%, above ${CUSTOMER_THRESHOLDS.HIGH_CHURN_RISK_PCT}% threshold). ${atRiskCount} contacts have had no activity for over 60 days.`,
      severity: "CRITICAL",
      confidence: CUSTOMER_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: "Inactive and at-risk contacts",
      recommendedAction: `Immediate win-back campaign for ${summary.inactive} inactive contacts. Assign dedicated account managers for ${atRiskCount} at-risk high-value contacts. Implement automated re-engagement workflows.`,
      expectedImpact: `Reduce inactive percentage to below 20% within 90 days. Recover ${Math.ceil(summary.inactive * 0.3)} contacts.`,
      evidence: [
        { factor: "inactivePct", value: summary.inactivePct, impact: summary.inactivePct, confidence: 0.95 },
        { factor: "inactiveCount", value: summary.inactive, impact: summary.inactive, confidence: 0.9 },
        { factor: "atRiskCount", value: atRiskCount, impact: atRiskCount * 2, confidence: 0.85 },
      ],
      humanReviewRequired: true,
    });
  }

  private checkLeadSourceConcentration(
    intelligence: CustomerIntelligence,
    context: DecisionContext,
  ): CustomerRiskDetectedPayload | null {
    const byLeadSource = intelligence.groupings?.byLeadSource ?? [];
    if (byLeadSource.length === 0) return null;

    const totalContacts = byLeadSource.reduce((sum, g) => sum + g.total, 0);
    if (totalContacts === 0) return null;

    const dominant = byLeadSource
      .filter((g) => g.total > 0)
      .map((g) => ({ ...g, pct: (g.total / totalContacts) * 100 }))
      .sort((a, b) => b.pct - a.pct)[0];

    if (!dominant || dominant.pct < CUSTOMER_THRESHOLDS.LEAD_SOURCE_CONCENTRATION_PCT) {
      return null;
    }

    return this.buildDecision({
      context,
      decisionType: "LeadSourceConcentration",
      title: `Lead source concentration: ${dominant.name} provides ${dominant.pct.toFixed(1)}% of contacts`,
      explanation: `${dominant.name} contributes ${dominant.total} of ${totalContacts} contacts (${dominant.pct.toFixed(1)}%). Over-reliance on a single lead source creates acquisition risk and limits pipeline diversity.`,
      severity: "MEDIUM",
      confidence: CUSTOMER_THRESHOLDS.CONFIDENCE_MEDIUM,
      affectedSegment: `Lead source: ${dominant.name}`,
      recommendedAction: `Diversify lead generation channels. Invest in ${dominant.name} alternatives (content marketing, referrals, partnerships, paid channels). Track source attribution for new contacts.`,
      expectedImpact: `Reduce ${dominant.name} concentration to below 40% within 120 days by growing alternative sources.`,
      evidence: [
        { factor: "dominantSourcePct", value: dominant.pct, impact: dominant.pct, confidence: 0.85 },
        { factor: "dominantSourceCount", value: dominant.total, impact: dominant.total, confidence: 0.8 },
        { factor: "totalContacts", value: totalContacts, impact: totalContacts, confidence: 0.75 },
      ],
      humanReviewRequired: false,
    });
  }

  private checkHighValueCustomerConcentration(
    intelligence: CustomerIntelligence,
    context: DecisionContext,
  ): CustomerRiskDetectedPayload | null {
    const highValue = intelligence.highValueCustomers ?? [];
    if (highValue.length < CUSTOMER_THRESHOLDS.HIGH_VALUE_CUSTOMER_THRESHOLD) {
      return null;
    }

    const totalValue = highValue.reduce((sum, l) => sum + (l.totalValueInr ?? 0), 0);
    const topCustomer = highValue[0];

    return this.buildDecision({
      context,
      decisionType: "HighValueCustomerConcentration",
      title: `High-value customer concentration: ${highValue.length} customers worth ₹${totalValue.toLocaleString("en-IN")}`,
      explanation: `${highValue.length} high-value customers (above 2× average value) represent significant revenue concentration. Total value: ₹${totalValue.toLocaleString("en-IN")}. Top customer: ${topCustomer?.fullName ?? "Unknown"} at ₹${(topCustomer?.totalValueInr ?? 0).toLocaleString("en-IN")}.`,
      severity: "HIGH",
      confidence: CUSTOMER_THRESHOLDS.CONFIDENCE_MEDIUM,
      affectedSegment: "High-value customers",
      recommendedAction: `Implement key account management for ${highValue.length} high-value customers. Develop retention programs with dedicated success managers. Create expansion revenue playbooks.`,
      expectedImpact: `Secure 95%+ retention of high-value customers. Identify expansion opportunities worth ₹${Math.round(totalValue * 0.2).toLocaleString("en-IN")} within 180 days.`,
      evidence: [
        { factor: "highValueCustomerCount", value: highValue.length, impact: highValue.length, confidence: 0.85 },
        { factor: "concentratedValueInr", value: totalValue, impact: totalValue, confidence: 0.8 },
        { factor: "topCustomerValue", value: topCustomer?.totalValueInr ?? 0, impact: (topCustomer?.totalValueInr ?? 0), confidence: 0.7 },
      ],
      humanReviewRequired: true,
    });
  }

  private checkDoNotContactCompliance(
    summary: CustomerSummary,
    intelligence: CustomerIntelligence,
    context: DecisionContext,
  ): CustomerRiskDetectedPayload | null {
    if (summary.doNotContactPct < CUSTOMER_THRESHOLDS.DO_NOT_CONTACT_PCT) {
      return null;
    }

    return this.buildDecision({
      context,
      decisionType: "DoNotContactComplianceRisk",
      title: `Do-not-contact compliance risk: ${summary.doNotContactPct}% of contacts opted out`,
      explanation: `${summary.doNotContactPct}% of contacts (${Math.round(summary.total * summary.doNotContactPct / 100)} contacts) have do-not-contact flag enabled. This may indicate GDPR/TCPA compliance issues or poor consent management.`,
      severity: "MEDIUM",
      confidence: CUSTOMER_THRESHOLDS.CONFIDENCE_MEDIUM,
      affectedSegment: "Contacts with do-not-contact flag",
      recommendedAction: `Audit consent records for all flagged contacts. Verify opt-out processes are compliant. Review communication preferences and update consent management workflows.`,
      expectedImpact: `Achieve 100% consent compliance. Reduce do-not-contact percentage through preference centers and granular opt-in options.`,
      evidence: [
        { factor: "doNotContactPct", value: summary.doNotContactPct, impact: summary.doNotContactPct, confidence: 0.9 },
        { factor: "doNotContactCount", value: Math.round(summary.total * summary.doNotContactPct / 100), impact: Math.round(summary.total * summary.doNotContactPct / 100), confidence: 0.85 },
        { factor: "totalContacts", value: summary.total, impact: summary.total, confidence: 0.8 },
      ],
      humanReviewRequired: true,
    });
  }

  private checkLowActivePercentage(
    summary: CustomerSummary,
    intelligence: CustomerIntelligence,
    context: DecisionContext,
  ): CustomerRiskDetectedPayload | null {
    if (summary.activePct >= CUSTOMER_THRESHOLDS.LOW_ACTIVE_PCT) {
      return null;
    }
    if (summary.total < 10) return null;

    return this.buildDecision({
      context,
      decisionType: "LowActivePercentage",
      title: `Low active contact percentage: only ${summary.activePct}% active`,
      explanation: `Only ${summary.active} of ${summary.total} contacts are active (${summary.activePct}%, below ${CUSTOMER_THRESHOLDS.LOW_ACTIVE_PCT}% threshold). ${summary.new} new contacts need nurturing. ${summary.inactive} inactive contacts need re-engagement.`,
      severity: "HIGH",
      confidence: CUSTOMER_THRESHOLDS.CONFIDENCE_MEDIUM,
      affectedSegment: "All non-active contacts",
      recommendedAction: `Launch nurture campaigns for ${summary.new} new contacts. Activate re-engagement sequences for ${summary.inactive} inactive contacts. Review lead qualification criteria to improve activation rate.`,
      expectedImpact: `Increase active percentage to 40%+ within 90 days through systematic nurture and re-engagement programs.`,
      evidence: [
        { factor: "activePct", value: summary.activePct, impact: -summary.activePct, confidence: 0.85 },
        { factor: "activeCount", value: summary.active, impact: -summary.active, confidence: 0.8 },
        { factor: "newCount", value: summary.new, impact: summary.new, confidence: 0.75 },
        { factor: "inactiveCount", value: summary.inactive, impact: summary.inactive, confidence: 0.75 },
      ],
      humanReviewRequired: false,
    });
  }

  private noContactsDecision(
    intelligence: CustomerIntelligence,
    context: DecisionContext,
  ): CustomerRiskDetectedPayload {
    return this.buildDecision({
      context,
      decisionType: "NoContacts",
      title: "No contacts available",
      explanation: "No contact records were found for this workspace. The customer intelligence cycle completed but found zero contacts to analyse.",
      severity: "LOW",
      confidence: CUSTOMER_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: "Entire workspace",
      recommendedAction: "Verify contact data ingestion. Ensure contacts are being created with the correct workspace_id. Check lead capture integrations.",
      expectedImpact: "Once contact data flows in, the intelligence cycle will produce real risk assessments.",
      evidence: [
        { factor: "totalContacts", value: 0, impact: 0, confidence: 1.0 },
      ],
      humanReviewRequired: false,
    });
  }

  private healthyDecision(
    summary: CustomerSummary,
    context: DecisionContext,
  ): CustomerRiskDetectedPayload {
    return this.buildDecision({
      context,
      decisionType: "HealthyCustomerBase",
      title: "Customer base is healthy",
      explanation: `Customer base health is good. ${summary.active} active, ${summary.customer} customers, ${summary.new} new, ${summary.inactive} inactive. Engagement: ${summary.avgEngagementScore}. Active: ${summary.activePct}%. No risk thresholds breached.`,
      severity: "LOW",
      confidence: CUSTOMER_THRESHOLDS.CONFIDENCE_HIGH,
      affectedSegment: "All contacts",
      recommendedAction: "Continue current engagement and nurture strategy. Monitor engagement buckets weekly. Track lead source diversity monthly.",
      expectedImpact: "Maintain active percentage above 20%, engagement above 40, and inactive below 30%.",
      evidence: [
        { factor: "activePct", value: summary.activePct, impact: 0, confidence: 0.9 },
        { factor: "avgEngagementScore", value: summary.avgEngagementScore, impact: 0, confidence: 0.9 },
        { factor: "inactivePct", value: summary.inactivePct, impact: 0, confidence: 0.9 },
        { factor: "totalContacts", value: summary.total, impact: 0, confidence: 1.0 },
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
  }): CustomerRiskDetectedPayload {
    return {
      decisionId: `dec-cust-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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
    payload: CustomerRiskDetectedPayload,
  ): DecisionResult<CustomerRiskDetectedPayload> {
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