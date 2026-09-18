/**
 * Policy defining quiet hours during which communications should not be sent.
 */
export interface QuietHoursPolicy {
  /** Whether quiet hours are enabled */
  enabled: boolean;

  /** Start time in 24-hour format (HH:mm) */
  startTime: string;

  /** End time in 24-hour format (HH:mm) */
  endTime: string;

  /** Timezone for the quiet hours */
  timezone: string;

  /** Days of week when quiet hours apply (0=Sunday, 6=Saturday) */
  days: number[];

  /** Whether to override for urgent communications */
  allowUrgentOverride: boolean;
}