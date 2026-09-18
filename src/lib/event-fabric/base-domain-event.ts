import { EventMetadata } from './event-metadata';
import { EventClassification } from './event-classification';

/**
 * Base class for all domain events. Domain events represent facts that have occurred
 * in a bounded context (e.g., LeadCreated, DealUpdated).
 * Note: Subclasses must ensure metadata.classification is set to EventClassification.DOMAIN.
 */
export abstract class BaseDomainEvent {
  constructor(
    public readonly metadata: EventMetadata,
    public readonly payload: Record<string, any>
  ) {}
}