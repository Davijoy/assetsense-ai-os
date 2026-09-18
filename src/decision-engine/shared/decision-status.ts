/**
 * Enumeration of possible lifecycle statuses for a decision.
 */
export enum DecisionStatus {
  Draft = 'Draft',
  Evaluated = 'Evaluated',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Scheduled = 'Scheduled',
  Executing = 'Executing',
  Executed = 'Executed',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
  Archived = 'Archived'
}