/**
 * Enumeration of priority levels for decisions.
 * Determines the urgency of decision processing and execution.
 */
export enum DecisionPriority {
  Critical = 'CRITICAL',
  High = 'HIGH',
  Medium = 'MEDIUM',
  Low = 'LOW',
  Backoff = 'BACKOFF'
}