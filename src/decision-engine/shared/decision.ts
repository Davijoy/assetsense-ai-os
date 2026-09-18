import { Event } from '../../lib/event-fabric/event';

/**
 * Interface for a decision event, extending the base Event interface with a strongly typed payload.
 * Represents an explicit, auditable choice produced by the Decision Engine.
 */
export interface DecisionEvent<TPayload extends object> extends Event {
  payload: TPayload;
}