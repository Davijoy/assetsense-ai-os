/**
 * Example demonstrating the Lead Qualification Follow-up Communication flow:
 * Decision Event (DECISION.LeadQualificationDetermined)
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
interface LeadQualificationDecisionEvent {
  decisionId: string;
  decisionType: 'LeadQualification';
  leadId: string;
  leadScore: number;
  recommendedAction: string;
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
 * Creates a communication request for lead qualification follow-up
 * based on a decision event.
 */
export function createLeadQualificationFollowupRequest(
  decisionEvent: LeadQualificationDecisionEvent
): CommunicationRequest {
  // Determine communication channel based on lead score and preferences
  const channel: CommunicationChannel = decisionEvent.leadScore >= 80
    ? 'EMAIL'
    : 'SMS';

  // Create a recipient based on lead information
  const recipient: CommunicationRecipient = {
    recipientId: `lead-${decisionEvent.leadId}`,
    contact: 'lead@example.com', // In real system, this would come from lead data
    contactType: 'email',
    name: 'John Doe', // Would come from lead data
    locale: 'en-US',
    timezone: 'America/New_York',
    optedOut: false,
    consentDate: '2026-01-15T10:30:00Z',
    consentMetadata: {
      consentType: 'explicit',
      method: 'web_form'
    },
    channelProperties: {
      emailFormat: 'html'
    },
    metadata: {
      leadSource: 'website_form',
      leadScore: decisionEvent.leadScore
    }
  };

  // Create template for the communication
  const template: CommunicationTemplate = {
    templateId: 'lead-followup-v1',
    description: 'Lead follow-up notification for qualified leads',
    name: 'Lead Follow-up Notification',
    channel: channel,
    subject: `Follow-up on your inquiry - Lead Score: ${decisionEvent.leadScore}`,
    body: `Hello ${recipient.name},

Thank you for your interest in our services. Based on your recent activity, we've scored your lead at ${decisionEvent.leadScore}/100.

${decisionEvent.recommendedAction}

Best regards,
Sales Team`,
    alternativeBody: `<h2>Hello ${recipient.name},</h2>
<p>Thank you for your interest in our services. Based on your recent activity, we've scored your lead at <strong>${decisionEvent.leadScore}/100</strong>.</p>
<p>${decisionEvent.recommendedAction.replace(/\n/g, '<br>')}</p>
<p>Best regards,<br>Sales Team</p>`,
    variables: [
      { name: 'recipient.name', type: 'STRING', required: true, description: 'Name of the recipient' },
      { name: 'decisionEvent.leadScore', type: 'NUMBER', required: true, description: 'Lead score (0-100)' },
      { name: 'decisionEvent.recommendedAction', type: 'STRING', required: true, description: 'Recommended action for follow-up' }
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
    days: [0, 1, 2, 3, 4, 5, 6], // All days
    allowUrgentOverride: decisionEvent.leadScore >= 80
  };

  const retryPolicy: RetryPolicy = {
    enabled: true,
    maxAttempts: 3,
    baseDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000,
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
    recipients: [recipient],
    templateId: template.templateId,
    locale: 'en-US',
    priority: decisionEvent.leadScore >= 80 ? 'HIGH' : 'MEDIUM',
    scheduledAt: new Date().toISOString(), // Send immediately
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expire in 24 hours
    consent: consentPolicy,
    quietHoursPolicy: quietHoursPolicy,
    retryPolicy: retryPolicy,
    humanReviewRequired: decisionEvent.leadScore < 50,
    trackDelivery: true,
    trackOpens: true,
    trackClicks: true,
    channelConfig: {},
    isTest: false,
    metadata: {
      leadScore: decisionEvent.leadScore,
      recommendedAction: decisionEvent.recommendedAction,
      decisionRationale: decisionEvent.rationale
    }
  };

  return request;
}

/**
 * Simulates processing the communication request and returning a result.
 * In a real system, this would be handled by a CommunicationProcessor.
 */
export function processLeadQualificationFollowup(
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
            timestamp: new Date(Date.now() - 1000).toISOString(),
            provider: 'SendGrid',
            messageId: 'sg_msg_1234567890',
            success: true
          }
        ],
        suppressed: false,
        retryCount: 0,
        metadata: {
          providerResponse: {
            status: 'delivered',
            timestamp: new Date().toISOString()
          }
        }
      };

      resolve(result);
    }, 100);
  });
}

// Example usage (commented out to prevent execution during compilation)
// async function example() {
//   // This would normally come from the decision engine
//   const decisionEvent: LeadQualificationDecisionEvent = {

//     decisionId: 'dec-lead-qual-20260730-001',
//     decisionType: 'LeadQualification',
//     leadId: 'lead-999',
//     leadScore: 85,
//     recommendedAction: 'Assign to senior sales representative for immediate follow-up\nPrepare personalized outreach sequence',
//     workspaceId: 'workspace-123',
//     correlationId: 'corr-lead-process-789',
//     causationId: 'int-lead-score-20260730-001',
//     confidence: 0.87,
//     rationale: 'Lead score of 85 indicates high intent and fit, warranting immediate sales engagement.',
//     explanation: 'Based on website engagement (10 visits), company size (250 employees), and complete contact information, the lead scoring model predicts an 85% likelihood of conversion within 90 days. This exceeds the threshold for immediate sales follow-up.',
//     createdAt: '2026-07-30T10:00:00Z',
//     evaluatedAt: '2026-07-30T10:15:00Z'
//   };

//   // Create communication request from decision event
//   const request = createLeadQualificationFollowupRequest(decisionEvent);

//   // Process the communication request
//   const result = await processLeadQualificationFollowup(request);

//   console.log('Communication Request:', request);
//   console.log('Communication Result:', result);
// }

// example().catch(console.error);