/**
 * Inventory Intelligence Domain
 * Analytics and insights about inventory, stock levels, and movement
 */

export interface InventoryLevel {
  assetId: string;
  quantity: number;
  unit: string;
  lastUpdated: Date;
  threshold: number;
  // ── Enriched property-inventory fields (populated from properties table) ──
  name?: string;
  city?: string;
  propertyType?: string;
  status?: string;
  priceInr?: number;
  developer?: string;
}

export interface InventoryMovement {
  assetId: string;
  type: "in" | "out" | "transfer" | "adjustment";
  quantity: number;
  timestamp: Date;
  reference: string;
}

/**
 * Aggregated summary of inventory state.
 */
export interface InventorySummary {
  total: number;
  available: number;
  sold: number;
  reserved: number;
  blocked: number;
  availabilityPct: number;
  soldPct: number;
  absorptionPct: number;
  avgValue: number;
  totalValue: number;
  availableValue: number;
  soldValue: number;
}

/**
 * Inventory grouped by a dimension (city, status, project/tower).
 */
export interface InventoryGrouping {
  name: string;
  total: number;
  available: number;
  sold: number;
  reserved: number;
  blocked: number;
  value: number;
}

/**
 * Ageing bucket for inventory based on created_at.
 */
export interface AgeingBucket {
  bucket: string;
  count: number;
  value: number;
}

/**
 * A measurable recommendation produced by the intelligence cycle.
 */
export interface InventoryRecommendation {
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

export interface InventoryIntelligence {
  levels: InventoryLevel[];
  movements: InventoryMovement[];
  summary?: InventorySummary;
  // ── Enriched intelligence fields ──
  inventorySummary?: InventorySummary;
  groupings?: {
    byCity: InventoryGrouping[];
    byStatus: InventoryGrouping[];
    byProject: InventoryGrouping[];
  };
  ageingBuckets?: AgeingBucket[];
  slowMoving?: InventoryLevel[];
  highValueUnsold?: InventoryLevel[];
  recommendations?: InventoryRecommendation[];
  generatedAt?: string;
}
