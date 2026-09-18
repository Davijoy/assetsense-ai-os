/**
 * Customer Intelligence Domain
 * Analytics and insights about contacts, engagement, and lifecycle
 */

export interface CustomerLevel {
  contactId: string;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  city?: string;
  state?: string;
  country?: string;
  leadSource?: string;
  status: string;
  preferredContactMethod?: string;
  doNotContact: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  // Enriched fields
  engagementScore?: number;
  lastActivityAt?: Date;
  totalDeals?: number;
  totalValueInr?: number;
}

export interface CustomerMovement {
  contactId: string;
  type: "created" | "status_changed" | "contacted" | "deal_created" | "deal_won" | "deal_lost" | "tag_added" | "tag_removed";
  timestamp: Date;
  reference: string;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Aggregated summary of customer state.
 */
export interface CustomerSummary {
  total: number;
  active: number;
  new: number;
  inactive: number;
  customer: number;
  partner: number;
  vendor: number;
  referral: number;
  archived: number;
  totalValueInr: number;
  avgEngagementScore: number;
  activePct: number;
  customerPct: number;
  inactivePct: number;
  doNotContactPct: number;
}

/**
 * Customer grouped by a dimension (city, status, lead_source, company).
 */
export interface CustomerGrouping {
  name: string;
  total: number;
  active: number;
  new: number;
  inactive: number;
  customer: number;
  value: number;
  avgEngagementScore: number;
}

/**
 * Engagement bucket for customers based on last activity.
 */
export interface EngagementBucket {
  bucket: string;
  count: number;
  avgEngagementScore: number;
}

/**
 * A measurable recommendation produced by the intelligence cycle.
 */
export interface CustomerRecommendation {
  id: string;
  title: string;
  businessReason: string;
  affectedSegment: string;
  recommendedAction: string;
  expectedImpact: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  supportingMetrics: Record<string, string | number | boolean | null>;
  generatedAt: string;
  decisionReference?: string;
  correlationId: string;
}

export interface CustomerIntelligence {
  levels: CustomerLevel[];
  movements: CustomerMovement[];
  summary?: CustomerSummary;
  // Enriched intelligence fields
  customerSummary?: CustomerSummary;
  groupings?: {
    byCity: CustomerGrouping[];
    byStatus: CustomerGrouping[];
    byLeadSource: CustomerGrouping[];
    byCompany: CustomerGrouping[];
  };
  engagementBuckets?: EngagementBucket[];
  atRiskCustomers?: CustomerLevel[];
  highValueCustomers?: CustomerLevel[];
  recommendations?: CustomerRecommendation[];
  generatedAt?: string;
}
