import { Event } from './event';

/**
 * Interface for publishing events to the Event Fabric.
 */
export interface IEventPublisher {
  /**
   * Publishes an event to the Event Fabric.
   * @param event The event to publish
   * @returns A promise that resolves when the event has been accepted for publishing
   */
  publish(event: Event): Promise<void>;
}