/**
 * Example demonstrating the Pricing Approval Notification Communication flow:
 * Decision Event (DECISION.PricingAdjustmentRecommended)
 * -> Communication Request
 * -> Communication Result
 */

import { CommunicationRequest } from '../shared/communication-request';
import { CommunicationResult } from '../shared/communication-result';
import { CommunicationChannel } from '../shared/communication-channel';
import { CommunicationPriority } from '../shared/communication-priority';
import { CommunicationStatus } from '../shared/communication-status';
import { CommunicationRecipient } from '../shared/communication-recipient';
import { CommunicationTemplate } from '../shared/communication-template';
import { ConsentPolicy } from '../shared/consent-policy';
import { QuietHoursPolicy } from '../shared/quiet-hours-policy';
import { RetryPolicy } from '../shared/retry-policy';

/**
 * Example decision event that would trigger this communication
 */
interface PricingAdjustmentDecisionEvent {
  decisionId: string;
  decisionType: 'PricingAdjustment';
  sku: string;
  productName: string;
  currentPrice: number;
  recommendedPrice: number;
  priceChangePercent: number;
  expectedImpact: string;
  workspaceId: string;
  correlationId: string;
  causationId: string;
  confidence: number;
  rationale: string;
  explanation: string;
  createdAt: string;
  evaluatedAt: string;
}

/**
 * Creates a communication request for pricing approval notification
 * based on a decision event.
 */
