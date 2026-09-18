import { DecisionResult } from './decision-result';

/**
 * Interface defining a policy that governs how decisions should be made, approved, or executed.
 */
export interface DecisionPolicy {
  /**
   * Determines whether the given decision result requires automatic approval
   * or can be auto-approved based on predefined criteria.
   * @param result The decision result to evaluate.
   * @returns True if the decision can be auto-approved, false otherwise.
   */
  isAutoEligible(result: DecisionResult<unknown>): boolean | Promise<boolean>;

  /**
   * Determines the required approval level or approvers for the given decision result.
   * @param result The decision result to evaluate.
   * @returns A description of the approval requirements (e.g., 'manager', 'committee', 'none').
   */
  getApprovalRequirements(result: DecisionResult<unknown>): string | Promise<string>;

  /**
   * Specifies whether the decision, if approved, should be scheduled for later execution
   * or executed immediately.
   * @param result The decision result to evaluate.
   * @returns True if the decision should be scheduled, false for immediate execution.
   */
  shouldSchedule(result: DecisionResult<unknown>): boolean | Promise<boolean>;

  /**
   * If scheduling is indicated, determines the delay or specific time for execution.
   * @param result The decision result to evaluate.
   * @returns A delay duration (e.g., '1h', '2024-01-01T10:00:00Z') or undefined for immediate.
   */
  getScheduleDelay(result: DecisionResult<unknown>): string | undefined | Promise<string | undefined>;

  /**
   * Determines the priority of the decision for processing and execution queues.
   * @param result The decision result to evaluate.
   * @returns The priority level for this decision.
   */
  getPriority(result: DecisionResult<unknown>): import('./decision-priority').DecisionPriority | Promise<import('./decision-priority').DecisionPriority>;

  /**
   * Specifies the maximum time after which the decision expires if not executed.
   * @param result The decision result to evaluate.
   * @returns An ISO 8601 duration string (e.g., 'PT1H', 'P1D') or timestamp, or undefined for no expiration.
   */
  getExpirationDuration(result: DecisionResult<unknown>): string | undefined | Promise<string | undefined>;
}