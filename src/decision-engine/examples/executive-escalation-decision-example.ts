/**
 * Example demonstrating the Executive Escalation Decision flow:
 * Domain Event (e.g., EXECUTIVE.KPIAlertTriggered)
 * -> Intelligence Event (e.g., INTELLIGENCE.StrategicInterventionNeeded)
 * -> Decision Object (DECISION.ExecutiveEscalationApproved)
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
 * Shape of a hypothetical KPI alert domain event.
 */
interface KPIAlertTriggeredEvent extends Event {
  payload: {
    alertId: string;
    kpiName: string; // e.g., 'CustomerChurnRate', 'SalesPipelineVelocity'
    currentValue: number;
    thresholdValue: number;
    severity: 'critical' | 'warning' | 'info';
    trend: 'increasing' | 'decreasing' | 'stable';
    timeWindow: string; // e.g., 'last_24_hours', 'last_7_days'
    metadata: Record<string, unknown>;
  };
}

/**
 * Shape of a hypothetical strategic intervention intelligence event.
 */
interface StrategicInterventionNeededEvent extends Event {
  payload: {
    alertId: string;
    recommendedAction: 'escalate_to_executive' | 'initiate_war_room' | 'commission_analysis';
    urgency: 'immediate' | 'soon' | 'scheduled';
    impactAssessment: {
      potentialFinancialImpact: number; // e.g., 250000
      affectedStakeholders: string[]; // e.g., ['sales', 'customer_service']
    };
    contributingFactors: [
      {
        factorType: string; // e.g., 'seasonalTrend', 'competitorAction'
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
 * Payload for the Executive Escalation Decision event.
 */
export interface ExecutiveEscalationDecisionPayload {
  decisionId: string;
  decisionType: 'ExecutiveEscalation';
  sourceIntelligenceEventId: string;
  workspaceId: string;
  correlationId: string;
  causationId: string;
  confidence: number;
  rationale: string;
  explanation: string;
  evidence: EvidenceItem[];
  recommendedActions: string[]; // e.g., ['Schedule emergency executive meeting', 'Notify CEO and CFO']
  alternativesConsidered: { option: string; reasonForRejection: string }[];
  expectedBusinessValue: string; // e.g., 'Prevents potential $2M loss'
  estimatedRisk: string; // e.g., 'High' (risk of inaction)
  approvalPolicy: string; // e.g., 'executive-escalation-policy'
  humanReviewRequired: boolean;
  expirationTime: string; // ISO 8601 (often immediate)
  lifecycleStatus: string;
  createdAt: string;
  evaluatedAt: string;
  metadata: Record<string, unknown>;
}

/**
 * Decision event for executive escalation.
 */
export class ExecutiveEscalationDecisionEvent extends BaseDecisionEvent<ExecutiveEscalationDecisionPayload> {
  constructor(
    metadata: import('../../lib/event-fabric/event-metadata').EventMetadata,
    payload: ExecutiveEscalationDecisionPayload
  ) {
    super(metadata, payload);
  }
}

/**
 * Decision evaluator for executive escalation.
 */
export class ExecutiveEscalationDecisionEvaluator implements DecisionEvaluator<StrategicInterventionNeededEvent, ExecutiveEscalationDecisionPayload> {
  async evaluate(
    input: StrategicInterventionNeededEvent,
    context: DecisionContext
  ): Promise<DecisionResult<ExecutiveEscalationDecisionPayload> | undefined> {
    const {
      recommendedAction,
      urgency,
      impactAssessment,
      explanation
    } = input.payload;

    // Decision logic: based on urgency and impact
    let recommendedActions: string[];
    let rationale: string;
    let explanationText: string;
    let expectedBusinessValue: string;
    let estimatedRisk: string;
    let humanReviewRequired: boolean;

    const financialImpact = impactAssessment.potentialFinancialImpact ?? 0;

    if (urgency === 'immediate' || financialImpact > 1000000) {
      // Immediate action required
      recommendedActions = [
        'Schedule emergency executive meeting within 1 hour',
        'Notify CEO, CFO, and relevant board members',
        'Prepare briefing document with impact assessment and mitigation options'
      ];
      rationale = `Urgent situation requiring immediate executive attention: ${recommendedAction.replace('_', ' ')}.`;
      explanationText = `Potential financial impact of $${financialImpact.toLocaleString()} necessitates rapid executive decision-making.`;
      expectedBusinessValue = `Avoids potential losses of $${financialImpact.toLocaleString()} through timely intervention`;
      estimatedRisk = 'High (risk of significant loss if delayed)';
      humanReviewRequired = false; // Auto-escalate for critical issues
    } else if (urgency === 'soon') {
      recommendedActions = [
        'Add to next executive agenda (within 24 hours)',
        'Notify direct executives for awareness',
        'Prepare preliminary analysis for review'
      ];
      rationale = `Situation requires timely executive review but allows for standard processing.`;
      explanationText = `Issue identified with moderate urgency; executive review recommended within next business day.`;
      expectedBusinessValue = `Enables proactive management of potential $${financialImpact.toLocaleString()} impact`;
      estimatedRisk = 'Medium';
      humanReviewRequired = false;
    } else {
      // scheduled or low urgency
      recommendedActions = [
        'Include in quarterly business review package',
        'Assign to relevant department head for monitoring',
        'Schedule deep-dive analysis for next strategy session'
      ];
      rationale = `Issue can be addressed through standard governance channels.`;
      explanationText = `While notable, the situation does not require immediate executive intervention.`;
      expectedBusinessValue = `Ensures ongoing oversight without diverting executive attention from critical matters`;
      estimatedRisk = 'Low';
      humanReviewRequired = true; // May still want human review for lower priority
    }

    const decisionEvidence: EvidenceItem[] = [
      {
        factor: 'financialImpact',
        value: financialImpact,
        impact: Math.log10(Math.max(financialImpact, 1)), // Log scale for wide range
        confidence: 0.85
      },
      {
        factor: 'urgencyScore',
        value: urgency === 'immediate' ? 3 : urgency === 'soon' ? 2 : 1,
        impact: urgency === 'immediate' ? 3 : urgency === 'soon' ? 2 : 1,
        confidence: 0.9
      }
    ];

    const alternativesConsidered = [
      { option: 'Ignore alert and continue monitoring', reasonForRejection: 'Risk of missing critical issue' },
      { option: 'Delegate to middle management without executive awareness', reasonForRejection: 'May lack authority to act swiftly' }
    ];

    const result: DecisionResult<ExecutiveEscalationDecisionPayload> = {
      decisionType: 'ExecutiveEscalation',
      confidence: 0.92,
      rationale,
      explanation: explanationText,
      evidence: decisionEvidence,
      payload: {
        decisionId: `dec-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        decisionType: 'ExecutiveEscalation',
        sourceIntelligenceEventId: input.metadata.eventId,
        workspaceId: context.workspaceId,
        correlationId: context.correlationId,
        causationId: input.metadata.eventId,
        confidence: 0.9,
        rationale,
        explanation: explanationText,
        evidence: decisionEvidence,
        recommendedActions,
        alternativesConsidered,
        expectedBusinessValue,
        estimatedRisk,
        approvalPolicy: 'executive-escalation-policy-v1',
        humanReviewRequired,
        expirationTime: new Date(Date.now() + (urgency === 'immediate' ? 60 * 60 * 1000 : 4 * 60 * 60 * 1000)).toISOString(), // 1hr or 4hr
        lifecycleStatus: 'Draft',
        createdAt: new Date().toISOString(),
        evaluatedAt: new Date().toISOString(),
        metadata: {
          escalationFramework: 'CorporateGovernance-v3',
          originatingKPI: 'example'
        }
      },
      // Top-level fields in DecisionResult (duplicated from payload for convenience)
      alternativesConsidered,
      expectedBusinessValue,
      estimatedRisk,
      recommendedNextEvaluation: '1h',
      humanReviewRequired,
      generatedAt: new Date().toISOString()
    };

    return result;
  }
}

// Example usage commented out
// async function example() { /* ... */ }
// example().catch(console.error);