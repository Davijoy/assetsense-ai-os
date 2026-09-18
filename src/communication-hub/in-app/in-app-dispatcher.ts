/**
 * In-App Communication Dispatcher
 *
 * Implements the CommunicationDispatcher contract to route inventory
 * intelligence communications through registered processors.
 */

import type { CommunicationDispatcher } from '../shared/communication-dispatcher';
import type { CommunicationRequest } from '../shared/communication-request';
import type { CommunicationResult } from '../shared/communication-result';
import type { CommunicationProcessor } from '../shared/communication-processor';
import { InAppNotificationProcessor } from './in-app-processor';

export class InAppDispatcher implements CommunicationDispatcher {
  private processors: Map<string, CommunicationProcessor> = new Map();

  constructor() {
    const inApp = new InAppNotificationProcessor();
    this.processors.set(inApp.getProviderName(), inApp);
  }

  async dispatch(request: CommunicationRequest): Promise<CommunicationResult> {
    const [allowed, reason] = this.checkPolicies(request);
    if (!allowed) {
      return {
        communicationId: request.communicationId,
        status: 'SUPPRESSED',
        timestamp: new Date().toISOString(),
        attempts: [],
        suppressed: true,
        suppressionReason: reason ?? 'Policy violation',
        retryCount: 0,
        metadata: { reason: reason ?? 'Policy violation' },
      };
    }

    for (const processor of this.processors.values()) {
      const supported = processor.getSupportedTypes();
      if (supported.includes(request.channel)) {
        return processor.process(request);
      }
    }

    return {
      communicationId: request.communicationId,
      status: 'FAILED',
      timestamp: new Date().toISOString(),
      attempts: [],
      suppressed: false,
      error: `No processor registered for channel: ${request.channel}`,
      retryCount: 0,
      metadata: { channel: request.channel },
    };
  }

  registerProcessor(processor: CommunicationProcessor): void {
    this.processors.set(processor.getProviderName(), processor);
  }

  unregisterProcessor(processorName: string): void {
    this.processors.delete(processorName);
  }

  getProcessors(): CommunicationProcessor[] {
    return Array.from(this.processors.values());
  }

  checkPolicies(request: CommunicationRequest): [boolean, string | null] {
    for (const recipient of request.recipients) {
      if (recipient.optedOut) {
        return [false, `Recipient ${recipient.recipientId} has opted out`];
      }
    }

    if (request.consent.required && request.consent.withdrawn) {
      return [false, 'Consent has been withdrawn'];
    }

    return [true, null];
  }
}
