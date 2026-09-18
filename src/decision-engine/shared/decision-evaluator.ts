import { Event } from '../../lib/event-fabric/event';
import { DecisionResult } from './decision-result';
import { DecisionContext } from './decision-context';

/**
 * Interface for evaluating an intelligence event and producing a decision result.
 * This is where the core decision logic (rules, policies, etc.) resides.
 */
export interface DecisionEvaluator<TInput extends Event, TPayload extends object> {
  /**
   * Evaluates the input event and returns a decision result.
   * @param input The intelligence event to evaluate.
   * @param context Additional context for the evaluation.
   * @returns A decision result, or undefined if no decision should be made.
   */
  evaluate(input: TInput, context: DecisionContext): Promise<DecisionResult<TPayload> | undefined>;
}