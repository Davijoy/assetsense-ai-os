import { Event } from '../event';
import { IEventPublisher } from '../event-publisher';
import { IEventSubscriber } from '../event-subscriber';
import { IEventBus } from '../event-bus';
import { CrmLeadCreatedEvent } from './crm-lead-created.event';
import { IntelligenceLeadScoreUpdatedEvent } from './intelligence-lead-score-updated.event';
import { ExecutiveCommandResourceAllocationChangedEvent } from './executive-command-resource-allocation-changed.event';
import { EventMetadata } from '../event-metadata';
import { generateCorrelationId } from '../correlation-id';
import { generateCausationId } from '../causation-id';

/**
 * Example demonstrating how events flow through the Event Fabric:
 * 1. Domain event published (CRM Lead Created)
 * 2. BI processes the event and creates an intelligence event
 * 3. Executive Command makes a decision based on intelligence
 * 4. Communication Hub would execute the decision (not shown here)
 */

/**
 * Example domain event subscriber that processes CRM events
 * This would typically be part of the Business Intelligence layer
 */
class LeadScoreProcessor implements IEventSubscriber {
  constructor(private eventPublisher: IEventPublisher) {}

  async onEvent(event: Event): Promise<void> {
    // Only process CRM Lead Created events
    if (event.metadata.eventType === 'CRM.LeadCreated' &&
        event.metadata.classification === 'DOMAIN') {

      console.log(`Processing lead created event: ${event.payload.leadId}`);

      // Simulate lead scoring logic
      const newScore = this.calculateLeadScore(event.payload);

      // Create and publish intelligence event
      const intelligenceMetadata: EventMetadata = {
        eventId: Math.random().toString(36).substring(2, 15),
        eventType: 'INTELLIGENCE.LeadScoreUpdated',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        workspaceId: event.metadata.workspaceId,
        classification: 'INTELLIGENCE' as const,
        priority: 'MEDIUM' as const,
        correlationId: event.metadata.correlationId ?? generateCorrelationId(),
        causationId: generateCausationId(), // This intelligence event is caused by the lead created event
        source: {
          serviceName: 'lead-scoring-service',
          version: '1.0.0'
        }
      };

      const intelligenceEvent = new IntelligenceLeadScoreUpdatedEvent(
        intelligenceMetadata,
        {
          leadId: event.payload.leadId,
          oldScore: 0, // New lead starts at 0
          newScore: newScore,
          scoreChange: newScore,
          contributingFactors: [
            {
              factorType: 'demographic',
              factorValue: 5,
              confidence: 0.8
            },
            {
              factorType: 'engagement',
              factorValue: 3,
              confidence: 0.6
            }
          ],
          // Model metadata fields
          modelId: 'lead-score-model-001',
          modelVersion: 'lead-score-v1.2',
          modelType: 'gradient_boosting',
          confidenceScore: 0.75, // Renamed from predictionConfidence
          predictionTimestamp: new Date().toISOString(),
          featureSetVersion: 'feature-set-v2.1',
          trainingDataReference: 'training-data-2024-Q3',
          explanation: 'Lead score increased due to high engagement and demographic fit.',
          evidence: [
            {
              factor: 'website_visits',
              value: 15,
              impact: 8,
              confidence: 0.9
            },
            {
              factor: 'company_size',
              value: 250,
              impact: 5,
              confidence: 0.7
            }
          ],
          driftStatus: 'none' as const,
          humanReviewRequired: false,
          recommendedAction: newScore > 50
            ? 'Assign to sales representative for follow-up'
            : 'Add to nurture campaign'
        }
      );

      await this.eventPublisher.publish(intelligenceEvent);
      console.log(`Published lead score update: ${event.payload.leadId} -> ${newScore}`);
    }
  }

  private calculateLeadScore(leadData: any): number {
    // Simplified scoring logic for demonstration
    let score = 0;

    // Base score from source
    const sourceScores: Record<string, number> = {
      'website': 20,
      'referral': 30,
      'cold_call': 10,
      'social_media': 15
    };
    score += sourceScores[leadData.source] || 5;

    // Company size bonus
    if (leadData.companyInfo?.employeeCount) {
      if (leadData.companyInfo.employeeCount > 1000) score += 20;
      else if (leadData.companyInfo.employeeCount > 100) score += 10;
      else if (leadData.companyInfo.employeeCount > 10) score += 5;
    }

    // Contact completeness bonus
    if (leadData.contactInfo.email) score += 10;
    if (leadData.contactInfo.phone) score += 5;

    return Math.min(score, 100); // Cap at 100
  }
}

/**
 * Example intelligence event subscriber that processes BI insights
 * This would typically be part of the Executive Command layer
 */
class DecisionEngine implements IEventSubscriber {
  constructor(private eventPublisher: IEventPublisher) {}

