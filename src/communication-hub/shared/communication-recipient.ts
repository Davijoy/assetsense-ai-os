/**
 * Recipient of a communication.
 */
export interface CommunicationRecipient {
  /** Unique identifier for the recipient */
  recipientId: string;

  /** Contact information (email, phone number, etc.) */
  contact: string;

  /** Type of contact (e.g., 'email', 'phone', 'handle') */
  contactType: string;

  /** Name of the recipient */
  name?: string;

  /** Preferred language/locale */
  locale?: string;

  /** Timezone for scheduling considerations */
  timezone?: string;

  /** Whether the recipient has opted out */
  optedOut: boolean;

  /** Date when consent was given (if applicable) */
  consentDate?: string;

  /** Consent metadata */
  consentMetadata?: Record<string, unknown>;

  /** Channel-specific properties */
  channelProperties?: Record<string, unknown>;

  /** Metadata about the recipient */
  metadata: Record<string, unknown>;
}