import { CommunicationChannel } from './communication-channel';

/**
 * Policy defining consent requirements for communications.
 */
export interface ConsentPolicy {
  /** Whether explicit consent is required */
  required: boolean;

  /** Type of consent required (implied, express, etc.) */
  type: 'IMPLIED' | 'EXPRESS' | 'VERIFIED';

  /** How consent was obtained */
  method: 'WEB_FORM' | 'SMS_KEYWORD' | 'VERBAL' | 'WRITTEN' | 'OTHER';

  /** Timestamp when consent was given */
  grantedAt: string;

  /** Timestamp when consent expires (if applicable) */
  expiresAt?: string;

  /** Whether consent can be withdrawn */
  revocable: boolean;

  /** Whether consent has been withdrawn */
  withdrawn: boolean;

  /** Timestamp when consent was withdrawn (if applicable) */
  withdrawnAt?: string;

  /** Version of the consent terms */
  version: string;

  /** Whether consent applies to all communication types */
  blanketConsent: boolean;

  /** Specific communication types covered by consent */
  coveredTypes: CommunicationChannel[];

  /** Geographical restrictions */
  geographicalRestriction: boolean;

  /** Allowed jurisdictions */
  allowedJurisdictions: string[];

  /** Language of the consent */
  language: string;

  /** Whether the consent was recorded */
  recorded: boolean;

  /** Reference to consent record */
  consentRecordId?: string;
}