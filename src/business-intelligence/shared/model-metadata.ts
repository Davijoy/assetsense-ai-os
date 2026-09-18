/**
 * Metadata about the model that produced an intelligence result.
 */
export interface ModelMetadata {
  /** Unique identifier for the model. */
  modelId: string;
  /** Version of the model. */
  modelVersion: string;
  /** Type of model (e.g., 'rule_based', 'logistic_regression', 'neural_network'). */
  modelType: string;
  /** Version of the feature set used. */
  featureSetVersion: string;
  /** Timestamp when the prediction was made. */
  predictionTimestamp: string; // ISO 8601
  /** Reference to the training data used (e.g., dataset version, snapshot ID). */
  trainingDataReference: string;
  /** Human-readable explanation of the model's prediction. */
  explanation: string;
  /** Status of model drift detection. */
  driftStatus: 'none' | 'warning' | 'detected';
  /** Whether human review is required for this model's predictions. */
  humanReviewRequired: boolean;
}