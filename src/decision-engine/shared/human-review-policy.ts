import { DecisionResult } from './decision-result';

/**
 * Policy for determining when human review is required for a decision.
 */
export interface HumanReviewPolicy {
  /**
   * Evaluates whether the given decision result requires human review
   * before it can be approved or executed.
   * @param result The decision result to evaluate.
   * @returns True if human review is required, false otherwise.
   */
  isRequired(result: DecisionResult<unknown>): boolean | Promise<boolean>;

  /**
   * Determines the level or type of human review needed (e.g., 'supervisor', 'specialist', 'committee').
   * @param result The decision result to evaluate.
   * @returns A description of the required reviewer expertise or role.
   */
  getReviewerType(result: DecisionResult<unknown>): string | Promise<string>;

  /**
   * Specifies whether the decision can proceed with a provisional approval
   * while awaiting full human review (e.g., for low-risk items).
   * @param result The decision result to evaluate.
   * @returns True if provisional allowance is permitted, false otherwise.
   */
  allowsProvisionalProceeding(result: DecisionResult<unknown>): boolean | Promise<boolean>;

  /**
   * Determines the time limit within which human review must be completed
   * before the decision is automatically escalated or expires.
   * @param result The decision result to evaluate.
   * @returns An ISO 8601 duration (e.g., 'PT4H', 'P1D') or undefined for no limit.
   */
  getReviewTimeout(result: DecisionResult<unknown>): string | undefined | Promise<string | undefined>;
}