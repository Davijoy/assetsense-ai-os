/**
 * Represents a single attempt to deliver a communication.
 */
export interface DeliveryAttempt {
  /** Timestamp of this attempt (ISO 8601) */
  timestamp: string;

  /** Communication provider used for this attempt */
  provider: string;

  /** Provider-specific message ID */
  messageId?: string;

  /** Whether this attempt was successful */
  success: boolean;

  /** Error details if the attempt failed */
  error?: string;

  /** HTTP status code if applicable */
  statusCode?: number;

  /** Provider response if available */
  providerResponse?: unknown;
}