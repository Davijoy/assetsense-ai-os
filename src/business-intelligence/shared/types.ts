/**
 * Shared Utilities and Types for Business Intelligence Layer
 */

/**
 * Standard BI Context Response
 */
export interface BIContextResponse<T> {
  data: T;
  timestamp: Date;
  workspaceId: string;
  status: "success" | "partial" | "error";
}

/**
 * Standard BI Query Parameters
 */
export interface BIQueryParams {
  workspaceId: string;
  startDate?: Date;
  endDate?: Date;
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

/**
 * Standard BI Trend Data
 */
export interface TrendData {
  timestamp: Date;
  value: number;
  label?: string;
}

/**
 * Standard BI Summary Metric
 */
export interface SummaryMetric {
  name: string;
  value: unknown;
  change?: number;
  unit?: string;
  status?: "positive" | "negative" | "neutral";
}

/**
 * Error handling for BI operations
 */
export class BIError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BIError";
  }
}
