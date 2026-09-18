/**
 * Policy defining retry behavior for failed delivery attempts.
 */
export interface RetryPolicy {
  /** Whether retries are enabled */
  enabled: boolean;

  /** Maximum number of retry attempts */
  maxAttempts: number;

  /** Base delay between retries in milliseconds */
  baseDelayMs: number;

  /** Exponential backoff multiplier */
  backoffMultiplier: number;

  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number;

  /** Whether to jitter the delay to prevent thundering herd */
  jitter: boolean;
}