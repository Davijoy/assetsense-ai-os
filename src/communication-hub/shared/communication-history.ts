import { CommunicationStatus } from './communication-status';
import { CommunicationMetadata } from './communication-metadata';
import { DeliveryAttempt } from './delivery-attempt';

/**
 * Historical record of a communication.
 */
export interface CommunicationHistory {
  /** Unique identifier for this communication */
  communicationId: string;

  /** Current status of the communication */
  status: CommunicationStatus;

  /** Timestamp when the communication was created */
  createdAt: string;

  /** Timestamp when the communication was last updated */
  updatedAt: string;

  /** Timestamp when the communication was sent */
  sentAt?: string;

  /** Timestamp when the communication was delivered */
  deliveredAt?: string;

  /** Timestamp when the communication failed */
  failedAt?: string;

  /** Timestamp when the communication expired */
  expiredAt?: string;

  /** Metadata associated with the communication */
  metadata: CommunicationMetadata;

  /** Delivery attempts made */
  attempts: DeliveryAttempt[];

  /** Final error if communication failed permanently */
  finalError?: string;

  /** Total cost of sending the communication */
  totalCost?: number;

  /** Cost information for the delivery provider */
  cost?: ProviderCost;

  /** Whether the communication was archived */
  archived: boolean;

  /** Retention expiry date */
  retentionExpiresAt?: string;
}

/**
 * Cost information for a communication.
 */
export interface ProviderCost {
  /** Currency of the cost */
  currency: string;

  /** Base cost */
  baseAmount: number;

  /** Tax amount */
  taxAmount?: number;

  /** Total cost */
  totalAmount: number;

  /** Rate applied */
  rate: number;

  /** Number of units (e.g., messages, emails) */
  units: number;
}