/**
 * Policy governing how communications are handled.
 */
export interface CommunicationPolicy {
  /** Whether delivery receipts are required */
  requireDeliveryReceipt: boolean;

  /** Whether read receipts are required */
  requireReadReceipt: boolean;

  /** Whether to track opens (for email) */
  trackOpens: boolean;

  /** Whether to track clicks (for email) */
  trackClicks: boolean;

  /** Whether to allow forwarding */
  allowForwarding: boolean;

  /** Whether to allow auto-replies */
  allowAutoReplies: boolean;

  /** Maximum number of recipients per communication */
  maxRecipients: number;

  /** Whether to deduplicate recipients */
  deduplicateRecipients: boolean;

  /** Whether to suppress communication if user has opted out */
  respectOptOut: boolean;

  /** Whether to check communication preferences */
  checkPreferences: boolean;

  /** Whether to validate content before sending */
  validateContent: boolean;

  /** Whether to sanitize content */
  sanitizeContent: boolean;

  /** Whether to encrypt sensitive content */
  encryptSensitive: boolean;

  /** Retention period for communication logs (in days) */
  retentionDays: number;

  /** Whether to archive communications */
  archiveCommunications: boolean;
}