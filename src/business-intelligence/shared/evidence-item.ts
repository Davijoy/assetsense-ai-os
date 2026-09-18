/**
 * A piece of evidence supporting an intelligence result.
 */
export interface EvidenceItem {
  /** The name or identifier of the evidence factor (e.g., 'website_visits', 'company_size'). */
  factor: string;
  /** The value of the evidence factor. */
  value: unknown;
  /** The impact of this evidence on the result (can be positive or negative). */
  impact: number;
  /** Confidence in this evidence item (0.0 to 1.0). */
  confidence: number;
}