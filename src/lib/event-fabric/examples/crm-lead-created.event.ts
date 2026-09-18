import { BaseDomainEvent } from '../base-domain-event';
import { EventMetadata } from '../event-metadata';
import { generateCorrelationId } from '../correlation-id';
import { generateCausationId } from '../causation-id';

/**
 * Event published when a new lead is created in the CRM system
 */
export class CrmLeadCreatedEvent extends BaseDomainEvent {
  constructor(
    metadata: EventMetadata,
    public readonly payload: {
      leadId: string;
      source: string; // e.g., 'website', 'referral', 'cold_call'
      initialScore: number; // 0-100
      assignedTo?: string; // user ID of assigned agent
      createdBy: string; // user ID who created the lead
      contactInfo: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
      };
      companyInfo?: {
        name?: string;
        industry?: string;
        employeeCount?: number;
      };
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