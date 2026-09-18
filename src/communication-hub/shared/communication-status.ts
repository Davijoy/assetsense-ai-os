/**
 * Status of a communication throughout its lifecycle.
 */
export type CommunicationStatus =
  | 'DRAFT'
  | 'ACCEPTED'
  | 'QUEUED'
  | 'SCHEDULED'
  | 'SENDING'
  | 'DELIVERED'
  | 'FAILED'
  | 'SUPPRESSED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'ARCHIVED';