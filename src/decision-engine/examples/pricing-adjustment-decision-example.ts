/**
 * Example demonstrating the Pricing Adjustment Decision flow:
 * Domain Event (e.g., PRICING.CompetitorPriceChanged)
 * -> Intelligence Event (e.g., INTELLIGENCE.PricingOpportunityDetected)
 * -> Decision Object (DECISION.PriceAdjustmentRecommended)
 */

import { Event } from '../../lib/event-fabric/event';
import { DecisionEvent } from '../shared/decision';
import { BaseDecisionEvent } from '../shared/base-decision';
import { DecisionEvaluator } from '../shared/decision-evaluator';
import { DecisionContext } from '../shared/decision-context';
import { DecisionResult } from '../shared/decision-result';
import { DecisionStatus } from '../shared/decision-status';
import { DecisionPriority } from '../shared/decision-priority';
import { EvidenceItem } from '../../business-intelligence/shared/evidence-item';
import { ModelMetadata } from '../../business-intelligence/shared/model-metadata';

/**
 * Shape of a hypothetical competitor price change domain event.
 */
interface CompetitorPriceChangedEvent extends Event {
  payload: {
    sku: string;
    competitorId: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    timestampDetected: string;
    productCategory: string;
    marketRegion: string;
  };
}

/**
 * Shape of a hypothetical pricing opportunity intelligence event.
 */
interface PricingOpportunityDetectedEvent extends Event {
  payload: {
    sku: string;
    recommendedAction: 'increase' | 'decrease' | 'hold';
    recommendedPriceChangePercent: number;
    confidence: number;
    expectedVolumeImpact: number; // % change in volume
    expectedRevenueImpact: number; // $ change in revenue
    contributingFactors: [
      {
        factorType: string; // e.g., 'priceElasticity', 'inventoryLevel'
        factorValue: number;
        confidence: number;
      }
    ];
    // Model metadata
    modelId: string;
    modelVersion: string;
    modelType: string;
    confidenceScore: number;
    predictionTimestamp: string;
    featureSetVersion: string;
    trainingDataReference: string;
    explanation: string;
    evidence: {
      factor: string;
      value: any;
      impact: number;
      confidence: number;
    }[];
    driftStatus: 'none' | 'warning' | 'detected';
    humanReviewRequired: boolean;
  };
}

/**
 * Payload for the Pricing Adjustment Decision event.
 */
export interface PricingAdjustmentDecisionPayload {
  decisionId: string;
  decisionType: 'PricingAdjustment';
  sourceIntelligenceEventId: string;
  workspaceId: string;
  correlationId: string;
  causationId: string;
  confidence: number;
  rationale: string;
  explanation: string;
  evidence: EvidenceItem[];
  recommendedActions: string[]; // e.g., ['Increase price by 5% for SKU ABC', 'Monitor competitor response']
  alternativesConsidered: { option: string; reasonForRejection: string }[];
  expectedBusinessValue: string; // e.g., 'Additional $2K profit per week'
  estimatedRisk: string; // e.g., 'Medium' (risk of volume loss)
  approvalPolicy: string; // e.g., 'pricing-approval-policy'
  humanReviewRequired: boolean;
  expirationTime: string; // ISO 8601
  lifecycleStatus: string;
  createdAt: string;
  evaluatedAt: string;
  metadata: Record<string, unknown>;
}

/**
 * Decision event for pricing adjustment.
 */
export class PricingAdjustmentDecisionEvent extends BaseDecisionEvent<PricingAdjustmentDecisionPayload> {
  constructor(
    metadata: import('../../lib/event-fabric/event-metadata').EventMetadata,
    payload: PricingAdjustmentDecisionPayload
  ) {
    super(metadata, payload);
  }
}

/**
 * Decision evaluator for pricing adjustment.
 */
