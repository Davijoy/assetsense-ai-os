/**
 * Additional metadata associated with a decision, useful for governance, auditing, and analytics.
 */
export interface DecisionMetadata {
  /** The version of the decision-making logic or policy used. */
  decisionLogicVersion: string;
  /** The version of any models or rules that contributed to the decision. */
  modelOrRuleVersion: string;
  /** The environment in which the decision was made (e.g., 'production', 'staging', 'test'). */
  environment: string;
  /** The identifier of the decision-making instance or service that produced this decision. */
  decisionMakerInstanceId: string;
  /** Any tags or labels applied to the decision for categorization. */
  tags: string[];
  /** Custom extensions for domain-specific metadata. */
  [key: string]: unknown;
}