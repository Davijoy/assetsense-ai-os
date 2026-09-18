import { BaseDomainEvent } from '../base-domain-event';
import { EventMetadata } from '../event-metadata';
import { generateCorrelationId } from '../correlation-id';
import { generateCausationId } from '../causation-id';

/**
 * Event published when the value of a deal has been updated
 */
export class DealsDealValueUpdatedEvent extends BaseDomainEvent {
  constructor(
    metadata: EventMetadata,
    public readonly payload: {
      dealId: string;
      oldValue: number;
      newValue: number;
      currency: string; // ISO 4217 currency code (e.g., 'USD', 'EUR')
      updateReason: string; // Reason for the value change
      updatedBy: string; // User ID who made the change
      associatedLeadId?: string; // Related lead ID if applicable
      associatedAccountId?: string; // Related account/company ID
    }
  ) {
    // Ensure the metadata has the correct classification for domain events
    const domainMetadata: EventMetadata = {
      ...metadata,
      classification: 'DOMAIN' as const,
      // Set correlationId if not provided (for tracking related events)
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      // Set causationId if not provided (for tracking what caused this event)
      causationId: metadata.causationId ?? generateCausationId()
    };

    super(domainMetadata, payload);
  }
}