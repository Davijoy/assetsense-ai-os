import { EvidenceItem } from './evidence-item';

/**
 * Result of an intelligence evaluation, containing the outcome and metadata.
 * This is typically used to construct the payload of an IntelligenceEvent.
 */
export interface IntelligenceResult<TPayload> {
  /** Type of intelligence (e.g., 'LeadScoreUpdated', 'DealValuePredicted'). */
  intelligenceType: string;
  /** Confidence in the result (0.0 to 1.0). */
  confidenceScore: number;
  /** Human-readable summary of the reasoning behind the result. */
  reasoningSummary: string;
  /** Evidence supporting the result. */
  evidence: EvidenceItem[];
  /** The actual payload data to be included in the intelligence event. */
  payload: TPayload;
  /** Recommended time for next evaluation (ISO 8601 duration or timestamp). */
  recommendedNextEvaluation: string;
  /** Whether human review is required before acting on this intelligence. */
  humanReviewRequired: boolean;
  /** Timestamp when this result was generated. */
  generatedAt: string; // ISO 8601 datetime string
}