/**
 * Pricing Intelligence Domain
 * Analytics and insights about pricing strategies, margins, and optimization
 */

export interface PricingTier {
  id: string;
  name: string;
  basePrice: number;
  adjustments: Record<string, number>;
  effectiveDate: Date;
}

export interface PricingAnalysis {
  assetId: string;
  currentPrice: number;
  historicalAverage: number;
  marketComparison: number;
  marginAnalysis: Record<string, unknown>;
  timestamp: Date;
}

export interface PricingIntelligence {
  tiers: PricingTier[];
  analysis: PricingAnalysis[];
  summary?: Record<string, unknown>;
}
