/**
 * Type representing a confidence score (0.0 to 1.0).
 * Branded to prevent accidental mixing with other numeric values.
 */
export type DecisionConfidence = number & { __brand: 'DecisionConfidence' };

/**
 * Creates a DecisionConfidence value from a number, asserting that it is within [0, 1].
 * @param value The confidence value.
 * @returns The value branded as DecisionConfidence.
 * @throws If the value is outside the range [0, 1].
 */
export function makeDecisionConfidence(value: number): DecisionConfidence {
  if (value < 0 || value > 1) {
    throw new Error(`Confidence must be between 0 and 1, got ${value}`);
  }
  return value as DecisionConfidence;
}