/**
 * Example demonstrating the Site Visit Confirmation Communication flow:
 * Decision Event (DECISION.SiteVisitScheduled)
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
interface SiteVisitDecisionEvent {
  decisionId: string;
  decisionType: 'SiteVisitScheduled';
  propertyId: string;
  visitDate: string;
  visitTime: string;
  agentName: string;
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
 * Creates a communication request for site visit confirmation
 * based on a decision event.
 */
export function createSiteVisitConfirmationRequest(
  decisionEvent: SiteVisitDecisionEvent
): CommunicationRequest {
  // For appointment reminders, we typically use SMS or email
  const channel: CommunicationChannel = 'SMS'; // Using SMS for timely reminders

  // Create a recipient (would be the customer/lead)
  const recipient: CommunicationRecipient = {
    recipientId: `customer-${decisionEvent.propertyId}`,
    contact: '+15551234567', // In real system, this would come from customer data
    contactType: 'phone',
    name: 'Jane Smith', // Would come from customer data
    locale: 'en-US',
    timezone: 'America/Los_Angeles',
    optedOut: false,
    consentDate: '2026-01-20T14:22:00Z',
    consentMetadata: {
      consentType: 'explicit',
      method: 'online_form'
    },
    channelProperties: {
      prefersSMS: true,
      canReceiveMMS: true
    },
    metadata: {
      customerType: 'prospective_buyer',
      propertyInterest: decisionEvent.propertyId
    }
  };

  // Create template for the communication
  const template: CommunicationTemplate = {
    templateId: 'site-visit-confirm-v1',
    description: 'Site visit confirmation and reminder',
    name: 'Site Visit Confirmation',
    channel: channel,
    subject: undefined, // SMS doesn't typically have a subject
    body: `Property Visit Confirmed\n\nHi ${recipient.name},\n\nThis confirms your property visit:\nProperty ID: ${decisionEvent.propertyId}\nDate: ${decisionEvent.visitDate}\nTime: ${decisionEvent.visitTime}\nAgent: ${decisionEvent.agentName}\n\nPlease arrive 10 minutes early. Bring ID.\n\nReply STOP to cancel.`,
    alternativeBody: undefined, // SMS doesn't use HTML
    variables: [
      { name: 'recipient.name', type: 'STRING', required: true, description: 'Name of the recipient' },
      { name: 'decisionEvent.propertyId', type: 'STRING', required: true, description: 'ID of the property being visited' },
      { name: 'decisionEvent.visitDate', type: 'STRING', required: true, description: 'Date of the visit (YYYY-MM-DD)' },
      { name: 'decisionEvent.visitTime', type: 'STRING', required: true, description: 'Time of the visit (HH:MM)' },
      { name: 'decisionEvent.agentName', type: 'STRING', required: true, description: 'Name of the agent conducting the visit' }
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
    method: 'WEB_FORM',
    grantedAt: '2026-01-01T00:00:00Z',
    revocable: true,
    withdrawn: false,
    version: '1.0',
    blanketConsent: false,
    coveredTypes: ['SMS'],
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
    timezone: 'America/Los_Angeles',
    days: [0, 1, 2, 3, 4, 5, 6],
    allowUrgentOverride: false // Appointment reminders typically don't override quiet hours
  };

  const retryPolicy: RetryPolicy = {
    enabled: true,
    maxAttempts: 2,
    baseDelayMs: 5000,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
    jitter: true
  };

  // Calculate when to send the reminder (24 hours before appointment)
  const visitDateTime = new Date(`${decisionEvent.visitDate}T${decisionEvent.visitTime}`);
  const reminderTime = new Date(visitDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours before

  // Create the communication request
  const request: CommunicationRequest = {
    communicationId: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    decisionId: decisionEvent.decisionId,
    workspaceId: decisionEvent.workspaceId,
    correlationId: decisionEvent.correlationId,
    causationId: decisionEvent.causationId,
    channel: channel,
    recipients: [recipient],
    templateId: template.templateId,
    locale: 'en-US',
    priority: 'HIGH', // Appointment reminders are high priority
    scheduledAt: reminderTime.toISOString(),
    expiresAt: visitDateTime.toISOString(), // Expire at appointment time
    consent: consentPolicy,
    quietHoursPolicy: quietHoursPolicy,
    retryPolicy: retryPolicy,
    humanReviewRequired: false,
    trackDelivery: true,
    trackOpens: false, // SMS doesn't track opens
    trackClicks: false, // SMS doesn't track clicks
    channelConfig: {},
    isTest: false,
    metadata: {
      propertyId: decisionEvent.propertyId,
      visitDate: decisionEvent.visitDate,
      visitTime: decisionEvent.visitTime,
      agentName: decisionEvent.agentName
    }
  };

  return request;
}

/**
 * Simulates processing the communication request and returning a result.
 * In a real system, this would be handled by a CommunicationProcessor.
 */
export function processSiteVisitConfirmation(
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
            timestamp: new Date(Date.now() - 2000).toISOString(),
            provider: 'Twilio',
            messageId: 'SM1234567890abcdef',
            success: true
          }
        ],
        suppressed: false,
        retryCount: 0,
        metadata: {
          providerResponse: {
            status: 'delivered',
            timestamp: new Date().toISOString(),
            to: request.recipients[0].contact,
            from: '+15559876543'
          }
        }
      };

      resolve(result);
    }, 100);
  });
}

// Example usage (commented out to prevent compilation)
// async function example() {
//   // This would normally come from the decision engine
//   const decisionEvent: SiteVisitDecisionEvent = {

//     decisionId: 'dec-site-visit-20260730-001',
//     decisionType: 'SiteVisitScheduled',
//     propertyId: 'prop-789',
//     visitDate: '2026-08-01',
//     visitTime: '14:30',
//     agentName: 'Alex Johnson',
//     workspaceId: 'workspace-123',
//     correlationId: 'corr-site-visit-456',
//     causationId: 'dec-property-match-789',
//     confidence: 0.92,
//     rationale: 'Property matches customer criteria and agent is available at requested time.',
//     explanation: 'Based on customer preferences (3 bedrooms, 2 baths, under $500k) and availability, property #789 is an excellent match. Agent Johnson is available to show the property on August 1st at 2:30 PM.',
//     createdAt: '2026-07-30T09:00:00Z',
//     evaluatedAt: '2026-07-30T09:15:00Z'
//   };

//   // Create communication request from decision event
//   const request = createSiteVisitConfirmationRequest(decisionEvent);

//   // Process the communication request
//   const result = await processSiteVisitConfirmation(request);

//   console.log('Communication Request:', request);
//   console.log('Communication Result:', result);
// }

// example().catch(console.error);