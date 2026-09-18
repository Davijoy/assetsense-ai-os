import { IntelligenceResult } from './intelligence-result';

/**
 * Policy for determining when human review is required for an intelligence result.
 */
export interface HumanReviewPolicy {
  /**
   * Evaluates whether the given intelligence result requires human review.
   * @param result The intelligence result to evaluate.
   * @returns True if human review is required, false otherwise.
   */
  isRequired(result: IntelligenceResult<unknown>): boolean;
}