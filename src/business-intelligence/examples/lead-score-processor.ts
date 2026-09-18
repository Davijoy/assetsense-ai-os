import { CrmLeadCreatedEvent } from '../../lib/event-fabric/examples/crm-lead-created.event';
import { IntelligenceLeadScoreUpdatedEvent } from '../../lib/event-fabric/examples/intelligence-lead-score-updated.event';
import { Event } from '../../lib/event-fabric/event';
import { IntelligenceProcessor } from '../shared/intelligence-processor';
import { IntelligenceResult } from '../shared/intelligence-result';
import { EvidenceItem } from '../shared/evidence-item';
import { DriftStatus } from '../shared/drift-status';

/**
 * Example implementation of an intelligence processor for lead scoring.
 * This is a rule-based example (no ML) that demonstrates how an
 * IntelligenceProcessor would be implemented.
 */
export class LeadScoreProcessor implements IntelligenceProcessor<CrmLeadCreatedEvent, IntelligenceLeadScoreUpdatedEvent['payload']> {
  async process(input: CrmLeadCreatedEvent): Promise<IntelligenceLeadScoreUpdatedEvent | undefined> {
    // Extract input data
    const { leadId, source, initialScore, contactInfo, companyInfo } = input.payload;

    // Simple rule-based scoring (same as in the event-flow example)
    let score = 0;
    const sourceScores: Record<string, number> = {
      website: 20,
      referral: 30,
      cold_call: 10,
      social_media: 15
    };
    score += sourceScores[source] || 5;

    // Company size bonus (handle undefined companyInfo or employeeCount)
    let companySize = 0;
    if (companyInfo && companyInfo.employeeCount !== undefined) {
      const count = companyInfo.employeeCount;
      if (count > 1000) companySize = 20;
      else if (count > 100) companySize = 10;
      else if (count > 10) companySize = 5;
    }
    score += companySize;

    // Contact completeness bonus
    const hasEmail = !!contactInfo.email;
    const hasPhone = !!contactInfo.phone;
    if (hasEmail) score += 10;
    if (hasPhone) score += 5;

    score = Math.min(score, 100); // Cap at 100

    // Only produce an intelligence event if the score changed (or always for demo)
    const scoreChange = score - initialScore;

    // Build contributing factors
    const contributingFactors: {
      factorType: string;
      factorValue: number;
      confidence: number;
    }[] = [
      {
        factorType: 'demographic',
        factorValue: companySize / 2, // arbitrary scaling
        confidence: 0.8
      },
      {
        factorType: 'engagement',
        factorValue: (hasEmail ? 5 : 0) + (hasPhone ? 3 : 0),
        confidence: 0.6
      }
    ];

    // Build evidence
    const evidence: {
      factor: string;
      value: unknown;
      impact: number;
      confidence: number;
    }[] = [
      {
        factor: 'source',
        value: source,
        impact: sourceScores[source] || 5,
        confidence: 0.9
      },
      {
        factor: 'company_size',
        value: companySize,
        impact: companySize,
        confidence: 0.7
      },
      {
        factor: 'has_email',
        value: hasEmail,
        impact: hasEmail ? 10 : 0,
        confidence: 0.95
      },
      {
        factor: 'has_phone',
        value: hasPhone,
        impact: hasPhone ? 5 : 0,
        confidence: 0.95
      }
    ];

    // Create the intelligence result (optional, for demonstration)
    const result: IntelligenceResult<IntelligenceLeadScoreUpdatedEvent['payload']> = {
      intelligenceType: 'LeadScoreUpdated',
      confidenceScore: 0.9, // High confidence in rule-based outcome
      reasoningSummary: `Lead score calculated based on source (${source}), company size, and contact completeness.`,
      evidence,
      payload: {
        leadId,
        oldScore: initialScore,
        newScore: score,
        scoreChange,
        contributingFactors,
        // Model metadata (for this rule-based example, we set appropriate values)
        modelId: 'lead-score-rules-v1',
        modelVersion: '1.0.0',
        modelType: 'rule_based',
        confidenceScore: 0.9,
        predictionTimestamp: new Date().toISOString(),
        featureSetVersion: 'feature-set-v1.0',
        trainingDataReference: 'rule-based-no-training-data',
        explanation: 'Lead score calculated based on source, company size, and contact completeness.',
        evidence,
        driftStatus: 'none' as const,
        humanReviewRequired: false,
        recommendedAction: score > 50
          ? 'Assign to sales representative for follow-up'
          : 'Add to nurture campaign'
      },
      recommendedNextEvaluation: '24h',
      humanReviewRequired: false,
      generatedAt: new Date().toISOString()
    };

    // Create the intelligence event using the result's payload
    const intelligenceMetadata: import('../../lib/event-fabric/event-metadata').EventMetadata = {
      eventId: Math.random().toString(36).substring(2, 15),
      eventType: 'INTELLIGENCE.LeadScoreUpdated',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      workspaceId: input.metadata.workspaceId,
      classification: 'INTELLIGENCE' as const,
      priority: 'MEDIUM' as const,
      correlationId: input.metadata.correlationId,
      causationId: input.metadata.eventId,
      source: {
        serviceName: 'lead-scoring-service',
        version: '1.0.0'
      }
    };

    const intelligenceEvent = new IntelligenceLeadScoreUpdatedEvent(
      intelligenceMetadata,
      result.payload
    );

    return intelligenceEvent;
  }
}