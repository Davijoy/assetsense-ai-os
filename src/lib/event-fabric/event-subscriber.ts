import { Event } from './event';

/**
 * Interface for handling events from the Event Fabric.
 */
export interface IEventSubscriber {
  /**
   * Handles an incoming event.
   * @param event The event to handle
   * @returns A promise that resolves when the event has been processed
   */
  onEvent(event: Event): Promise<void>;
}