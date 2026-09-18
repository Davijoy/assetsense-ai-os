import { EvidenceItem } from '../../business-intelligence/shared/evidence-item';
import { ModelMetadata } from '../../business-intelligence/shared/model-metadata';

/**
 * Result of a decision evaluation, containing the outcome and metadata.
 * This is used to construct the payload of a DecisionEvent.
 */
export interface DecisionResult<TPayload> {
  /** Type of decision (e.g., 'LeadQualification', 'InventoryAllocation'). */
  decisionType: string;
  /** Confidence in the decision (0.0 to 1.0). */
  confidence: number;
  /** Human-readable summary of the reasoning behind the decision. */
  rationale: string;
  /** Detailed explanation of the decision, possibly including trade-offs considered. */
  explanation: string;
  /** Evidence supporting the decision. */
  evidence: EvidenceItem[];
  /** The actual payload data to be included in the decision event. */
  payload: TPayload;
  /** Alternative courses of action that were considered and rejected. */
  alternativesConsidered: {
    option: string;
    reasonForRejection: string;
  }[];
  /** Estimated business value of implementing this decision (could be monetary, strategic, etc.). */
  expectedBusinessValue: string; // Could be a number or structured object, but kept as string for flexibility
  /** Estimated risk associated with this decision. */
  estimatedRisk: string; // Similarly, could be more structured
  /** Whether human review is required before this decision can be executed. */
  humanReviewRequired: boolean;
  /** Timestamp when this decision result was generated. */
  generatedAt: string; // ISO 8601 datetime string
  /** Recommended time for re-evaluation of this decision (e.g., '24h', '1d'). */
  recommendedNextEvaluation: string;
  /** Metadata about any models that contributed to the intelligence leading to this decision. */
  contributingModelMetadata?: ModelMetadata[];
}