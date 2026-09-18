/**
 * Example demonstrating the Inventory Allocation Alert Communication flow:
 * Decision Event (DECISION.InventoryAllocationDetermined)
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
interface InventoryAllocationDecisionEvent {
  decisionId: string;
  decisionType: 'Inventory.Allocation';
  sku: string;
  productName: string;
  warehouseId: string;
  allocationQuantity: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
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
 * Creates a communication request for inventory allocation alert
 * based on a decision event.
 */
export function createInventoryAllocationAlertRequest(
  decisionEvent: InventoryAllocationDecisionEvent
): CommunicationRequest {
  // For inventory alerts, we might use email or in-app notifications
  // depending on urgency and recipient preferences
  const channel: CommunicationChannel =
    decisionEvent.urgency === 'critical' || decisionEvent.urgency === 'high'
      ? 'IN_APP_NOTIFICATION' // High urgency gets immediate in-app alert
      : 'EMAIL'; // Lower urgency can use email

  // Create recipients (would be warehouse managers, inventory specialists)
  const recipients: CommunicationRecipient[] = [
    {
      recipientId: `warehouse-mgr-${decisionEvent.warehouseId}`,
      contact: 'warehouse.manager@example.com',
      contactType: 'email',
      name: 'Warehouse Manager',
      locale: 'en-US',
      timezone: 'America/Chicago',
      optedOut: false,
      consentDate: '2026-01-10T09:15:00Z',
      consentMetadata: {
        consentType: 'explicit',
        method: 'hr_onboarding'
      },
      channelProperties: {
        emailFormat: 'html',
        priorityInbox: true
      },
      metadata: {
        role: 'warehouse_manager',
        warehouseId: decisionEvent.warehouseId,
        responsibilities: ['inventory_management', 'allocation_approval']
      }
    },
    {
      recipientId: `inv-specialist`,
      contact: 'inventory.specialist@example.com',
      contactType: 'email',
      name: 'Inventory Specialist',
      locale: 'en-US',
      timezone: 'America/Chicago',
      optedOut: false,
      consentDate: '2026-02-05T11:30:00Z',
      consentMetadata: {
        consentType: 'explicit',
        method: 'hr_onboarding'
      },
      channelProperties: {
        emailFormat: 'html'
      },
      metadata: {
        role: 'inventory_specialist',
        warehouseId: decisionEvent.warehouseId,
        responsibilities: ['stock_replenishment', 'cycle_counting']
      }
    }
  ];

  // Create template for the communication
  const template: CommunicationTemplate = {
    templateId: 'inventory-alert-v1',
    description: 'Inventory allocation alert',
    name: 'Inventory Allocation Alert',
    channel: channel,
    subject: `[${decisionEvent.urgency.toUpperCase()}] Inventory Allocation Required: ${decisionEvent.productName}`,
    body: `INVENTORY ALERT - ${decisionEvent.urgency.toUpperCase()} PRIORITY\n\n` +
          `Product: ${decisionEvent.productName} (SKU: ${decisionEvent.sku})\n` +
          `Warehouse: ${decisionEvent.warehouseId}\n` +
          `Action Required: Allocate ${decisionEvent.allocationQuantity} units\n` +
          `Urgency: ${decisionEvent.urgency.toUpperCase()}\n\n` +
          `${decisionEvent.explanation}\n\n` +
          `Please take action within ${decisionEvent.urgency === 'critical' ? '2 hours' : decisionEvent.urgency === 'high' ? '4 hours' : '1 business day'}.\n\n` +
          `Inventory Management System`,
    alternativeBody: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: ${decisionEvent.urgency === 'critical' ? '#d32f2f' : decisionEvent.urgency === 'high' ? '#f57c00' : '#1976d2'};">
        [${decisionEvent.urgency.toUpperCase()}] Inventory Allocation Required: ${decisionEvent.productName}
      </h2>
      <p><strong>INVENTORY ALERT - ${decisionEvent.urgency.toUpperCase()} PRIORITY</strong></p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td><strong>Product:</strong></td>
          <td>${decisionEvent.productName} (SKU: ${decisionEvent.sku})</td>
        </tr>
        <tr>
          <td><strong>Warehouse:</strong></td>
          <td>${decisionEvent.warehouseId}</td>
        </tr>
        <tr>
          <td><strong>Action Required:</strong></td>
          <td>Allocate ${decisionEvent.allocationQuantity} units</td>
        </tr>
        <tr>
          <td><strong>Urgency:</strong></td>
          <td>${decisionEvent.urgency.toUpperCase()}</td>
        </tr>
      </table>
      <p>${decisionEvent.explanation.replace(/\n/g, '<br>')}</p>
      <p><strong>Please take action within:</strong>
        ${decisionEvent.urgency === 'critical' ? '2 hours' : decisionEvent.urgency === 'high' ? '4 hours' : '1 business day'}
      </p>
      <hr>
      <p><small>Inventory Management System</small></p>
    </div>`,
    variables: [
      { name: 'decisionEvent.productName', type: 'STRING', required: true, description: 'Name of the product' },
      { name: 'decisionEvent.sku', type: 'STRING', required: true, description: 'SKU of the product' },
      { name: 'decisionEvent.warehouseId', type: 'STRING', required: true, description: 'ID of the warehouse' },
      { name: 'decisionEvent.allocationQuantity', type: 'NUMBER', required: true, description: 'Quantity to allocate' },
      { name: 'decisionEvent.urgency', type: 'STRING', required: true, description: 'Urgency level of the allocation' },
      { name: 'decisionEvent.explanation', type: 'STRING', required: true, description: 'Explanation of the allocation decision' }
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
    coveredTypes: [channel],
    geographicalRestriction: false,
    allowedJurisdictions: ['US'],
    language: 'en-US',
    recorded: true,
    consentRecordId: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };

  const quietHoursPolicy: QuietHoursPolicy = {
    enabled: true,
    startTime: '22:00',
    endTime: '06:00',
    timezone: 'America/Chicago',
    days: [0, 1, 2, 3, 4, 5, 6],
    allowUrgentOverride: decisionEvent.urgency === 'critical' // Critical alerts can override quiet hours
  };

  const retryPolicy: RetryPolicy = {
    enabled: true,
    maxAttempts: channel === 'EMAIL' ? 3 : 5, // More retries for in-app notifications
    baseDelayMs: channel === 'EMAIL' ? 5000 : 1000,
    backoffMultiplier: 2,
    maxDelayMs: channel === 'EMAIL' ? 300000 : 30000, // 5 minutes for email, 30 seconds for in-app
    jitter: true
  };

  // Determine timing based on urgency
  let delayMs = 0;
  switch (decisionEvent.urgency) {
    case 'critical':
      delayMs = 0; // Send immediately
      break;
    case 'high':
      delayMs = 5 * 60 * 1000; // 5 minutes
      break;
    case 'medium':
      delayMs = 30 * 60 * 1000; // 30 minutes
      break;
    case 'low':
      delayMs = 2 * 60 * 60 * 1000; // 2 hours
      break;
  }

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
      decisionEvent.urgency === 'critical' ? 'CRITICAL' :
      decisionEvent.urgency === 'high' ? 'HIGH' :
      decisionEvent.urgency === 'medium' ? 'MEDIUM' : 'LOW',
    scheduledAt: new Date(Date.now() + delayMs).toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expire in 24 hours
    consent: consentPolicy,
    quietHoursPolicy: quietHoursPolicy,
    retryPolicy: retryPolicy,
    humanReviewRequired: decisionEvent.urgency === 'low', // Low urgency alerts might need review
    trackDelivery: true,
    trackOpens: true,
    trackClicks: channel === 'EMAIL' ? true : false, // Only track clicks for email
    channelConfig: {},
    isTest: false,
    metadata: {
      sku: decisionEvent.sku,
      productName: decisionEvent.productName,
      warehouseId: decisionEvent.warehouseId,
      allocationQuantity: decisionEvent.allocationQuantity,
      urgency: decisionEvent.urgency,
      confidence: decisionEvent.confidence
    }
  };

  return request;
}

/**
 * Simulates processing the communication request and returning a result.
 * In a real system, this would be handled by a CommunicationProcessor.
 */
export function processInventoryAllocationAlert(
  request: CommunicationRequest
): Promise<CommunicationResult> {
  return new Promise((resolve) => {
    // Simulate processing delay
    setTimeout(() => {
      // Determine if this was successful based on channel
      const isEmail = request.channel === 'EMAIL';
      const isInApp = request.channel === 'IN_APP_NOTIFICATION';

      const result: CommunicationResult = {
        communicationId: request.communicationId,
        status: 'DELIVERED',
        timestamp: new Date().toISOString(),
        attempts: [
          {
            timestamp: new Date(Date.now() - 500).toISOString(),
            provider: isEmail ? 'SES' : 'Internal Notification Service',
            messageId: isEmail
              ? `ses-${Math.random().toString(36).substr(2, 9)}`
              : `ias-${Math.random().toString(36).substr(2, 9)}`,
            success: true
          }
        ],
        suppressed: false,
        retryCount: 0,
        metadata: {
          providerResponse: {
            status: 'delivered',
            timestamp: new Date().toISOString(),
            recipientCount: request.recipients.length,
            channel: request.channel
          }
        }
      };

      // Simulate occasional failure for demonstration
      if (Math.random() < 0.1) { // 10% failure rate
        result.status = 'FAILED';
        result.attempts[0].success = false;
        result.attempts[0].error = 'Service temporarily unavailable';
        result.error = 'Failed to send notification after all retry attempts';
      }

      resolve(result);
    }, 100);
  });
}

// Example usage (commented out to prevent compilation)
// async function example() {
//   // This would normally come from the decision engine
//   const decisionEvent: InventoryAllocationDecisionEvent = {

//     decisionId: 'dec-inv-alloc-20260730-001',
//     decisionType: 'Inventory.Allocation',
//     sku: 'SKU-7890',
//     productName: 'Wireless Headphones Pro',
//     warehouseId: 'WH-03',
//     allocationQuantity: 150,
//     urgency: 'high',
//     workspaceId: 'workspace-123',
//     correlationId: 'corr-inv-process-456',
//     causationId: 'int-inventory-alert-789',
//     confidence: 0.88,
//     rationale: 'Current stock (25 units) is below reorder point (100 units) with high sales velocity.',
//     explanation: 'Inventory levels for SKU-7890 have dropped to 25 units, which is below the reorder point of 100 units. Based on current sales velocity of 15 units/day, stockout is projected in 2 days. Immediate allocation of 150 units from regional distribution center is recommended to prevent stockout.',
//     createdAt: '2026-07-30T10:30:00Z',
//     evaluatedAt: '2026-07-30T10:45:00Z'
//   };

//   // Create communication request from decision event
//   const request = createInventoryAllocationAlertRequest(decisionEvent);

//   // Process the communication request
//   const result = await processInventoryAllocationAlert(request);

//   console.log('Communication Request:', request);
//   console.log('Communication Result:', result);
// }

// example().catch(console.error);