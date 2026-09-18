import { Event } from '../event';
import { EventMetadata } from '../event-metadata';
import { generateCorrelationId } from '../correlation-id';
import { generateCausationId } from '../causation-id';

/**
 * Event published by the Executive Command layer when resource allocation has been changed
 * based on strategic decisions and business intelligence insights
 */
export class ExecutiveCommandResourceAllocationChangedEvent implements Event {
  constructor(
    public readonly metadata: EventMetadata,
    public readonly payload: {
      allocationId: string;
      resourceType: string; // e.g., 'budget', 'personnel', 'marketing_spend'
      resourceId: string; // ID of the specific resource (e.g., campaign ID, team ID)
      oldAllocation: number; // Previous allocation amount/percentage
      newAllocation: number; // New allocation amount/percentage
      changeReason: string; // Reason for the allocation change
      changedBy: string; // User ID who made the change (could be system or human)
      effectiveDate: string; // When the change takes effect (ISO 8601)
      associatedInitiativeId?: string; // Related strategic initiative if applicable
      expectedImpact: {
        metricType: string; // e.g., 'revenue', 'lead_volume', 'customer_satisfaction'
        predictedChange: number; // Expected change in metric
        confidence: number; // Confidence in prediction (0-1)
        timeframe: string; // e.g., 'Q1_2027', '6_months'
      }[];
    }
  ) {
    // Ensure the metadata has the correct classification for decision events
    const decisionMetadata: EventMetadata = {
      ...metadata,
      classification: 'DECISION' as const,
      // Set correlationId if not provided (for tracking related events)
      correlationId: metadata.correlationId ?? generateCorrelationId(),
      // Set causationId if not provided (for tracking what caused this event)
      causationId: metadata.causationId ?? generateCausationId()
    };

    // In a real implementation, we would create a new metadata object
    // For this example, we're showing the structure that would be used
    Object.assign(this.metadata, decisionMetadata);
  }
}