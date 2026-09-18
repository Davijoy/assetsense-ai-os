import { CommunicationRequest } from './communication-request';
import { CommunicationResult } from './communication-result';
import { CommunicationStatus } from './communication-status';

/**
 * Context for processing a communication request.
 * Provides environmental and state information needed during processing.
 */
export interface CommunicationContext {
  /** Workspace identifier */
  workspaceId: string;

  /** Current timestamp (ISO 8601) */
  timestamp: string;

  /** User or system initiating the communication */
  initiator: {
    id: string;
    type: 'USER' | 'SYSTEM' | 'PROCESS';
    name?: string;
  };

  /** Source of the communication request */
  source: {
    service: string;
    version: string;
    instanceId: string;
  };

  /** Environment (development, staging, production) */
  environment: string;

  /** Feature flags that may affect processing */
  featureFlags: Record<string, boolean>;

  /** Security context */
  security: {
    token?: string;
    permissions: string[];
    roles: string[];
  };

  /** Tracing information */
  tracing: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
  };

  /** Available communication processors */
  availableProcessors: string[];

  /** System capacity and load information */
  systemLoad: {
    cpuUsage: number;
    memoryUsage: number;
    queueDepth: number;
  };

  /** External service statuses */
  dependencies: Record<string, {
    status: 'UP' | 'DEGRADED' | 'DOWN';
    latencyMs: number;
  }>;

  /** Method to log audit information */
  auditLog: (entry: AuditEntry) => Promise<void>;

  /** Method to store communication history */
  storeHistory: (record: CommunicationResult) => Promise<void>;

  /** Method to retrieve communication history */
  getHistory: (criteria: HistoryCriteria) => Promise<CommunicationResult[]>;
}

/**
 * Audit log entry.
 */
export interface AuditEntry {
  /** Action being audited */
  action: string;

  /** Outcome of the action */
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';

  /** Timestamp of the action */
  timestamp: string;

  /** Actor performing the action */
  actor: {
    id: string;
    type: 'USER' | 'SYSTEM' | 'PROCESS';
  };

  /** Target of the action */
  target: {
    id: string;
    type: string;
  };

  /** Details of the action */
  details: Record<string, unknown>;

  /** Severity level */
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

/**
 * Criteria for querying communication history.
 */
export interface HistoryCriteria {
  /** Communication IDs to filter by */
  communicationIds?: string[];

  /** Statuses to filter by */
  statuses?: CommunicationStatus[];

  /** Date range for filtering */
  dateRange?: {
    start: string;
    end: string;
  };

  /** Recipients to filter by */
  recipients?: string[];

  /** Channels to filter by */
  channels?: string[];

  /** Maximum number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}