export function createPricingApprovalNotificationRequest(
  decisionEvent: PricingAdjustmentDecisionEvent
): CommunicationRequest {
  // Pricing approvals typically go to sales/marketing managers via email
  const channel: CommunicationChannel = 'EMAIL';

  // Create recipients (would be sales/marketing managers, pricing analysts)
  const recipients: CommunicationRecipient[] = [
    {
      recipientId: `sales-mgr-region-${decisionEvent.sku.substring(0, 2)}`,
      contact: 'sales.manager@example.com',
      contactType: 'email',
      name: 'Sales Manager',
      locale: 'en-US',
      timezone: 'America/New_York',
      optedOut: false,
      consentDate: '2026-01-15T08:30:00Z',
      consentMetadata: {
        consentType: 'explicit',
        method: 'corporate_policy'
      },
      channelProperties: {
        emailFormat: 'html',
        priorityInbox: true
      },
      metadata: {
        role: 'sales_manager',
        region: decisionEvent.sku.substring(0, 2),
        responsibilities: ['pricing_approval', 'sales_performance']
      }
    },
    {
      recipientId: `pricing-analyst-${decisionEvent.sku.substring(0, 2)}`,
      contact: 'pricing.analyst@example.com',
      contactType: 'email',
      name: 'Pricing Analyst',
      locale: 'en-US',
      timezone: 'America/New_York',
      optedOut: false,
      consentDate: '2026-02-01T10:15:00Z',
      consentMetadata: {
        consentType: 'explicit',
        method: 'hr_onboarding'
      },
      channelProperties: {
        emailFormat: 'html'
      },
      metadata: {
        role: 'pricing_analyst',
        region: decisionEvent.sku.substring(0, 2),
        responsibilities: ['price_analysis', 'competitive_intelligence']
      }
    }
  ];

  // Create template for the communication
  const template: CommunicationTemplate = {
    templateId: 'pricing-approval-v1',
    description: 'Pricing adjustment approval request',
    name: 'Pricing Approval Notification',
    channel: channel,
    subject: `Pricing Approval Required: ${decisionEvent.productName} (${decisionEvent.priceChangePercent >= 0 ? '+' : ''}${decisionEvent.priceChangePercent}%)`,
    body: `PRICING APPROVAL REQUEST\n\n` +
          `Product: ${decisionEvent.productName} (SKU: ${decisionEvent.sku})\n` +
          `Current Price: $${decisionEvent.currentPrice.toFixed(2)}\n` +
          `Recommended Price: $${decisionEvent.recommendedPrice.toFixed(2)}\n` +
          `Change: ${decisionEvent.priceChangePercent >= 0 ? '+' : ''}${decisionEvent.priceChangePercent}% ($${(decisionEvent.recommendedPrice - decisionEvent.currentPrice).toFixed(2)})\n` +
          `Expected Impact: ${decisionEvent.expectedImpact}\n\n` +
          `${decisionEvent.explanation}\n\n` +
          `Please review and approve/reject this pricing change by ${new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleDateString()}.\n\n` +
          `Pricing Management System`,
    alternativeBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; border-left: 4px solid #1976d2; padding-left: 20px;">
      <h2>Pricing Approval Required</h2>
      <p><strong>Product:</strong> ${decisionEvent.productName} (SKU: ${decisionEvent.sku})</p>
      <p><strong>Current Price:</strong> $${decisionEvent.currentPrice.toFixed(2)}</p>
      <p><strong>Recommended Price:</strong> $${decisionEvent.recommendedPrice.toFixed(2)}</p>
      <p><strong>Change:</strong> <span style="color: ${decisionEvent.priceChangePercent >= 0 ? '#388e3c' : '#d32f2f'};">
        ${decisionEvent.priceChangePercent >= 0 ? '+' : ''}${decisionEvent.priceChangePercent}% ($${(decisionEvent.recommendedPrice - decisionEvent.currentPrice).toFixed(2)})
      </span></p>
      <p><strong>Expected Impact:</strong> ${decisionEvent.expectedImpact}</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p><strong>Explanation:</strong></p>
        <p>${decisionEvent.explanation.replace(/\n/g, '<br>')}</p>
      </div>
      <p><strong>Please review and approve/reject this pricing change by:</strong>
        ${new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleDateString()} at ${new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleTimeString()}
      </p>
      <hr>
      <p><small>Pricing Management System</small></p>
    </div>`,
    variables: [
      { name: 'decisionEvent.productName', type: 'STRING', required: true, description: 'Name of the product' },
      { name: 'decisionEvent.sku', type: 'STRING', required: true, description: 'SKU of the product' },
      { name: 'decisionEvent.currentPrice', type: 'NUMBER', required: true, description: 'Current price of the product' },
      { name: 'decisionEvent.recommendedPrice', type: 'NUMBER', required: true, description: 'Recommended price of the product' },
      { name: 'decisionEvent.priceChangePercent', type: 'NUMBER', required: true, description: 'Percentage change in price' },
      { name: 'decisionEvent.expectedImpact', type: 'STRING', required: true, description: 'Expected impact of the price change' },
      { name: 'decisionEvent.explanation', type: 'STRING', required: true, description: 'Explanation of the price change recommendation' }
    ],
    locales: ['en-US'],
    fallbackLocale: 'en-US',
    version: '1.0',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isActive: true,
    engine: 'RAW' as const,
    defaults: {},
    localized: false,
    approved: true,
    createdBy: 'system',
    updatedBy: 'system'
  };

  // Create policies
  const consentPolicy: ConsentPolicy = {
    required: true,
    type: 'EXPRESS',
    method: 'OTHER',
    grantedAt: '2026-01-01T00:00:00Z',
    revocable: true,
    withdrawn: false,
    version: '1.0',
    blanketConsent: false,
    coveredTypes: ['EMAIL'],
    geographicalRestriction: false,
    allowedJurisdictions: ['US'],
    language: 'en-US',
    recorded: true,
    consentRecordId: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };

  const quietHoursPolicy: QuietHoursPolicy = {
    enabled: true,
    startTime: '20:00',
    endTime: '08:00',
    timezone: 'America/New_York',
    days: [0, 1, 2, 3, 4, 5, 6],
    allowUrgentOverride: Math.abs(decisionEvent.priceChangePercent) > 20 // Large price changes can override quiet hours
  };

  const retryPolicy: RetryPolicy = {
    enabled: true,
    maxAttempts: 3,
    baseDelayMs: 5000,
    backoffMultiplier: 2,
    maxDelayMs: 300000,
    jitter: true
  };

  // Create the communication request
  const request: CommunicationRequest = {
    communicationId: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    decisionId: decisionEvent.decisionId,
    workspaceId: decisionEvent.workspaceId,
    correlationId: decisionEvent.correlationId,
    causationId: decisionEvent.causationId,
    channel: channel,
    recipients: recipients,
    templateId: template.templateId,
    locale: 'en-US',
    priority:
      Math.abs(decisionEvent.priceChangePercent) > 25 ? 'HIGH' :
      Math.abs(decisionEvent.priceChangePercent) > 10 ? 'MEDIUM' : 'LOW',
    scheduledAt: new Date().toISOString(), // Send immediately for review
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expire in 1 week
    consent: consentPolicy,
    quietHoursPolicy: quietHoursPolicy,
    retryPolicy: retryPolicy,
    humanReviewRequired: true, // Pricing decisions always require human review
    trackDelivery: true,
    trackOpens: true,
    trackClicks: true,
    channelConfig: {},
    isTest: false,
    metadata: {
      sku: decisionEvent.sku,
      productName: decisionEvent.productName,
      currentPrice: decisionEvent.currentPrice,
      recommendedPrice: decisionEvent.recommendedPrice,
      priceChangePercent: decisionEvent.priceChangePercent,
      expectedImpact: decisionEvent.expectedImpact,
      confidence: decisionEvent.confidence
    }
  };

  return request;
}

/**
 * Simulates processing the communication request and returning a result.
 * In a real system, this would be handled by a CommunicationProcessor.
 */
export function processPricingApprovalNotification(
  request: CommunicationRequest
): Promise<CommunicationResult> {
  return new Promise((resolve) => {
    // Simulate processing delay
    setTimeout(() => {
      const result: CommunicationResult = {
        communicationId: request.communicationId,
        status: 'DELIVERED',
        timestamp: new Date().toISOString(),
        attempts: [
          {
            timestamp: new Date(Date.now() - 800).toISOString(),
            provider: 'Microsoft 365',
            messageId: '<msg1234567890.company.com>',
            success: true
          }
        ],
        suppressed: false,
        retryCount: 0,
        metadata: {
          providerResponse: {
            status: 'delivered',
            timestamp: new Date().toISOString(),
            recipientCount: request.recipients.length
          }
        }
      };

      // Simulate occasional failure for demonstration
      if (Math.random() < 0.05) { // 5% failure rate
        result.status = 'FAILED';
        result.attempts[0].success = false;
        result.attempts[0].error = 'Mailbox temporarily unavailable';
        result.error = 'Failed to deliver after all retry attempts';
      }

      resolve(result);
    }, 100);
  });
}

// Example usage (commented out to prevent compilation)
// async function example() {
//   // This would normally come from the decision engine
//   const decisionEvent: PricingAdjustmentDecisionEvent = {

//     decisionId: 'dec-price-approve-20260730-001',
//     decisionType: 'PricingAdjustment',
//     sku: 'SKU-4560',
//     productName: 'Bluetooth Speaker X200',
//     currentPrice: 89.99,
//     recommendedPrice: 79.99,
//     priceChangePercent: -11.11,
//     expectedImpact: 'Expected 15% increase in unit sales, 5% increase in revenue',
//     workspaceId: 'workspace-123',
//     correlationId: 'corr-price-process-789',
//     causationId: 'int-pricing-opportunity-123',
//     confidence: 0.82,
//     rationale: 'Competitive analysis shows similar products priced 10-15% lower. Price elasticity indicates demand increase would offset margin decrease.',
//     explanation: 'Market analysis reveals that Competitor A and B are offering similar Bluetooth speakers at $79-$84. Our current price of $89.99 is above market average. Price elasticity modeling suggests that reducing price to $79.99 would increase unit sales by approximately 15%, resulting in a net revenue increase of 5% despite the lower margin per unit.',
//     createdAt: '2026-07-30T11:00:00Z',
//     evaluatedAt: '2026-07-30T11:20:00Z'
//   };

//   // Create communication request from decision event
//   const request = createPricingApprovalNotificationRequest(decisionEvent);

//   // Process the communication request
//   const result = await processPricingApprovalNotification(request);

//   console.log('Communication Request:', request);
//   console.log('Communication Result:', result);
// }

// example().catch(console.error);