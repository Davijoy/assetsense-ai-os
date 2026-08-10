/**
 * Market Intelligence Domain
 * Analytics and insights about market conditions, trends, and opportunities
 */

export interface MarketTrend {
  id: string;
  category: string;
  trend: "rising" | "falling" | "stable";
  strength: number;
  timeWindow: string;
  metadata: {
    priceChangePct?: number;
    demandIndex?: number;
    city?: string;
    propertyType?: string;
    workspaceId?: string;
    // Additional metadata fields as needed
    [key: string]: string | number | boolean | null | undefined;
  };
}

export interface MarketOpportunity {
  id: string;
  type: string;
  confidence: number;
  estimatedValue: number;
  details: Record<string, string | number | boolean | null | undefined>;
  discovered_at: string;
}

export interface MarketListing {
  id: string;
  source: "magicbricks" | "99acres" | "housing";
  city: string;
  locality?: string;
  title?: string;
  propertyType: "apartment" | "villa" | "plot" | "commercial";
  listingType: "sale" | "rent";
  price?: number;
  priceUnit: string;
  pricePerSqft?: number;
  areaSqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: string;
  totalFloors?: number;
  ageYears?: number;
  furnishing?: "furnished" | "semi-furnished" | "unfurnished";
  builder?: string;
  project?: string;
  reraId?: string;
  url?: string;
  scraped_at: string;
  workspaceId: string;
  created_at: string;
}

export interface MarketCompliance {
  id: string;
  source: string;
  recordType: "project_registration" | "notice" | "amendment" | "violation";
  projectName: string;
  promoter?: string;
  reraNumber: string;
  city: string;
  state: string;
  status: "registered" | "revoked" | "lapsed" | "under_review";
  registration_date?: string;
  expiry_date?: string;
  url?: string;
  notes?: string;
  scraped_at: string;
  workspaceId: string;
  created_at: string;
}

export interface MarketIntelligence {
  trends: MarketTrend[];
  opportunities: MarketOpportunity[];
  listings: MarketListing[];
  compliance: MarketCompliance[];
  summary?: Record<string, string | number | boolean | null | undefined>;
  groupings?: {
    byCity: { name: string; count: number; avgPricePerSqft: number; totalValue: number }[];
    byPropertyType: { name: string; count: number; avgPricePerSqft: number; totalValue: number }[];
    byListingType: { name: string; count: number; avgPricePerSqft: number; totalValue: number }[];
    bySource: { name: string; count: number; avgPricePerSqft: number; totalValue: number }[];
  };
  priceAnalysis?: {
    priceRanges: { range: string; count: number; percentage: number }[];
    avgPriceByCity: { city: string; avgPrice: number; avgPricePerSqft: number; count: number }[];
    priceTrend: "rising" | "falling" | "stable";
  };
  demandAnalysis?: {
    demandByCity: { city: string; demandIndex: number; listingCount: number; avgDaysOnMarket: number }[];
    demandByPropertyType: { propertyType: string; demandIndex: number; listingCount: number }[];
    overallDemandIndex: number;
    demandTrend: "increasing" | "decreasing" | "stable";
  };
  generatedAt?: string;
}
