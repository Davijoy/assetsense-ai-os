import { IEventPublisher } from '../event-publisher';
import { Event } from '../event';
import { CrmLeadCreatedEvent } from './crm-lead-created.event';
import { EventMetadata } from '../event-metadata';
import { generateCorrelationId } from '../correlation-id';

/**
 * Example implementation of an event publisher for CRM lead events
 * This demonstrates how the IEventPublisher interface would be implemented
 */
export class CrmLeadEventPublisher implements IEventPublisher {
  constructor(
    private readonly eventBus: IEventPublisher, // In practice, this would be an IEventBus
    private readonly sourceInfo: {
      serviceName: string;
      instanceId?: string;
      version?: string;
    }
  ) {}

  /**
   * Publishes a lead created event
   * @param leadData The data for the newly created lead
   * @param correlationId Optional correlation ID for tracking related events
   */
  async publishLeadCreated(leadData: {
    leadId: string;
    source: string;
    initialScore: number;
    assignedTo?: string;
    createdBy: string;
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
  }, correlationId?: string): Promise<void> {
    // Create the event metadata
    const metadata: EventMetadata = {
      eventId: Math.random().toString(36).substring(2, 15), // Simplified ID generation
      eventType: 'CRM.LeadCreated',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      workspaceId: 'default-workspace', // In practice, this would come from context
      classification: 'DOMAIN' as const,
      priority: 'MEDIUM' as const, // Default priority
      source: this.sourceInfo,
      correlationId: correlationId ?? generateCorrelationId()
    };

    // Create the domain event
    const leadCreatedEvent = new CrmLeadCreatedEvent(metadata, {
      ...leadData
    });

    // Publish the event through the event bus
    await this.eventBus.publish(leadCreatedEvent);
  }

  /**
   * Generic publish method required by IEventPublisher interface
   * @param event The event to publish
   */
  async publish(event: Event): Promise<void> {
    // In a real implementation, this might do additional processing
    // before delegating to the underlying event bus
    await this.eventBus.publish(event);
  }
}

// Example usage:
// async function handleNewLead(leadData) {
//   const publisher = new CrmLeadEventPublisher(eventBusInstance, {
//     serviceName: 'crm-service',
//     instanceId: 'crm-001',
//     version: '1.2.0'
//   });
//
//   await publisher.publishLeadCreated(leadData);
// }