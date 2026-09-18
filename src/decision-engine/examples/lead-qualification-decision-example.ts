/**
 * Example demonstrating the Lead Qualification Decision flow:
 * Domain Event (CRM.LeadCreated)
 * -> Intelligence Event (INTELLIGENCE.LeadScoreUpdated)
 * -> Decision Object (DECISION.LeadQualificationDetermined)
 */

import { CrmLeadCreatedEvent } from '../../lib/event-fabric/examples/crm-lead-created.event';
import { IntelligenceLeadScoreUpdatedEvent } from '../../lib/event-fabric/examples/intelligence-lead-score-updated.event';
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
 * Payload for the Lead Qualification Decision event.
 */
export interface LeadQualificationDecisionPayload {
  decisionId: string;
  decisionType: 'LeadQualification';
  sourceIntelligenceEventId: string;
  workspaceId: string;
  correlationId: string;
  causationId: string;
  confidence: number;
  rationale: string;
  explanation: string;
  evidence: EvidenceItem[];
  recommendedActions: string[];
  alternativesConsidered: { option: string; reasonForRejection: string }[];
  expectedBusinessValue: string;
  estimatedRisk: string;
  approvalPolicy: string;
  humanReviewRequired: boolean;
  expirationTime: string;
  lifecycleStatus: string;
  createdAt: string;
  evaluatedAt: string;
  metadata: Record<string, unknown>;
}

/**
 * Decision event for lead qualification.
 */
export class LeadQualificationDecisionEvent extends BaseDecisionEvent<LeadQualificationDecisionPayload> {
  constructor(
    metadata: import('../../lib/event-fabric/event-metadata').EventMetadata,
    payload: LeadQualificationDecisionPayload
  ) {
    super(metadata, payload);
  }
}

/**
 * Decision evaluator that takes an IntelligenceLeadScoreUpdatedEvent
 * and produces a LeadQualificationDecisionEvent.
 */
export class LeadQualificationDecisionEvaluator implements DecisionEvaluator<IntelligenceLeadScoreUpdatedEvent, LeadQualificationDecisionPayload> {
  async evaluate(
    input: IntelligenceLeadScoreUpdatedEvent,
    context: DecisionContext
  ): Promise<DecisionResult<LeadQualificationDecisionPayload> | undefined> {
    // Extract intelligence payload
    const { leadId, newScore: leadScore, modelId, modelVersion, explanation, evidence } = input.payload;

    // Simple decision logic: if lead score is high, qualify for immediate follow-up
    // Medium score: nurture, low score: disqualify or long-term nurture
    let recommendedActions: string[];
    let rationale: string;
    let explanationText: string;
    let expectedBusinessValue: string;
    let estimatedRisk: string;
    let humanReviewRequired: boolean;

    if (leadScore >= 80) {
      recommendedActions = ['Assign to senior sales representative for immediate follow-up'];
      rationale = 'High lead score indicates strong likelihood of conversion.';
      explanationText = `Lead scored ${leadScore}/100, indicating high intent and fit.`;
      expectedBusinessValue = 'High potential revenue from quick conversion';
      estimatedRisk = 'Low';
      humanReviewRequired = false;
    } else if (leadScore >= 50) {
      recommendedActions = ['Enroll in automated nurture campaign', 'Assign to junior sales rep for follow-up in 3 days'];
      rationale = 'Medium lead score warrants nurturing before sales engagement.';
      explanationText = `Lead scored ${leadScore}/100, showing moderate interest.`;
      expectedBusinessValue = 'Medium potential revenue from nurtured lead';
      estimatedRisk = 'Medium';
      humanReviewRequired = false;
    } else {
      recommendedActions = ['Add to long-term drip campaign', 'Review for disqualification'];
      rationale = 'Low lead score suggests low immediate intent; consider long-term engagement.';
      explanationText = `Lead scored ${leadScore}/100, indicating low immediate interest.`;
      expectedBusinessValue = 'Low potential revenue, but keeps brand awareness';
      estimatedRisk = 'Low';
      humanReviewRequired = leadScore < 30 ? true : false; // Very low scores might need human review
    }

    // Build evidence for the decision (could reuse or summarize intelligence evidence)
    const decisionEvidence: EvidenceItem[] = [
      {
        factor: 'leadScore',
        value: leadScore,
        impact: leadScore - 50, // Impact relative to midpoint
        confidence: 0.9
      },
      ...evidence.map(e => ({
        ...e,
        impact: e.impact * 0.5 // Scale down for decision evidence
      }))
    ];

    // Alternatives considered
    const alternativesConsidered = [
      { option: 'Immediate sales contact regardless of score', reasonForRejection: 'Could waste sales time on low-intent leads' },
      { option: 'Ignore lead completely', reasonForRejection: 'Misses potential opportunities' }
    ];

    // Create decision result
    const result: DecisionResult<LeadQualificationDecisionPayload> = {
      decisionType: 'LeadQualification',
      confidence: 0.85, // Confidence in this decision logic
      rationale,
      explanation: explanationText,
      evidence: decisionEvidence,
      payload: {
        decisionId: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        decisionType: 'LeadQualification',
        sourceIntelligenceEventId: input.metadata.eventId,
        workspaceId: context.workspaceId,
        correlationId: context.correlationId,
        causationId: input.metadata.eventId, // This decision is caused by the intelligence event
        confidence: 0.85,
        rationale,
        explanation: explanationText,
        evidence: decisionEvidence,
        recommendedActions,
        alternativesConsidered,
        expectedBusinessValue,
        estimatedRisk,
        approvalPolicy: 'lead-qualification-policy-v1',
        humanReviewRequired,
        expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        lifecycleStatus: 'Draft', // Will use DecisionStatus.Draft in real code
        createdAt: new Date().toISOString(),
        evaluatedAt: new Date().toISOString(),
        metadata: {
          decisionModel: 'rule-based-lead-qualification-v1',
          factorsConsidered: ['leadScore']
        }
      },
      // Top-level fields in DecisionResult (duplicated from payload for convenience)
      alternativesConsidered,
      expectedBusinessValue,
      estimatedRisk,
      recommendedNextEvaluation: '24h', // Re-evaluate in a day if circumstances change
      humanReviewRequired,
      generatedAt: new Date().toISOString()
    };

    return result;
  }
}

