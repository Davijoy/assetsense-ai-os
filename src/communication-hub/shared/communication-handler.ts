import { CommunicationRequest } from './communication-request';
import { CommunicationResult } from './communication-result';
import { CommunicationProcessor } from './communication-processor';

/**
 * Handler for processing specific types of communication requests.
 * Implementations contain the business logic for preparing and sending
 * communications via specific channels.
 */
export interface CommunicationHandler {
  /**
   * Handle a communication request and produce a result.
   * @param request The communication request to handle
   * @param context The processing context
   * @returns Promise resolving to the communication result
   */
  handle(request: CommunicationRequest, context: any): Promise<CommunicationResult>;

  /**
   * Get the type of communication this handler processes.
   * @returns Communication type identifier
   */
  getType(): string;

  /**
   * Get the communication channel this handler uses.
   * @returns Communication channel
   */
  getChannel(): import('./communication-channel').CommunicationChannel;

  /**
   * Validate a communication request before processing.
   * @param request The request to validate
   * @returns Tuple of (isValid: boolean, errorMessage: string | null)
   */
  validate(request: CommunicationRequest): [boolean, string | null];

  /**
   * Prepare the communication content using templates and data.
   * @param request The request containing template and data
   * @returns Prepared content ready for sending
   */
  prepareContent(request: CommunicationRequest): Promise<{
    subject?: string;
    body: string;
    htmlBody?: string;
    attachments?: Record<string, string>;
    contentType: string;
    encoding: 'base64' | 'binary' | 'text';
  }>;
}