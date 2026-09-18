import { EventMetadata } from '../../lib/event-fabric/event-metadata';
import { EventClassification } from '../../lib/event-fabric/event-classification';
import { IntelligenceEvent } from './intelligence-event';

/**
 * Base class for all intelligence events.
 * Ensures the event is classified as INTELLIGENCE and provides a constructor
 * to set metadata and payload.
 */
export abstract class BaseIntelligenceEvent<TPayload extends object> implements IntelligenceEvent<TPayload> {
  constructor(
    public readonly metadata: EventMetadata,
    public readonly payload: TPayload
  ) {
    // Ensure the event is classified as an intelligence event
    this.metadata.classification = EventClassification.INTELLIGENCE;
  }
}