// Example usage (commented out to prevent execution during compilation)
// async function example() {
//   // This would normally come from an event bus subscription
//   const leadCreatedEvent = new CrmLeadCreatedEvent(
//
//     {
//
//       eventId: 'evt-123',
//       eventType: 'CRM.LeadCreated',
//       eventVersion: '1.0',
//       timestamp: new Date().toISOString(),
//       workspaceId: 'workspace-123',
//       classification: 'DOMAIN' as const,
//       priority: 'MEDIUM' as const,
//       correlationId: 'corr-456',
//       causationId: 'cause-789',
//       source: { serviceName: 'crm-service', version: '1.0.0' }
//     },
//     {
//
//       leadId: 'lead-999',
//       source: 'website',
//       initialScore: 0,
//       assignedTo: null,
//       createdBy: 'web-form',
//       contactInfo: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '555-1234' },
//       companyInfo: { name: 'Acme Corp', industry: 'Technology', employeeCount: 150 }
//     }
//   );
//
//   // In a real system, this would be processed by an intelligence processor to get the intelligence event
//   // For this example, we'll simulate the intelligence event:
//   const intelligenceEvent = new IntelligenceLeadScoreUpdatedEvent(
//
//     {
//
//       eventId: 'evt-int-456',
//       eventType: 'INTELLIGENCE.LeadScoreUpdated',
//       eventVersion: '1.0',
//       timestamp: new Date().toISOString(),
//       workspaceId: 'workspace-123',
//       classification: 'INTELLIGENCE' as const,
//       priority: 'MEDIUM' as const,
//       correlationId: 'corr-456',
//       causationId: 'evt-123',
//       source: { serviceName: 'lead-scoring-service', version: '1.0.0' }
//     },
//     {
//
//       leadId: 'lead-999',
//       oldScore: 0,
//       newScore: 75,
//       scoreChange: 75,
//       contributingFactors: [
//         { factorType: 'demographic', factorValue: 10, confidence: 0.8 },
//         { factorType: 'engagement', factorValue: 5, confidence: 0.6 }
//       ],
//       modelId: 'lead-score-model-001',
//       modelVersion: 'lead-score-v1.2',
//       modelType: 'gradient_boosting',
//       confidenceScore: 0.78,
//       predictionTimestamp: new Date().toISOString(),
//       featureSetVersion: 'feature-set-v2.1',
//       trainingDataReference: 'training-data-2024-Q3',
//       explanation: 'Lead score increased due to website visits and company size.',
//       evidence: [
//         { factor: 'website_visits', value: 10, impact: 8, confidence: 0.9 },
//         { factor: 'company_size', value: 150, impact: 5, confidence: 0.7 }
//       ],
//       driftStatus: 'none' as const,
//       humanReviewRequired: false,
//       recommendedAction: 'Assign to sales representative for follow-up'
//     }
//   );
//
//   const context: DecisionContext = {
//     workspaceId: 'workspace-123',
//     correlationId: 'corr-456',
//     causationId: 'evt-123',
//     intelligenceEvents: [intelligenceEvent],
//     subjectType: 'Lead',
//     subjectId: 'lead-999',
//     evaluatedAt: new Date().toISOString(),
//     evidenceReferences: ['lead-score-model-001'],
//     dataClassification: 'internal',
//     jurisdiction: 'GDPR'
//   };
//
//   const evaluator = new LeadQualificationDecisionEvaluator();
//   const decisionResult = await evaluator.evaluate(intelligenceEvent, context);
//
//   if (decisionResult) {
//     const decisionEvent = new LeadQualificationDecisionEvent(
//
//       {
//
//         eventId: `evt-dec-${Date.now()}`,
//         eventType: 'DECISION.LeadQualificationDetermined',
//         eventVersion: '1.0',
//         timestamp: new Date().toISOString(),
//         workspaceId: decisionResult.payload.workspaceId,
//         classification: 'DECISION' as const,
//         priority: DecisionPriority.Medium,
//         correlationId: decisionResult.payload.correlationId,
//         causationId: decisionResult.payload.causationId,
//         source: { serviceName: 'decision-engine-service', version: '1.0.0' }
//       },
//       decisionResult.payload
//     );
//
//     // This decisionEvent would then be published to the Event Fabric for consumers (e.g., Communication Hub)
//     console.log('Generated decision event:', decisionEvent);
//   }
// }
//
// example().catch(console.error);