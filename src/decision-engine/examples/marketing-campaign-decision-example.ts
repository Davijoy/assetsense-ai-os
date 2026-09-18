/**
 * Example demonstrating the Marketing Campaign Decision flow:
 * Domain Event (e.g., MARKETING.CampaignPerformanceReported)
 * -> Intelligence Event (e.g., INTELLIGENCE.CampaignOptimizationSuggested)
 * -> Decision Object (DECISION.MarketingBudgetReallocated)
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
 * Shape of a hypothetical campaign performance domain event.
 */
interface CampaignPerformanceReportedEvent extends Event {
  payload: {
    campaignId: string;
    campaignName: string;
    channel: string; // e.g., 'facebook', 'google_search', 'email'
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    costPerAcquisition: number;
    returnOnAdSpend: number;
    dateRange: { start: string; end: string };
  };
}

/**
 * Shape of a hypothetical campaign optimization intelligence event.
 */
interface CampaignOptimizationSuggestedEvent extends Event {
  payload: {
    campaignId: string;
    recommendedAction: 'increase_budget' | 'decrease_budget' | 'pause' | 'reallocate_creative';
    budgetChangePercent: number; // e.g., +20 for increase, -15 for decrease
    confidence: number;
    predictedPerformanceImprovement: {
      metric: string; // e.g., 'ROAS', 'CPA'
      improvementPercent: number;
    };
    contributingFactors: [
      {
        factorType: string; // e.g., 'clickThroughRate', 'conversionRate'
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
 * Payload for the Marketing Budget Reallocation Decision event.
 */
export interface MarketingBudgetReallocationDecisionPayload {
  decisionId: string;
  decisionType: 'MarketingBudgetReallocation';
  sourceIntelligenceEventId: string;
  workspaceId: string;
  correlationId: string;
  causationId: string;
  confidence: number;
  rationale: string;
  explanation: string;
  evidence: EvidenceItem[];
  recommendedActions: string[]; // e.g., ['Increase Google Search budget by 20%', 'Pause Facebook Campaign X']
  alternativesConsidered: { option: string; reasonForRejection: string }[];
  expectedBusinessValue: string; // e.g., 'Improved ROAS from 3.2 to 4.0'
  estimatedRisk: string; // e.g., 'Low'
  approvalPolicy: string; // e.g., 'marketing-budget-policy'
  humanReviewRequired: boolean;
  expirationTime: string; // ISO 8601
  lifecycleStatus: string;
  createdAt: string;
  evaluatedAt: string;
  metadata: Record<string, unknown>;
}

/**
 * Decision event for marketing budget reallocation.
 */
export class MarketingBudgetReallocationDecisionEvent extends BaseDecisionEvent<MarketingBudgetReallocationDecisionPayload> {
  constructor(
    metadata: import('../../lib/event-fabric/event-metadata').EventMetadata,
    payload: MarketingBudgetReallocationDecisionPayload
  ) {
    super(metadata, payload);
  }
}

/**
 * Decision evaluator for marketing budget reallocation.
 */
export class MarketingBudgetReallocationDecisionEvaluator implements DecisionEvaluator<CampaignOptimizationSuggestedEvent, MarketingBudgetReallocationDecisionPayload> {
  async evaluate(
    input: CampaignOptimizationSuggestedEvent,
    context: DecisionContext
  ): Promise<DecisionResult<MarketingBudgetReallocationDecisionPayload> | undefined> {
    const {
      campaignId,
      recommendedAction,
      budgetChangePercent,
      predictedPerformanceImprovement,
      explanation
    } = input.payload;

    // Decision logic: based on confidence and magnitude of change
    let recommendedActions: string[];
    let rationale: string;
    let explanationText: string;
    let expectedBusinessValue: string;
    let estimatedRisk: string;
    let humanReviewRequired: boolean;

    const absChange = Math.abs(budgetChangePercent);

    if (input.payload.confidence >= 0.75 && absChange <= 30) {
      // High confidence, reasonable change -> auto-approve
      const actionText =
        recommendedAction === 'increase_budget' ? `Increase budget by ${budgetChangePercent}%` :
        recommendedAction === 'decrease_budget' ? `Decrease budget by ${Math.abs(budgetChangePercent)}%` :
        recommendedAction === 'pause' ? `Pause campaign` :
        `Reallocate creative assets`;

      recommendedActions = [
        actionText,
        'Update campaign settings in ad platform',
        'Monitor performance daily for 3 days'
      ];
      rationale = `High confidence recommendation to ${recommendedAction.replace('_', ' ')} campaign ${campaignId}.`;
      explanationText = `Based on performance analysis, adjusting budget by ${budgetChangePercent}% is expected to improve ${predictedPerformanceImprovement.metric} by ${predictedPerformanceImprovement.improvementPercent}%.`;
      expectedBusinessValue = `Projected improvement in ${predictedPerformanceImprovement.metric}: ${predictedPerformanceImprovement.improvementPercent}%`;
      estimatedRisk = absChange > 20 ? 'Medium' : 'Low';
      humanReviewRequired = false;
    } else {
      // Lower confidence or large change -> needs review
      recommendedActions = [
        `Schedule marketing strategy meeting to discuss ${campaignId}`,
        'Run A/B test on proposed changes for 48 hours',
        'Consult with channel specialist before implementation'
      ];
      rationale = `Recommendation requires human review due to confidence ${(input.payload.confidence * 100).toFixed(0)}% or change magnitude >30%.`;
      explanationText = `While data suggests ${recommendedAction.replace('_', ' ')} of ${Math.abs(budgetChangePercent)}%, further validation advised.`;
      expectedBusinessValue = `Potential to improve ${predictedPerformanceImprovement.metric} by ${predictedPerformanceImprovement.improvementPercent}%`;
      estimatedRisk = 'Medium';
      humanReviewRequired = true;
    }

    const decisionEvidence: EvidenceItem[] = [
      {
        factor: 'budgetChangePercent',
        value: budgetChangePercent,
        impact: budgetChangePercent,
        confidence: input.payload.confidence
      },
      {
        factor: 'predictedImprovement',
        value: predictedPerformanceImprovement.improvementPercent,
        impact: predictedPerformanceImprovement.improvementPercent,
        confidence: 0.8
      }
    ];

    const alternativesConsidered = [
      { option: 'Make no changes and continue current spending', reasonForRejection: 'Misses opportunity to optimize ROI' },
      { option: 'Double the recommended change', reasonForRejection: 'Risk of overcorrection and volatile performance' }
    ];

    const result: DecisionResult<MarketingBudgetReallocationDecisionPayload> = {
      decisionType: 'MarketingBudgetReallocation',
      confidence: 0.8,
      rationale,
      explanation: explanationText,
      evidence: decisionEvidence,
      payload: {
        decisionId: `dec-mkt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        decisionType: 'MarketingBudgetReallocation',
        sourceIntelligenceEventId: input.metadata.eventId,
        workspaceId: context.workspaceId,
        correlationId: context.correlationId,
        causationId: input.metadata.eventId,
        confidence: 0.8,
        rationale,
        explanation: explanationText,
        evidence: decisionEvidence,
        recommendedActions,
        alternativesConsidered,
        expectedBusinessValue,
        estimatedRisk,
        approvalPolicy: 'marketing-budget-policy-v1',
        humanReviewRequired,
        expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        lifecycleStatus: 'Draft',
        createdAt: new Date().toISOString(),
        evaluatedAt: new Date().toISOString(),
        metadata: {
          marketingPlatform: 'Google Ads, Meta, etc.',
          campaignId: campaignId
        }
      },
      // Top-level fields in DecisionResult (duplicated from payload for convenience)
      alternativesConsidered,
      expectedBusinessValue,
      estimatedRisk,
      recommendedNextEvaluation: '12h',
      humanReviewRequired,
      generatedAt: new Date().toISOString()
    };

    return result;
  }
}

// Example usage commented out
// async function example() { /* ... */ }
// example().catch(console.error);