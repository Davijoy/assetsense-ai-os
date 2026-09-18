/**
 * Priority levels for event processing.
 * Determines the order in which events are consumed from the event stream.
 */
export const EventPriority = {
  /** Critical: System failures, security breaches, payment failures */
  CRITICAL: 'CRITICAL',
  /** High: User-facing notifications, SLA breaches, urgent decisions */
  HIGH: 'HIGH',
  /** Medium: Standard business operations, most domain events */
  MEDIUM: 'MEDIUM',
  /** Low: Background tasks, analytics, non-urgent updates */
  LOW: 'LOW',
  /** Backoff: Retry attempts, dead letter processing */
  BACKOFF: 'BACKOFF'
} as const;

export type EventPriority = typeof EventPriority[keyof typeof EventPriority];