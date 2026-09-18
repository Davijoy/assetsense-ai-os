/**
 * Interface for a rule that contributes to a decision evaluation.
 * Rules can be simple boolean conditions or more complex recommenders.
 */
export interface DecisionRule<TContext> {
  /**
   * Evaluates the rule against the given context.
   * @returns True if the rule passes, false otherwise. Alternatively, could return a score or recommendation.
   * For simplicity in this foundation, we return boolean. More complex systems might return a recommendation object.
   */
  evaluate(context: TContext): boolean | Promise<boolean>;
}