/**
 * Interface for a rule-based intelligence function.
 * Takes a context and returns a result.
 */
export interface IntelligenceRule<TContext, TResult> {
  /**
   * Evaluates the rule against the given context.
   * Returns the result if the rule matches, otherwise undefined.
   */
  evaluate(context: TContext): TResult | Promise<TResult | undefined>;
}