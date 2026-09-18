/**
 * Example demonstrating the Inventory Allocation Decision flow:
 * Domain Event (e.g., INVENTORY.StockLevelLow)
 * -> Intelligence Event (e.g., INTELLIGENCE.InventoryReplenishmentSuggested)
 * -> Decision Object (DECISION.InventoryAllocationDetermined)
 *
 * This file is self-contained for illustrative purposes and does not create
 * new domain or intelligence event classes; it uses inline types to represent
 * the expected shapes of events from other bounded contexts.
 */

import { Event } from '../../lib/event-fabric/event';
import { DecisionEvent } from '../shared/decision';
import { BaseDecisionEvent } from '../shared/base-decision';
import { DecisionEvaluator } from '../shared/decision-evaluator';
import { DecisionContext } from '../shared/decision-context';
import { DecisionResult } from '../shared/decision-result';
import { DecisionStatus } from '../shared/decision-status';
import { DecisionPriority } from '../shared/decision-priority';
import { EvidenceItem } from '../../business-intelligence/shared/evidence-item';
import { ModelMetadata } from '../../business-intelligence/shared/model-metadata';

/**
 * Shape of a hypothetical inventory low stock domain event.
 * In a real system, this would come from the Inventory bounded context.
 */
interface InventoryStockLowEvent extends Event {
  payload: {
    sku: string;
    currentStock: number;
    reorderThreshold: number;
    locationId: string;
    productName: string;
    supplierLeadTimeDays: number;
  };
}

/**
 * Shape of a hypothetical inventory replenishment intelligence event.
 * In a real system, this would come from the Business Intelligence layer.
 */
interface InventoryReplenishmentSuggestedEvent extends Event {
  payload: {
    sku: string;
    recommendedOrderQuantity: number;
    priority: 'high' | 'medium' | 'low';
    predictedStockoutDate: string; // ISO 8601
    contributingFactors: {
      factorType: string; // e.g., 'salesVelocity', 'supplierDelay'
      factorValue: number;
      confidence: number;
    }[];
    // Model metadata
    modelId: string;
    modelVersion: string;
    modelType: string;
    confidenceScore: number;
    predictionTimestamp: string;
    featureSetVersion: string;
    trainingDataReference: string;
    explanation: string;
    evidence: {
      factor: string;
      value: any;
      impact: number;
      confidence: number;
    }[];
    driftStatus: 'none' | 'warning' | 'detected';
    humanReviewRequired: boolean;
  };
}

/**
 * Payload for the Inventory Allocation Decision event.
 */
export interface InventoryAllocationDecisionPayload {
  decisionId: string;
  decisionType: 'InventoryAllocation';
  sourceIntelligenceEventId: string;
  workspaceId: string;
  correlationId: string;
  causationId: string;
  confidence: number;
  rationale: string;
  explanation: string;
  evidence: EvidenceItem[];
  recommendedActions: string[]; // e.g., ['Create PO for 500 units from Supplier X', 'Expedite shipping']
  alternativesConsidered: { option: string; reasonForRejection: string }[];
  expectedBusinessValue: string; // e.g., 'Prevents $15K in lost sales'
  estimatedRisk: string; // e.g., 'Low' (risk of overstock)
  approvalPolicy: string; // e.g., 'inventory-auto-approval-policy'
  humanReviewRequired: boolean;
  expirationTime: string; // ISO 8601
  lifecycleStatus: string; // Using string to avoid enum import issues in example, but would be DecisionStatus
  createdAt: string; // ISO 8601
  evaluatedAt: string; // ISO 8601
  metadata: Record<string, unknown>;
}

/**
 * Decision event for inventory allocation.
 */
export class InventoryAllocationDecisionEvent extends BaseDecisionEvent<InventoryAllocationDecisionPayload> {
  constructor(
    metadata: import('../../lib/event-fabric/event-metadata').EventMetadata,
    payload: InventoryAllocationDecisionPayload
  ) {
    super(metadata, payload);
  }
}

/**
 * Decision evaluator for inventory allocation.
 */
