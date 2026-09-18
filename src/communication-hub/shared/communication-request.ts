import { CommunicationChannel } from './communication-channel';
import { CommunicationRecipient } from './communication-recipient';
import { CommunicationTemplate } from './communication-template';
import { CommunicationPriority } from './communication-priority';
import { CommunicationStatus } from './communication-status';
import { ConsentPolicy } from './consent-policy';
import { QuietHoursPolicy } from './quiet-hours-policy';
import { RetryPolicy } from './retry-policy';

/**
 * Request to send a communication based on a decision or trigger.
 */
export interface CommunicationRequest<TPayload extends object = object> {
  /** Unique identifier for this communication request */
  communicationId: string;

  /** ID of the decision that triggered this communication (if applicable) */
  decisionId?: string;

  /** Workspace identifier for multi-tenancy isolation */
  workspaceId: string;

  /** Correlation ID to trace related events across the system */
  correlationId: string;

  /** Causation ID to link directly to the trigger that caused this communication */
  causationId: string;

  /** Channel through which to send the communication */
  channel: CommunicationChannel;

  /** Recipients of the communication */
  recipients: CommunicationRecipient[];

  /** Template to use for the communication content */
  templateId: string;

  /** Locale for localization (e.g., 'en-US', 'es-ES') */
  locale: string;

  /** Priority level of the communication */
  priority: CommunicationPriority;

  /** When the communication should be sent (ISO 8601 timestamp) */
  scheduledAt: string;

  /** When the communication expires if not sent (ISO 8601 timestamp) */
  expiresAt?: string;

  /** Consent requirements and status */
  consent: ConsentPolicy;

  /** Quiet hours policy to respect */
  quietHoursPolicy: QuietHoursPolicy;

  /** Retry policy for failed deliveries */
  retryPolicy: RetryPolicy;

  /** Whether human review is required before sending */
  humanReviewRequired: boolean;

  /** Additional metadata for the communication */
  metadata: TPayload;

  /** Whether to track delivery status */
  trackDelivery: boolean;

  /** Whether to track opens (for email) */
  trackOpens: boolean;

  /** Whether to track clicks (for email) */
  trackClicks: boolean;

  /** Channel-specific configuration */
  channelConfig: Record<string, unknown>;

  /** Whether this is a test communication */
  isTest: boolean;
}