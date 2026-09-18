import { IEventPublisher } from './event-publisher';
import { IEventSubscriber } from './event-subscriber';
import { Event } from './event';

/**
 * Abstraction for the Event Bus. Provides publish and subscribe capabilities.
 * This interface defines the contract that event bus implementations must follow.
 * Implementations should handle workspace isolation, event routing, and delivery guarantees.
 */
export interface IEventBus {
  /**
   * Publishes an event to the Event Fabric.
   * @param event The event to publish
   * @returns A promise that resolves when the event has been accepted for publishing
   */
  publish(event: Event): Promise<void>;

  /**
   * Subscribes to events matching the given filter.
   * @param subscriber The subscriber to notify when events match the filter
   * @param eventTypeFilter A string or regex to match event types (e.g., "CRM.Lead.*")
   * @returns A subscription ID that can be used to unsubscribe
   */
  subscribe(subscriber: IEventSubscriber, eventTypeFilter: string | RegExp): string;

  /**
   * Unsubscribes from events using the subscription ID.
   * @param subscriptionId The ID returned by subscribe
   */
  unsubscribe(subscriptionId: string): void;
}