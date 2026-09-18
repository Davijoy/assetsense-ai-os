/**
 * Shared Activity Context — the universal context object that flows through
 * all Sentinel Fort runtime layers (Event Fabric, BI, Decision Engine, Communication Hub).
 *
 * Server timestamps are authoritative. Location is optional and permission-based.
 * Never fabricate coordinates. Preserve workspace isolation.
 * Preserve correlationId and causationId through all runtime layers.
 */

export interface ActivityContext {
  /** Unique identifier for this activity (ULID/UUID) */
  activityId: string;
  /** Workspace this activity belongs to (multi-tenancy) */
  workspaceId: string;
  /** User who performed or triggered the activity */
  userId: string;
  /** Business module: "inventory" | "customer" | "crm" | "market" | "supreme" */
  module: "inventory" | "customer" | "crm" | "market" | "supreme";
  /** Type of activity for routing and analytics */
  activityType: ActivityType;
  /** When the activity actually occurred (server-authoritative, ISO 8601 UTC) */
  occurredAt: string;
  /** When the activity was recorded in the system (server-authoritative, ISO 8601 UTC) */
  recordedAt: string;
  /** IANA timezone of the occurrence (e.g., "Asia/Kolkata") */
  timezone: string;
  /** Optional latitude — only if user granted location permission */
  latitude?: number;
  /** Optional longitude — only if user granted location permission */
  longitude?: number;
  /** Human-readable location label (e.g., "Bengaluru, Karnataka, India") */
  locationLabel?: string;
  /** Source of the activity: "ui" | "api" | "scheduled" | "webhook" | "voice" | "ingestion" */
  source: ActivitySource;
  /** Distributed tracing: correlates related events across domains */
  correlationId: string;
  /** Causation chain: ID of the event that caused this activity */
  causationId?: string;
  /** Extensible metadata for domain-specific data */
  metadata: Record<string, unknown>;
}

/** Allowed activity types for routing and analytics */
export type ActivityType =
  | "snapshot_requested"
  | "snapshot_processed"
  | "risk_detected"
  | "recommendation_created"
  | "recommendation_delivered"
  | "recommendation_approved"
  | "recommendation_rejected"
  | "recommendation_executed"
  | "ingestion_started"
  | "ingestion_completed"
  | "ingestion_failed"
  | "market_snapshot_generated"
  | "supreme_correlation_computed"
  | "supreme_recommendation_created"
  | "approval_requested"
  | "approval_granted"
  | "approval_denied"
  | "voice_call_started"
  | "voice_call_ended"
  | "voice_transcript_received"
  | "voice_intent_extracted"
  | "calendar_event_created"
  | "calendar_event_updated"
  | "location_captured"
  | "manual_entry";

/** Allowed activity sources */
export type ActivitySource =
  | "ui"
  | "api"
  | "scheduled"
  | "webhook"
  | "voice"
  | "ingestion"
  | "supreme_orchestrator";

/**
 * Creates a new ActivityContext with server-authoritative timestamps.
 * Location fields are only populated if explicitly provided (permission-based).
 */
export function createActivityContext(params: {
  workspaceId: string;
  userId: string;
  module: ActivityContext["module"];
  activityType: ActivityType;
  source: ActivitySource;
  correlationId: string;
  causationId?: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
}): ActivityContext {
  const now = new Date().toISOString();
  return {
    activityId: `act-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    workspaceId: params.workspaceId,
    userId: params.userId,
    module: params.module,
    activityType: params.activityType,
    occurredAt: now,
    recordedAt: now,
    timezone: params.timezone ?? "UTC",
    latitude: params.latitude,
    longitude: params.longitude,
    locationLabel: params.locationLabel,
    source: params.source,
    correlationId: params.correlationId,
    causationId: params.causationId,
    metadata: params.metadata ?? {},
  };
}

/**
 * Validates that an ActivityContext has required fields and valid structure.
 * Does NOT validate coordinate accuracy — only that if present, they are numbers.
 */
export function validateActivityContext(ctx: ActivityContext): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!ctx.activityId) errors.push("activityId is required");
  if (!ctx.workspaceId) errors.push("workspaceId is required");
  if (!ctx.userId) errors.push("userId is required");
  if (!ctx.module) errors.push("module is required");
  if (!ctx.activityType) errors.push("activityType is required");
  if (!ctx.occurredAt) errors.push("occurredAt is required");
  if (!ctx.recordedAt) errors.push("recordedAt is required");
  if (!ctx.timezone) errors.push("timezone is required");
  if (!ctx.source) errors.push("source is required");
  if (!ctx.correlationId) errors.push("correlationId is required");

  if (ctx.latitude !== undefined && (typeof ctx.latitude !== "number" || isNaN(ctx.latitude))) {
    errors.push("latitude must be a valid number if provided");
  }
  if (ctx.longitude !== undefined && (typeof ctx.longitude !== "number" || isNaN(ctx.longitude))) {
    errors.push("longitude must be a valid number if provided");
  }

  // Validate timestamp format (basic ISO 8601 check)
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (ctx.occurredAt && !isoRegex.test(ctx.occurredAt)) {
    errors.push("occurredAt must be ISO 8601 UTC (e.g., 2026-08-05T10:30:00.000Z)");
  }
  if (ctx.recordedAt && !isoRegex.test(ctx.recordedAt)) {
    errors.push("recordedAt must be ISO 8601 UTC (e.g., 2026-08-05T10:30:00.000Z)");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Extracts ActivityContext from an Event's metadata for propagation.
 * Ensures correlationId and causationId are preserved.
 */
export function activityContextFromEventMetadata(metadata: {
  workspaceId: string;
  correlationId?: string;
  causationId?: string;
  source?: { serviceName: string };
  [key: string]: any;
}): Partial<ActivityContext> {
  return {
    workspaceId: metadata.workspaceId,
    correlationId: metadata.correlationId,
    causationId: metadata.causationId,
    source: (metadata.source?.serviceName as ActivitySource) ?? "api",
    metadata: metadata,
  };
}