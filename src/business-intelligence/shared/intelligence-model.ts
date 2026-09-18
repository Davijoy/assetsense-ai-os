/**
 * Interface for a machine learning model that produces predictions.
 * The model is a pure function: given input, it returns a prediction.
 */
export interface IntelligenceModel<TInput, TPrediction> {
  /**
   * Runs the model on the given input and returns a prediction.
   * May be asynchronous to allow for model loading, etc.
   */
  predict(input: TInput): Promise<TPrediction>;
}