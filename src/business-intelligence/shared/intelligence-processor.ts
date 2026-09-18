import { Event } from '../../lib/event-fabric/event';
import { IntelligenceEvent } from './intelligence-event';

/**
 * Interface for processing an input event (typically a domain event)
 * and producing an output intelligence event.
 * Implementations should contain the intelligence logic (rules or ML).
 */
export interface IntelligenceProcessor<TInput extends Event, TPayload extends object> {
  /**
   * Processes the input event and returns an intelligence event.
   * Returns undefined if no intelligence event should be produced.
   */
  process(input: TInput): Promise<IntelligenceEvent<TPayload> | undefined>;
}