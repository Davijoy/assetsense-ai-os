/**
 * Metadata associated with communications.
 */
export interface CommunicationMetadata {
  /** Timestamp when the communication was created */
  createdAt: string;

  /** Timestamp when the communication was last updated */
  updatedAt: string;

  /** Version of the communication schema */
  schemaVersion: string;

  /** Source system that initiated the communication */
  sourceSystem: string;

  /** Correlation ID for tracing across systems */
  correlationId: string;

  /** Causation ID linking to the triggering event */
  causationId: string;

  /** User agent or client information */
  userAgent?: string;

  /** IP address of origin */
  ipAddress?: string;

  /** Geographic location information */
  geoLocation?: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  };

  /** Device information */
  deviceInfo?: {
    type: string;
    model: string;
    operatingSystem: string;
    browser?: string;
  };

  /** Custom metadata key-value pairs */
  custom: Record<string, unknown>;

  /** Tags for categorization and filtering */
  tags: string[];

  /** Processing flags */
  flags: Record<string, boolean>;

  /** Audit trail */
  auditTrail: AuditEntry[];
}

/**
 * Entry in an audit trail.
 */
export interface AuditEntry {
  /** Timestamp of the audit event */
  timestamp: string;

  /** Action that was performed */
  action: string;

  /** User or system that performed the action */
  actor: string;

  /** Result of the action */
  result: 'SUCCESS' | 'FAILURE' | 'PENDING';

  /** Details about the action */
  details: Record<string, unknown>;

  /** IP address of the actor */
  ipAddress?: string;

  /** User agent of the actor */
  userAgent?: string;
}