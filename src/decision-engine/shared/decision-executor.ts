import { Event } from '../../lib/event-fabric/event';
import { DecisionEvent } from './decision';

/**
 * Interface for executing an approved decision.
 * Note: Actual execution logic (e.g., sending notifications, triggering actions)
 * is outside the scope of this foundation and should be implemented by the
 * execution layer (e.g., Communication Hub or other actors).
 */
export interface DecisionExecutor {
  /**
   * Executes the given decision event.
   * @param decision The decision event to execute.
   * @returns A promise that resolves when execution is initiated,
   *          or rejects if execution cannot be started.
   * Note: This does not wait for the outcome of the action, only that
   * the execution process has begun.
   */
  execute(decision: DecisionEvent<unknown>): Promise<void>;

  /**
   * Cancels an executing or scheduled decision.
   * @param decisionId The ID of the decision to cancel.
   * @returns A promise that resolves when cancellation is requested.
   */
  cancel(decisionId: string): Promise<void>;
}