import { CommunicationRequest } from './communication-request';
import { CommunicationResult } from './communication-result';
import { CommunicationProcessor } from './communication-processor';
import { CommunicationStatus } from './communication-status';
import { ConsentPolicy } from './consent-policy';
import { QuietHoursPolicy } from './quiet-hours-policy';

/**
 * Dispatches communication requests to appropriate processors.
 * Handles routing, policy enforcement, and lifecycle management.
 */
export interface CommunicationDispatcher {
  /**
   * Dispatch a communication request for processing.
   * @param request The communication request to dispatch
   * @returns Promise resolving to the communication result
   */
  dispatch(request: CommunicationRequest): Promise<CommunicationResult>;

  /**
   * Register a communication processor for handling specific types.
   * @param processor The processor to register
   */
  registerProcessor(processor: CommunicationProcessor): void;

  /**
   * Unregister a communication processor.
   * @param processorName The name of the processor to remove
   */
  unregisterProcessor(processorName: string): void;

  /**
   * Get all registered processors.
   * @returns Array of registered processors
   */
  getProcessors(): CommunicationProcessor[];

  /**
   * Check if a communication can be sent based on policies.
   * @param request The communication request to check
   * @returns Tuple of (allowed: boolean, reason: string | null)
   */
  checkPolicies(request: CommunicationRequest): [boolean, string | null];
}