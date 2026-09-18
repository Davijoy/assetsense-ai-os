import { CommunicationRequest } from './communication-request';
import { CommunicationResult } from './communication-result';

/**
 * Interface for processing communication requests.
 * Implementations handle the actual sending of communications via various providers
 * (email, SMS, push, etc.) while respecting policies and tracking delivery status.
 */
export interface CommunicationProcessor {
  /**
   * Process a communication request and return the result.
   * @param request The communication request to process
   * @returns Promise resolving to the communication result
   */
  process(request: CommunicationRequest): Promise<CommunicationResult>;

  /**
   * Get the types of communications this processor can handle.
   * @returns Array of communication types (e.g., ['email', 'sms'])
   */
  getSupportedTypes(): string[];

  /**
   * Get the name/provider of this communication processor.
   * @returns Provider name (e.g., 'SendGrid', 'Twilio', 'SES')
   */
  getProviderName(): string;
}