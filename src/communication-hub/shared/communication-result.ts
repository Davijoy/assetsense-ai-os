import { CommunicationStatus } from './communication-status';
import { DeliveryAttempt } from './delivery-attempt';
import { ProviderCost } from './communication-history';

/**
 * Result of processing a communication request.
 */
export interface CommunicationResult {
  /** Unique identifier for this communication result (matches request communicationId) */
  communicationId: string;

  /** Current status of the communication */
  status: CommunicationStatus;

  /** Timestamp when this result was generated (ISO 8601) */
  timestamp: string;

  /** List of delivery attempts made */
  attempts: DeliveryAttempt[];

  /** Error message if the communication failed permanently */
  error?: string;

  /** Provider-specific message ID if successfully sent */
  providerMessageId?: string;

  /** Whether the communication was suppressed (e.g., due to opt-out, quiet hours) */
  suppressed: boolean;

  /** Reason for suppression if applicable */
  suppressionReason?: string;

  /** Cost incurred for sending this communication */
  cost?: ProviderCost;

  /** Whether delivery receipt was requested and received */
  deliveryReceiptReceived?: boolean;

  /** Whether open tracking was enabled and an open was detected */
  openDetected?: boolean;

  /** Whether click tracking was enabled and a click was detected */
  clickDetected?: boolean;

  /** Number of retries attempted */
  retryCount: number;

  /** Next scheduled retry time (if applicable) */
  nextRetryAt?: string;

  /** Channel-specific response data */
  channelResponse?: Record<string, unknown>;

  /** Additional metadata about the delivery */
  metadata: Record<string, unknown>;
}