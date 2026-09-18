/**
 * Contextual information provided to intelligence processors.
 */
export interface IntelligenceContext {
  /** Identifier of the workspace (tenant) for isolation. */
  workspaceId: string;
  /** Correlation ID for tracing related events. */
  correlationId: string;
  /** Causation ID indicating what caused the input event. */
  causationId: string;
  /** The original domain events that triggered this evaluation. */
  sourceEvents: any[]; // In a real system, this would be typed to specific event types
  /** Type of the subject being evaluated (e.g., 'Lead', 'Deal'). */
  subjectType: string;
  /** Identifier of the subject being evaluated. */
  subjectId: string;
  /** Timestamp when the evaluation was performed. */
  evaluatedAt: string; // ISO 8601 datetime string
  /** References to evidence used in the evaluation (e.g., data source identifiers). */
  evidenceReferences: string[];
  /** Data classification level (e.g., 'public', 'internal', 'confidential', 'restricted'). */
  dataClassification: string;
  /** Jurisdiction or regulatory regime applicable (e.g., 'GDPR', 'CCPA'). */
  jurisdiction: string;
}