  async onEvent(event: Event): Promise<void> {
    // Only process Lead Score Updated intelligence events
    if (event.metadata.eventType === 'INTELLIGENCE.LeadScoreUpdated' &&
        event.metadata.classification === 'INTELLIGENCE') {

      console.log(`Evaluating lead score for decision: ${event.payload.leadId} = ${event.payload.newScore}`);

      // Simple decision logic: if score is high enough, allocate more resources
      if (event.payload.newScore >= 70) {
        console.log(`High-value lead detected: ${event.payload.leadId}`);

        // Create and publish decision event
        const decisionMetadata: EventMetadata = {
          eventId: Math.random().toString(36).substring(2, 15),
          eventType: 'EXECUTIVE_COMMAND.ResourceAllocationChanged',
          eventVersion: '1.0',
          timestamp: new Date().toISOString(),
          workspaceId: event.metadata.workspaceId,
          classification: 'DECISION' as const,
          priority: 'HIGH' as const,
          correlationId: event.metadata.correlationId ?? generateCorrelationId(),
          causationId: generateCausationId(), // This decision is caused by the intelligence event
          source: {
            serviceName: 'decision-engine-service',
            version: '1.0.0'
          }
        };

        const decisionEvent = new ExecutiveCommandResourceAllocationChangedEvent(
          decisionMetadata,
          {
            allocationId: `alloc-${Date.now()}`,
            resourceType: 'sales_personnel',
            resourceId: `lead-${event.payload.leadId}`,
            oldAllocation: 0, // No previous allocation
            newAllocation: 2, // Assign 2 sales representatives (hours per week?)
            changeReason: 'High-value lead identified requiring immediate attention',
            changedBy: 'decision-engine-automation',
            effectiveDate: new Date().toISOString(),
            associatedInitiativeId: undefined,
            expectedImpact: [
              {
                metricType: 'lead_conversion_rate',
                predictedChange: 0.15, // 15% increase expected
                confidence: 0.7,
                timeframe: '30_days'
              },
              {
                metricType: 'sales_cycle_time',
                predictedChange: -0.2, // 20% reduction expected
                confidence: 0.6,
                timeframe: '30_days'
              }
            ]
          }
        );

        await this.eventPublisher.publish(decisionEvent);
        console.log(`Published resource allocation decision for lead: ${event.payload.leadId}`);
      }
    }
  }
}

/**
 * Mock event bus implementation for demonstration
 * In a real system, this would be implemented with Apache Kafka, RabbitMQ, etc.
 */
class MockEventBus implements IEventBus {
  private subscribers: Map<string, Set<IEventSubscriber>> = new Map();

  async publish(event: Event): Promise<void> {
    const eventType = event.metadata.eventType;
    console.log(`[EVENT BUS] Publishing: ${eventType} (${event.metadata.eventId})`);

    // Notify all subscribers for exact event type matches
    if (this.subscribers.has(eventType)) {
      const subs = this.subscribers.get(eventType);
      if (subs) {
        // Convert Set to Array to avoid iteration issues
        const subArray = Array.from(subs);
        for (let i = 0; i < subArray.length; i++) {
          const subscriber = subArray[i];
          try {
            await subscriber.onEvent(event);
          } catch (error) {
            console.error(`Error processing event ${eventType} by subscriber:`, error);
          }
        }
      }
    }

    // Notify subscribers with pattern matches
    const entries = Array.from(this.subscribers.entries());
    for (let i = 0; i < entries.length; i++) {
      const [pattern, subscribers] = entries[i];
      if (this.matchesPattern(eventType, pattern)) {
        // Convert Set to Array to avoid iteration issues
        const subArray = Array.from(subscribers);
        for (let j = 0; j < subArray.length; j++) {
          const subscriber = subArray[j];
          try {
            await subscriber.onEvent(event);
          } catch (error) {
            console.error(`Error processing event ${eventType} by subscriber (pattern match):`, error);
          }
        }
      }
    }
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test(eventType);
    }
    return false;
  }

  subscribe(subscriber: IEventSubscriber, eventTypeFilter: string | RegExp): string {
    const subscriptionId = Math.random().toString(36).substring(2, 15);
    const key = typeof eventTypeFilter === 'string' ? eventTypeFilter : (eventTypeFilter as RegExp).source;

    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.add(subscriber);
    }

    console.log(`[EVENT BUS] Subscribed to ${key} with ID: ${subscriptionId}`);
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    // In a real implementation, we'd track subscriptions by ID
    // For simplicity, we're not implementing full unsubscription logic here
    console.log(`[EVENT BUS] Unsubscription requested for ID: ${subscriptionId}`);
  }
}

/**
 * Demonstration of the event flow
 */
async function demonstrateEventFlow() {
  console.log('=== Event Flow Demonstration ===\n');

  // Create our event bus (the backbone of the Event Fabric)
  const eventBus = new MockEventBus();

  // Create our processors
  const leadScoreProcessor = new LeadScoreProcessor(eventBus);
  const decisionEngine = new DecisionEngine(eventBus);

  // Subscribe to events
  eventBus.subscribe(leadScoreProcessor, 'CRM.LeadCreated');
  eventBus.subscribe(decisionEngine, 'INTELLIGENCE.LeadScoreUpdated');

  // Simulate a new lead being created in the CRM system
  const leadCreatedMetadata: EventMetadata = {
    eventId: Math.random().toString(36).substring(2, 15),
    eventType: 'CRM.LeadCreated',
    eventVersion: '1.0',
    timestamp: new Date().toISOString(),
    workspaceId: 'workspace-123',
    classification: 'DOMAIN' as const,
    priority: 'MEDIUM' as const,
    correlationId: generateCorrelationId(),
    causationId: generateCausationId(),
    source: {
      serviceName: 'crm-service',
      instanceId: 'crm-001',
      version: '2.1.0'
    }
  };

  const newLeadEvent = new CrmLeadCreatedEvent(
    leadCreatedMetadata,
    {
      leadId: 'lead-7890',
      source: 'website',
      initialScore: 0,
      assignedTo: 'sales-rep-456',
      createdBy: 'web-form-system',
      contactInfo: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '555-123-4567'
      },
      companyInfo: {
        name: 'Acme Corporation',
        industry: 'Manufacturing',
        employeeCount: 250
      }
    }
  );

  console.log('--- Simulating New Lead Creation ---\n');
  await eventBus.publish(newLeadEvent);

  console.log('\n=== Event Flow Complete ===');
}

// Run the demonstration
demonstrateEventFlow().catch(console.error);