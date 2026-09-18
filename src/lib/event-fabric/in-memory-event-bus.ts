/**
 * In-memory Event Fabric implementation.
 *
 * A real runtime event bus that implements the existing IEventBus contract.
 * It is fully in-memory (no external broker) for this first runtime proof,
 * but is structured so it can be replaced later without changing consumers.
 *
 * Features:
 *  - publish(event) with asynchronous handler dispatch
 *  - subscribe(eventType, handler) with string or RegExp filters
 *  - unsubscribe support via subscription ID
 *  - handler isolation: one subscriber failure does not crash others
 *  - workspace isolation: events are scoped per workspace
 *  - typed event payloads via the Event interface
 */

import { IEventBus } from "./event-bus";
import { IEventPublisher } from "./event-publisher";
import { IEventSubscriber } from "./event-subscriber";
import { Event } from "./event";

/**
 * Internal subscription record.
 */
interface Subscription {
  id: string;
  subscriber: IEventSubscriber;
  filter: string | RegExp;
  workspaceId: string | null;
}

/**
 * In-memory event bus implementing IEventBus and IEventPublisher.
 *
 * Workspace isolation: when a subscription is created with a workspaceId,
 * it only receives events for that workspace. Subscriptions without a
 * workspaceId receive events from all workspaces.
 */
export class InMemoryEventBus implements IEventBus, IEventPublisher {
  private subscriptions: Map<string, Subscription> = new Map();
  private counter = 0;

  /**
   * Publishes an event to all matching subscribers.
   * Handlers are invoked asynchronously and isolated from each other.
   */
  async publish(event: Event): Promise<void> {
    const eventType = event.metadata.eventType;
    const workspaceId = event.metadata.workspaceId;

    // Snapshot subscriptions to avoid mutation-during-iteration issues
    const subs = Array.from(this.subscriptions.values());

    for (const sub of subs) {
      // Workspace isolation check
      if (sub.workspaceId !== null && sub.workspaceId !== workspaceId) {
        continue;
      }

      if (!this.matches(eventType, sub.filter)) {
        continue;
      }

      // Handler isolation: one failure must not crash unrelated subscribers
      try {
        await sub.subscriber.onEvent(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          `[InMemoryEventBus] Subscriber error for "${eventType}" (sub ${sub.id}):`,
          error,
        );
      }
    }
  }

  /**
   * Subscribes a subscriber to events matching the given filter.
   * @param subscriber The subscriber to notify
   * @param eventTypeFilter A string or RegExp to match event types
   * @param workspaceId Optional workspace to scope the subscription to
   * @returns A subscription ID that can be used to unsubscribe
   */
  subscribe(
    subscriber: IEventSubscriber,
    eventTypeFilter: string | RegExp,
    workspaceId?: string,
  ): string {
    const id = `sub-${Date.now()}-${++this.counter}-${Math.random().toString(36).slice(2, 8)}`;
    this.subscriptions.set(id, {
      id,
      subscriber,
      filter: eventTypeFilter,
      workspaceId: workspaceId ?? null,
    });
    return id;
  }

  /**
   * Unsubscribes from events using the subscription ID.
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Returns the number of active subscriptions (for testing/debugging).
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Clears all subscriptions (for testing).
   */
  clear(): void {
    this.subscriptions.clear();
  }

  /**
   * Checks if an event type matches a filter (string or RegExp).
   */
  private matches(eventType: string, filter: string | RegExp): boolean {
    if (typeof filter === "string") {
      // Support wildcard patterns like "INVENTORY.*"
      if (filter.includes("*")) {
        const regex = new RegExp("^" + filter.replace(/\*/g, ".*") + "$");
        return regex.test(eventType);
      }
      return eventType === filter;
    }
    return filter.test(eventType);
  }
}
