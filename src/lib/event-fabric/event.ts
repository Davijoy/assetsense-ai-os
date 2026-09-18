import { EventMetadata } from './event-metadata';

/**
 * The base type for all events in the Event Fabric.
 * Contains metadata and payload.
 */
export interface Event {
  metadata: EventMetadata;
  payload: Record<string, any>;
}