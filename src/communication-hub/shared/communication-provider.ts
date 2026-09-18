import { CommunicationChannel } from './communication-channel';
import { CommunicationRequest } from './communication-request';
import { CommunicationResult } from './communication-result';

/**
 * Represents a communication provider (abstract interface).
 * Actual providers (email, SMS, etc.) would implement this interface.
 */
export interface CommunicationProvider {
  /** Unique identifier for the provider */
  providerId: string;

  /** Name of the provider */
  name: string;

  /** Channels this provider supports */
  supportedChannels: CommunicationChannel[];

  /** Whether the provider is currently active/available */
  isActive: boolean;

  /**
   * Send a communication using this provider.
   * @param request The communication request to send
   * @returns Promise resolving to the result of the send operation
   */
  send(request: CommunicationRequest): Promise<CommunicationResult>;

  /**
   * Check if the provider can handle a specific request.
   * @param request The communication request to check
   * @returns Boolean indicating if the provider can handle the request
   */
  canHandle(request: CommunicationRequest): boolean;

  /**
   * Get the current status/health of the provider.
   * @returns Promise resolving to the provider status
   */
  getStatus(): Promise<ProviderStatus>;

  /**
   * Get metadata about the provider.
   * @returns Provider metadata
   */
  getMetadata(): ProviderMetadata;
}

/**
 * Status of a communication provider.
 */
export interface ProviderStatus {
  /** Whether the provider is operational */
  operational: boolean;

  /** Current status message */
  status: string;

  /** Timestamp of last health check */
  lastChecked: string;

  /** Any error information */
  error?: string;

  /** Current load/usage metrics */
  metrics: Record<string, unknown>;
}

/**
 * Metadata about a communication provider.
 */
export interface ProviderMetadata {
  /** Provider version */
  version: string;

  /** Provider capabilities */
  capabilities: string[];

  /** Configuration parameters */
  configuration: Record<string, unknown>;

  /** Supported regions/targets */
  supportedRegions: string[];

  /** Rate limits */
  rateLimits: {
    requestsPerSecond: number;
    burstLimit: number;
  };

  /** Cost information */
  cost: {
    currency: string;
    perMessage: number;
    monthlyFee?: number;
  };
}