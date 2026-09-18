import { Event } from '../../lib/event-fabric/event';

/**
 * Contextual information provided to decision evaluators and processors.
 * Contains details about the evaluation environment, related events, and subject matter.
 */
export interface DecisionContext {
  /** Identifier of the workspace (tenant) for isolation. */
  workspaceId: string;
  /** Correlation ID for tracing related events across the system. */
  correlationId: string;
  /** Causation ID indicating what caused the intelligence event that triggered this decision. */
  causationId: string;
  /** The intelligence events that triggered this decision evaluation. */
  intelligenceEvents: Event[];
  /** Type of the subject the decision is about (e.g., 'Lead', 'InventoryItem', 'Campaign'). */
  subjectType: string;
  /** Identifier of the subject the decision is about. */
  subjectId: string;
  /** Timestamp when the decision evaluation was performed. */
  evaluatedAt: string; // ISO 8601 datetime string
  /** References to external evidence or data sources used in the decision. */
  evidenceReferences: string[];
  /** Classification of the data being used for the decision (e.g., 'public', 'confidential', 'restricted'). */
  dataClassification: string;
  /** Jurisdiction or regulatory regime applicable to this decision. */
  jurisdiction: string;
}