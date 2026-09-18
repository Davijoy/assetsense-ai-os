/**
 * Example demonstrating the Executive Escalation Communication flow:
 * Decision Event (DECISION.ExecutiveEscalationApproved)
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
interface ExecutiveEscalationDecisionEvent {
  decisionId: string;
  decisionType: 'ExecutiveEscalation';
  incidentId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  financialImpact: number;
  affectedSystems: string[];
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
 * Creates a communication request for executive escalation
 * based on a decision event.
 */
export function createExecutiveEscalationRequest(
  decisionEvent: ExecutiveEscalationDecisionEvent
): CommunicationRequest {
  // Executive alerts use multiple channels based on severity
  let channels: CommunicationChannel[] = ['EMAIL']; // Always email for record

  if (decisionEvent.severity === 'critical' || decisionEvent.severity === 'high') {
    channels.push('SMS'); // Add SMS for urgent alerts
  }

  if (decisionEvent.severity === 'critical') {
    channels.push('VOICE_CALL'); // Add voice call for critical issues
  }

  // Create executives as recipients
  const recipients: CommunicationRecipient[] = [
    {
      recipientId: 'exec-ceo-001',
      contact: 'ceo@example.com',
      contactType: 'email',
      name: 'Chief Executive Officer',
      locale: 'en-US',
      timezone: 'America/New_York',
      optedOut: false,
      consentDate: '2025-01-15T09:00:00Z',
      consentMetadata: {
        consentType: 'implied',
        basis: 'employment_agreement'
      },
      channelProperties: {
        emailFormat: 'html',
        priority: 'high',
        markedAsImportant: true
      },
      metadata: {
        title: 'CEO',
        department: 'executive',
        escalationLevel: 'level_1'
      }
    },
    {
      recipientId: 'exec-cfo-002',
      contact: 'cfo@example.com',
      contactType: 'email',
      name: 'Chief Financial Officer',
      locale: 'en-US',
      timezone: 'America/New_York',
      optedOut: false,
      consentDate: '2025-02-20T10:30:00Z',
      consentMetadata: {
        consentType: 'implied',
        basis: 'employment_agreement'
      },
      channelProperties: {
        emailFormat: 'html',
        priority: 'high'
      },
      metadata: {
        title: 'CFO',
        department: 'finance',
        escalationLevel: 'level_1'
      }
    }
  ];

  // Add SMS contacts if needed
  if (decisionEvent.severity === 'critical' || decisionEvent.severity === 'high') {
    recipients.push(
      {
        recipientId: 'exec-ceo-001-sms',
        contact: '+15551112222',
        contactType: 'phone',
        name: 'Chief Executive Officer',
        locale: 'en-US',
        timezone: 'America/New_York',
        optedOut: false,
        consentDate: '2025-03-10T14:15:00Z',
        consentMetadata: {
          consentType: 'explicit',
          method: 'mobile_device_registration'
        },
        channelProperties: {
          canReceiveSMS: true,
          canReceiveMMS: true
        },
        metadata: {
          title: 'CEO',
          department: 'executive',
          escalationLevel: 'level_1',
          contactMethod: 'sms'
        }
      }
    );
  }

  // Determine primary channel (highest priority based on severity)
  const primaryChannel: CommunicationChannel =
    decisionEvent.severity === 'critical' ? 'VOICE_CALL' :
    decisionEvent.severity === 'high' ? 'SMS' :
    'EMAIL';

  // Create template for the communication
  const template: CommunicationTemplate = {
    templateId: 'executive-escalation-v1',
    description: 'Executive escalation alert for critical incidents',
    name: 'Executive Escalation Alert',
    channel: primaryChannel, // This is the primary channel, but we'll send via multiple
    subject: `[${decisionEvent.severity.toUpperCase()}] Executive Alert: Incident ${decisionEvent.incidentId}`,
    body: `EXECUTIVE ESCALATION ALERT\n\n` +
          `Incident ID: ${decisionEvent.incidentId}\n` +
          `Severity: ${decisionEvent.severity.toUpperCase()}\n` +
          `Financial Impact: $${decisionEvent.financialImpact.toLocaleString()}\n` +
          `Affected Systems: ${decisionEvent.affectedSystems.join(', ')}\n` +
          `Detection Time: ${new Date().toISOString()}\n\n` +
          `RECOMMENDED ACTION:\n${decisionEvent.recommendedAction}\n\n` +
          `DETAILS:\n${decisionEvent.explanation}\n\n` +
          `This is an automated alert from the Incident Management System.\n` +
          `Please respond via the command center or contact the on-call engineer immediately.\n\n` +
          `Runbook: INCIDENT-RUN-${decisionEvent.severity.toUpperCase()}`,
    alternativeBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; border-left: 4px solid ${getSeverityColor(decisionEvent.severity)}; padding-left: 20px;">
      <h2 style="color: ${getSeverityColor(decisionEvent.severity)};">Executive Escalation Alert</h2>
      <p><strong>Incident ID:</strong> ${decisionEvent.incidentId}</p>
      <p><strong>Severity:</strong> <span style="color: ${getSeverityColor(decisionEvent.severity)}; font-weight: bold;">${decisionEvent.severity.toUpperCase()}</span></p>
      <p><strong>Financial Impact:</strong> $${decisionEvent.financialImpact.toLocaleString()}</p>
      <p><strong>Affected Systems:</strong> ${decisionEvent.affectedSystems.join(', ')}</p>
      <p><strong>Detection Time:</strong> ${new Date().toISOString()}</p>

      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <h3>Recommended Action</h3>
        <p>${decisionEvent.recommendedAction.replace(/\n/g, '<br>')}</p>
      </div>

      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <h3>Details</h3>
        <p>${decisionEvent.explanation.replace(/\n/g, '<br>')}</p>
      </div>

      <hr>
      <p><em>This is an automated alert from the Incident Management System.</em></p>
      <p><em>Please respond via the command center or contact the on-call engineer immediately.</em></p>
      <p><strong>Runbook:</strong> INCIDENT-RUN-${decisionEvent.severity.toUpperCase()}</p>
    </div>`,
    variables: [
      { name: 'decisionEvent.incidentId', type: 'STRING', required: true, description: 'Unique identifier for the incident' },
      { name: 'decisionEvent.severity', type: 'STRING', required: true, description: 'Severity level of the incident' },
      { name: 'decisionEvent.financialImpact', type: 'NUMBER', required: true, description: 'Estimated financial impact of the incident' },
      { name: 'decisionEvent.affectedSystems', type: 'ARRAY', required: true, description: 'List of systems affected by the incident' },
      { name: 'decisionEvent.recommendedAction', type: 'STRING', required: true, description: 'Recommended action to address the incident' },
      { name: 'decisionEvent.explanation', type: 'STRING', required: true, description: 'Detailed explanation of the incident' }
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
    required: false, // Executive communications often fall under implied consent for business purposes
    type: 'IMPLIED',
    method: 'VERBAL',
    grantedAt: new Date().toISOString(),
    revocable: true,
    withdrawn: false,
    version: '1.0',
    blanketConsent: false,
    coveredTypes: ['EMAIL', 'SMS', 'VOICE_CALL'],
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
    timezone: 'America/New_York',
    days: [0, 1, 2, 3, 4, 5, 6],
    allowUrgentOverride: true // Executive alerts always override quiet hours
  };

  const retryPolicy: RetryPolicy = {
    enabled: true,
    maxAttempts: 5, // More attempts for critical alerts
    baseDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
    jitter: true
  };

  // Determine send time based on severity
  let scheduledAt = new Date().toISOString(); // Default: immediate

  // For lower severity during business hours, we might delay until next business hour
  if (decisionEvent.severity === 'low' || decisionEvent.severity === 'medium') {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    // If outside business hours (8am-6pm, Mon-Fri), schedule for next business day
    if (day === 0 || day === 6 || hour < 8 || hour >= 18) {
      // Calculate next business day at 9am
      let nextBusinessDay = new Date(now);
      if (day === 0) { // Sunday
        nextBusinessDay.setDate(nextBusinessDay.getDate() + 1); // Monday
      } else if (day === 6) { // Saturday
        nextBusinessDay.setDate(nextBusinessDay.getDate() + 2); // Monday
      } else if (hour >= 18) { // After 6pm
        nextBusinessDay.setDate(nextBusinessDay.getDate() + 1); // Tomorrow
      }

      nextBusinessDay.setHours(9, 0, 0, 0); // 9:00 AM
      scheduledAt = nextBusinessDay.toISOString();
    }
  }

  // Create the communication request
  const request: CommunicationRequest = {
    communicationId: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    decisionId: decisionEvent.decisionId,
    workspaceId: decisionEvent.workspaceId,
    correlationId: decisionEvent.correlationId,
    causationId: decisionEvent.causationId,
    channel: primaryChannel, // This is the primary channel for tracking purposes
    recipients: recipients,
    templateId: template.templateId,
    locale: 'en-US',
    priority:
      decisionEvent.severity === 'critical' ? 'CRITICAL' :
      decisionEvent.severity === 'high' ? 'HIGH' :
      decisionEvent.severity === 'medium' ? 'MEDIUM' : 'LOW',
    scheduledAt: scheduledAt,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expire in 24 hours
    consent: consentPolicy,
    quietHoursPolicy: quietHoursPolicy,
    retryPolicy: retryPolicy,
    humanReviewRequired: false, // Alerts are sent automatically, action is taken by recipients
    trackDelivery: true,
    trackOpens: true,
    trackClicks: false, // Not applicable for voice/SMS
    channelConfig: {},
    isTest: false,
    metadata: {
      incidentId: decisionEvent.incidentId,
      severity: decisionEvent.severity,
      financialImpact: decisionEvent.financialImpact,
      affectedSystems: decisionEvent.affectedSystems,
      recommendedAction: decisionEvent.recommendedAction
    }
  };

  return request;
}

// Helper function to get color based on severity
function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical': return '#d32f2f';
    case 'high':     return '#f57c00';
    case 'medium':   return '#fbc02d';
    case 'low':      return '#388e3c';
    default:         return '#757575';
  }
}

/**
 * Simulates processing the communication request and returning a result.
 * In a real system, this would be handled by a CommunicationProcessor.
 */
export function processExecutiveEscalation(
  request: CommunicationRequest
): Promise<CommunicationResult> {
  return new Promise((resolve) => {
    // Simulate processing delay
    setTimeout(() => {
      const result: CommunicationResult = {
        communicationId: request.communicationId,
        status: 'DELIVERED',
        timestamp: new Date().toISOString(),
        attempts: [],
        suppressed: false,
        retryCount: 0,
        metadata: {}
      };

      // Simulate delivery attempts for each channel/type
      // In reality, this would be handled by multiple processors
      const baseTime = Date.now() - 1000;

      // Email attempt
      result.attempts.push({
        timestamp: new Date(baseTime).toISOString(),
        provider: 'Microsoft Exchange',
        messageId: '<exch1234567890@company.com>',
        success: true
      });

      // SMS attempt (if applicable)
      const hasSMS = request.recipients.some(r => r.contactType === 'phone');
      if (hasSMS) {
        result.attempts.push({
          timestamp: new Date(baseTime + 500).toISOString(),
          provider: 'Twilio',
          messageId: 'SM1234567890abcdef',
          success: true
        });
      }

      // Determine overall status based on individual attempts
      const allSuccessful = result.attempts.every(attempt => attempt.success);
      const anySuccessful = result.attempts.some(attempt => attempt.success);

      if (allSuccessful) {
        result.status = 'DELIVERED';
      } else if (anySuccessful) {
        // Partially delivered - at least one attempt succeeded
        result.status = 'DELIVERED';
      } else {
        result.status = 'FAILED';
        result.error = 'All delivery attempts failed';
      }

      // Add metadata
      result.metadata = {
        deliverySummary: {
          totalAttempts: result.attempts.length,
          successfulAttempts: result.attempts.filter(a => a.success).length
        },
        providerResponse: {
          timestamp: new Date().toISOString(),
          deliveryMethod: 'multi_channel'
        }
      };

      // Simulate rare failure for demonstration
      if (Math.random() < 0.02) { // 2% failure rate
        result.status = 'FAILED';
        result.error = 'System outage prevented delivery';
      }

      resolve(result);
    }, 100);
  });
}

// Example usage (commented out to prevent compilation)
// async function example() {
//   // This would normally come from the decision engine
//   const decisionEvent: ExecutiveEscalationDecisionEvent = {

//     decisionId: 'dec-exec-escalate-20260730-001',
//     decisionType: 'ExecutiveEscalation',
//     incidentId: 'INC-20260730-00789',
//     severity: 'high',
//     financialImpact: 2500000,
//     affectedSystems: ['payment-processing', 'customer-portal', 'api-gateway'],
//     recommendedAction: '1. Immediately engage incident response team\n2. Notify customers via status page\n3. Prepare executive brief for board\n4. Contact regulatory authorities if data breach suspected',
//     workspaceId: 'workspace-123',
//     correlationId: 'corr-incident-response-456',
//     causationId: 'int-threat-detection-789',
//     confidence: 0.94,
//     rationale: 'Multiple critical systems showing signs of compromise with potential data exfiltration.',
//     explanation: 'Security information and event management (SIEM) correlates multiple indicators of compromise across payment processing, customer portal, and API gateway systems. Unusual outbound traffic patterns and privileged account usage suggest a sophisticated attack in progress. Estimated potential financial impact exceeds $2M based on potential downtime and regulatory penalties.',
//     createdAt: '2026-07-30T14:30:00Z',
//     evaluatedAt: '2026-07-30T14:35:00Z'
//   };

//   // Create communication request from decision event
//   const request = createExecutiveEscalationRequest(decisionEvent);

//   // Process the communication request
//   const result = await processExecutiveEscalation(request);

//   console.log('Communication Request:', request);
//   console.log('Communication Result:', result);
// }

// example().catch(console.error);