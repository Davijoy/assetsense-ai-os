import { Event } from '../event';
import { EventMetadata } from '../event-metadata';
import { generateCorrelationId } from '../correlation-id';
import { generateCausationId } from '../causation-id';

/**
 * Event published by the Business Intelligence layer when a lead's score has been updated
 * based on analytical models and pattern detection
 *
 * This event demonstrates how BI contracts are designed to support both:
 * 1. Deterministic rule-based intelligence
 * 2. Predictive machine-learning intelligence as first-class producers
 */
export class IntelligenceLeadScoreUpdatedEvent implements Event {
  constructor(
    public readonly metadata: EventMetadata,
    public readonly payload: {
      leadId: string;
      oldScore: number;
      newScore: number;
      scoreChange: number; // positive or negative change
      contributingFactors: {
        factorType: string; // e.g., 'engagement', 'demographic', 'firmographic'
        factorValue: number; // impact on score (-10 to +10)
        confidence: number; // 0-1 confidence in this factor
      }[];
      // Model metadata for ML-based intelligence (also applicable to rule-based with defaults)
      modelId: string; // Unique identifier for the model/ruleset
      modelVersion: string; // Version of the model/ruleset
      modelType: string; // Type of model: 'rule_based', 'logistic_regression', 'decision_tree', 'neural_network', etc.
      confidenceScore: number; // Confidence in the prediction (0-1)
      predictionTimestamp: string; // When the prediction was made (ISO 8601)
      featureSetVersion: string; // Version of the feature set used
      trainingDataReference: string; // Reference to training data snapshot or version
      explanation: string; // Human-readable explanation of the prediction
      evidence: {
        // Supporting evidence or key factors that contributed to the prediction
        factor: string;
        value: any;
        impact: number; // Positive/negative impact on score
        confidence: number; // Confidence in this evidence item
      }[];
      driftStatus: 'none' | 'warning' | 'detected'; // Model drift status
      humanReviewRequired: boolean; // Flag indicating if human review is needed
      recommendedAction?: string; // Suggested next step based on score change
    }
  ) {
    // Ensure the metadata has the correct classification for intelligence events
    const intelligenceMetadata: EventMetadata = {
      ...metadata,
      classification: 'INTELLIGENCE' as const,
      // Set correlationId if not provided (for tracking related events)
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      // Set causationId if not provided (for tracking what caused this event)
      causationId: metadata.causationId ?? generateCausationId()
    };

    // In a real implementation, we would create a new metadata object
    // For this example, we're showing the structure that would be used
    Object.assign(this.metadata, intelligenceMetadata);
  }
}