import { EventMetadata } from '../../lib/event-fabric/event-metadata';
import { EventClassification } from '../../lib/event-fabric/event-classification';
import { DecisionEvent } from './decision';

/**
 * Abstract base class for all decision events.
 * Ensures the event is classified as a DECISION event and provides a constructor to set metadata and payload.
 */
export abstract class BaseDecisionEvent<TPayload extends object> implements DecisionEvent<TPayload> {
  constructor(
    public readonly metadata: EventMetadata,
    public readonly payload: TPayload
  ) {
    // Ensure the event is classified as a decision event
    this.metadata.classification = EventClassification.DECISION;
  }
}