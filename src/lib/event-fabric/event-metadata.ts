import { CorrelationId } from './correlation-id';
import { CausationId } from './causation-id';
import { EventClassification } from './event-classification';
import { EventPriority } from './event-priority';

/**
 * Metadata that accompanies every event in the Event Fabric.
 * Provides context, routing information, and processing hints.
 */
export interface EventMetadata {
  /** Unique identifier for this event (ULID/UUID) */
  eventId: string;
  /** Type of event (e.g., "CRM.LeadStatusChanged") */
  eventType: string;
  /** Version of the event schema (semver) */
  eventVersion: string;
  /** Timestamp when the event occurred (ISO 8601 UTC) */
  timestamp: string;
  /** Workspace this event belongs to (for multi-tenancy) */
  workspaceId: string;
  /** Distributed tracing ID (W3C TraceContext) */
  traceId?: string;
  /** Span ID for this event in a trace */
  spanId?: string;
  /** ID of the event that caused this event (for causation chains) */
  causationId?: CausationId;
  /** ID correlating related events across domains */
  correlationId?: CorrelationId;
  /** Classification of the event (domain, intelligence, decision, etc.) */
  classification: EventClassification;
  /** Priority level for processing */
  priority: EventPriority;
  /** Information about the event source */
  source: {
    /** Name of the service that published the event */
    serviceName: string;
    /** Specific instance ID (for debugging) */
    instanceId?: string;
    /** Version of the publishing service */
    version?: string;
  };
  /** Additional metadata specific to the event type */
  [key: string]: any;
}