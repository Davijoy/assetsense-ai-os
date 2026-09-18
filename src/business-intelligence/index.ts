/**
 * Business Intelligence Layer
 * 
 * Domain-Driven Design structure for BI analytics across the platform.
 * Each domain provides context-aware insights without modifying existing CRM code.
 */

import type { CustomerIntelligence } from "./customer/types";
import type { ProjectIntelligence } from "./project/types";
import type { InventoryIntelligence } from "./inventory/types";
import type { PricingIntelligence } from "./pricing/types";
import type { PolicyIntelligence } from "./policy/types";
import type { ScheduleIntelligence } from "./scheduling/types";
import type { RecommendationIntelligence } from "./recommendations/types";
import type { MarketIntelligence } from "./market/types";
import type { ExecutiveIntelligence } from "./executive/types";

/**
 * Root Business Intelligence Context
 * Aggregates all domain-specific intelligence modules
 */
export interface BusinessIntelligenceContext {
  customer: CustomerIntelligence;
  project: ProjectIntelligence;
  inventory: InventoryIntelligence;
  pricing: PricingIntelligence;
  policy: PolicyIntelligence;
  schedule: ScheduleIntelligence;
  recommendations: RecommendationIntelligence;
  market: MarketIntelligence;
  executive: ExecutiveIntelligence;
}

/**
 * Initialize the Business Intelligence Context
 * Returns empty implementation for extension
 */
export function createBusinessIntelligenceContext(): BusinessIntelligenceContext {
  return {
    customer: {} as CustomerIntelligence,
    project: {} as ProjectIntelligence,
    inventory: {} as InventoryIntelligence,
    pricing: {} as PricingIntelligence,
    policy: {} as PolicyIntelligence,
    schedule: {} as ScheduleIntelligence,
    recommendations: {} as RecommendationIntelligence,
    market: {} as MarketIntelligence,
    executive: {} as ExecutiveIntelligence,
  };
}