export class InventoryAllocationDecisionEvaluator implements DecisionEvaluator<InventoryReplenishmentSuggestedEvent, InventoryAllocationDecisionPayload> {
  async evaluate(
    input: InventoryReplenishmentSuggestedEvent,
    context: DecisionContext
  ): Promise<DecisionResult<InventoryAllocationDecisionPayload> | undefined> {
    const { sku, recommendedOrderQuantity, priority, predictedStockoutDate, explanation, evidence } = input.payload;

    // Simple decision logic based on priority and stockout urgency
    let recommendedActions: string[];
    let rationale: string;
    let explanationText: string;
    let expectedBusinessValue: string;
    let estimatedRisk: string;
    let humanReviewRequired: boolean;

    const daysUntilStockout = new Date(predictedStockoutDate).getTime() - Date.now();
    const daysUntilStockoutValue = daysUntilStockout / (1000 * 60 * 60 * 24);

    if (priority === 'high' || daysUntilStockoutValue <= 2) {
      recommendedActions = [
        `Create purchase order for ${recommendedOrderQuantity} units immediately`,
        'Expedite shipping with supplier',
        'Notify sales team of potential delay if not approved'
      ];
      rationale = `High priority inventory shortage detected for SKU ${sku}. Stockout imminent in ${daysUntilStockoutValue.toFixed(1)} days.`;
      explanationText = `Recommended order quantity of ${recommendedOrderQuantity} based on current burn rate and supplier lead time.`;
      expectedBusinessValue = `Prevents estimated \$${Math.round(recommendedOrderQuantity * 50)} in lost sales`; // Simplified
      estimatedRisk = 'Low (risk of overstock is minimal given imminent stockout)';
      humanReviewRequired = false;
    } else if (priority === 'medium') {
      recommendedActions = [
        `Create purchase order for ${recommendedOrderQuantity} units with standard shipping`,
        'Monitor sales velocity for next 48 hours'
      ];
      rationale = `Medium priority shortage for SKU ${sku}. Sufficient time for standard procurement.`;
      explanationText = `Standard order quantity of ${recommendedOrderQuantity} recommended to replenish stock before anticipated shortage.`;
      expectedBusinessValue = `Avoids stockout costs while minimizing carrying costs`;
      estimatedRisk = 'Medium';
      humanReviewRequired = false;
    } else {
      recommendedActions = [
        `Hold order, reassess in 7 days`,
        'Consider promotional activity to increase stock turnover'
      ];
      rationale = `Low priority suggestion for SKU ${sku}. Current stock levels adequate for near-term demand.`;
      explanationText = `While model suggests ordering ${recommendedOrderQuantity} units, current inventory and sales trends indicate lower urgency.`;
      expectedBusinessValue = 'Optimizes inventory carrying costs';
      estimatedRisk = 'Low';
      humanReviewRequired = recommendedOrderQuantity > 500 ? true : false; // Larger recommended order might need review
    }

    // Build evidence for the decision
    const decisionEvidence: EvidenceItem[] = [
      {
        factor: 'recommendedOrderQuantity',
        value: recommendedOrderQuantity,
        impact: recommendedOrderQuantity,
        confidence: 0.9
      },
      {
        factor: 'daysUntilStockout',
        value: daysUntilStockoutValue,
        impact: -daysUntilStockoutValue, // Negative because lower days = higher urgency
        confidence: 0.85
      }
    ];

    // Alternatives considered
    const alternativesConsidered = [
      { option: 'Do nothing and wait for natural replenishment', reasonForRejection: 'Risk of prolonged stockout and lost sales' },
      { option: 'Over-allocate from other SKUs', reasonForRejection: 'May cause shortages in other products' }
    ];

    // Create decision result
    const result: DecisionResult<InventoryAllocationDecisionPayload> = {
      decisionType: 'InventoryAllocation',
      confidence: 0.88,
      rationale,
      explanation: explanationText,
      evidence: decisionEvidence,
      payload: {
        decisionId: `dec-inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        decisionType: 'InventoryAllocation',
        sourceIntelligenceEventId: input.metadata.eventId,
        workspaceId: context.workspaceId,
        correlationId: context.correlationId,
        causationId: input.metadata.eventId,
        confidence: 0.88,
        rationale,
        explanation: explanationText,
        evidence: decisionEvidence,
        recommendedActions,
        alternativesConsidered,
        expectedBusinessValue,
        estimatedRisk,
        approvalPolicy: 'inventory-allocation-policy-v1',
        humanReviewRequired,
        expirationTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
        lifecycleStatus: 'Draft', // Would use DecisionStatus.Draft in real code
        createdAt: new Date().toISOString(),
        evaluatedAt: new Date().toISOString(),
        metadata: {
          inventorySystem: 'SAP-ECC',
          sku: sku
        }
      },
      // Top-level fields in DecisionResult (duplicated from payload for convenience)
      alternativesConsidered,
      expectedBusinessValue,
      estimatedRisk,
      recommendedNextEvaluation: '6h',
      humanReviewRequired,
      generatedAt: new Date().toISOString()
    };

    return result;
  }
}

// Example usage commented out
// async function example() { /* ... */ }
// example().catch(console.error);