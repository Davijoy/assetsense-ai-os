/**
 * Trace information for a decision, linking it to its causes and effects.
 */
export interface DecisionTrace {
  /** Identifier of the root cause domain event that started the chain. */
  rootCauseEventId: string;
  /** Identifier of the intelligence event that directly triggered this decision. */
  triggeringIntelligenceEventId: string;
  /** Any intermediate events or processes between the root cause and this decision. */
  intermediateSteps: {
    id: string;
    type: string; // e.g., 'intelligence_processing', 'data_enrichment'
    timestamp: string;
  }[];
  /** Any downstream events that have been triggered as a result of this decision (to be filled later). */
  downstreamEvents: {
    id: string;
    type: string; // e.g., 'communication_request', 'action_triggered'
    timestamp: string;
    status: 'pending' | 'sent' | 'failed';
  }[];
  /** The overall correlation ID for the entire chain of events related to this decision. */
  correlationId: string;
  /** The causation ID linking this decision to its immediate predecessor (the intelligence event). */
  causationId: string;
}