export class PricingAdjustmentDecisionEvaluator implements DecisionEvaluator<PricingOpportunityDetectedEvent, PricingAdjustmentDecisionPayload> {
  async evaluate(
    input: PricingOpportunityDetectedEvent,
    context: DecisionContext
  ): Promise<DecisionResult<PricingAdjustmentDecisionPayload> | undefined> {
    const {
      sku,
      recommendedAction,
      recommendedPriceChangePercent,
      expectedVolumeImpact,
      expectedRevenueImpact,
      explanation
    } = input.payload;

    // Decision logic: accept recommendation if confidence high and risk low
    let finalAction: string;
    let rationale: string;
    let explanationText: string;
    let expectedBusinessValue: string;
    let estimatedRisk: string;
    let recommendedActions: string[];
    let humanReviewRequired: boolean;

    if (input.payload.confidence >= 0.7 && Math.abs(recommendedPriceChangePercent) <= 10) {
      // High confidence, small change -> auto-approve
      finalAction = `${recommendedAction === 'increase' ? 'Increase' : 'Decrease'} price by ${Math.abs(recommendedPriceChangePercent)}%`;
      rationale = `High confidence (${(input.payload.confidence * 100).toFixed(0)}%) pricing recommendation for SKU ${sku}.`;
      explanationText = `Recommended ${recommendedAction} of ${Math.abs(recommendedPriceChangePercent)}% based on competitive analysis and price elasticity modeling.`;
      expectedBusinessValue = `$${Math.round(expectedRevenueImpact)} weekly impact`;
      estimatedRisk = Math.abs(expectedVolumeImpact) > 5 ? 'Medium' : 'Low';
      recommendedActions = [
        `Update price for ${sku} to ${finalAction}`,
        'Monitor sales and competitor response for 7 days',
        'Prepare communication to sales team'
      ];
      humanReviewRequired = false;
    } else {
      // Lower confidence or large change -> recommend human review
      finalAction = `Review pricing change for ${sku}`;
      rationale = `Recommendation requires review due to confidence ${(input.payload.confidence * 100).toFixed(0)}% or change magnitude >10%.`;
      explanationText = `While model suggests ${recommendedAction} of ${Math.abs(recommendedPriceChangePercent)}%, further validation advised.`;
      expectedBusinessValue = `Potential ${expectedRevenueImpact > 0 ? 'gain' : 'loss'} of $${Math.abs(expectedRevenueImpact)} weekly`;
      estimatedRisk = 'High';
      recommendedActions = [
        `Schedule pricing review meeting for ${sku}`,
        'Gather additional market data and sales team input',
        'Consider A/B test in limited market'
      ];
      humanReviewRequired = true;
    }

    const decisionEvidence: EvidenceItem[] = [
      {
        factor: 'recommendedPriceChangePercent',
        value: recommendedPriceChangePercent,
        impact: recommendedPriceChangePercent,
        confidence: input.payload.confidence
      },
      {
        factor: 'expectedVolumeImpact',
        value: expectedVolumeImpact,
        impact: -expectedVolumeImpact, // Negative impact on volume is bad for decrease? Actually, we want to minimize negative impact
        confidence: 0.8
      }
    ];

    const alternativesConsidered = [
      { option: 'Ignore competitor price change', reasonForRejection: 'Risk of losing price-sensitive customers' },
      { option: 'Match competitor price exactly', reasonForRejection: 'May start price war or leave money on the table' }
    ];

    const result: DecisionResult<PricingAdjustmentDecisionPayload> = {
      decisionType: 'PricingAdjustment',
      confidence: 0.82,
      rationale,
      explanation: explanationText,
      evidence: decisionEvidence,
      payload: {
        decisionId: `dec-price-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        decisionType: 'PricingAdjustment',
        sourceIntelligenceEventId: input.metadata.eventId,
        workspaceId: context.workspaceId,
        correlationId: context.correlationId,
        causationId: input.metadata.eventId,
        confidence: 0.82,
        rationale,
        explanation: explanationText,
        evidence: decisionEvidence,
        recommendedActions,
        alternativesConsidered,
        expectedBusinessValue,
        estimatedRisk,
        approvalPolicy: 'pricing-adjustment-policy-v1',
        humanReviewRequired,
        expirationTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
        lifecycleStatus: 'Draft',
        createdAt: new Date().toISOString(),
        evaluatedAt: new Date().toISOString(),
        metadata: {
          pricingEngine: 'PriceOptimizer-v2',
          sku: sku
        }
      },
      // Top-level fields in DecisionResult (duplicated from payload for convenience)
      alternativesConsidered,
      expectedBusinessValue,
      estimatedRisk,
      recommendedNextEvaluation: '1d',
      humanReviewRequired,
      generatedAt: new Date().toISOString()
    };

    return result;
  }
}

// Example usage commented out
// async function example() { /* ... */ }
// example().catch(console.error);