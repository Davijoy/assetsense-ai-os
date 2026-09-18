/**
 * Pricing Intelligence Repository
 * Interface for pricing BI data access
 */

import type { PricingTier, PricingAnalysis } from "./types";

export interface IPricingRepository {
  getTiers(workspaceId: string): Promise<PricingTier[]>;
  getAnalysis(assetId: string): Promise<PricingAnalysis[]>;
  saveTier(tier: PricingTier): Promise<void>;
  updateAnalysis(analysis: PricingAnalysis): Promise<void>;
}
