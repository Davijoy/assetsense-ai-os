import { Event } from '../../lib/event-fabric/event';
import { EventMetadata } from '../../lib/event-fabric/event-metadata';

/**
 * Base interface for all intelligence events.
 * Extends the base Event interface but allows the payload type to be specified.
 */
export interface IntelligenceEvent<TPayload extends object> extends Event {
  payload: TPayload;
}