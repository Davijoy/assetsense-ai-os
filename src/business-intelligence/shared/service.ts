/**
 * Shared BI Service Base Class
 */

import type { BIContextResponse, BIQueryParams } from "./types";

/**
 * Abstract base class for all BI services
 */
export abstract class BaseBIService<T> {
  abstract async getContext(workspaceId: string): Promise<T>;
  abstract async getSummary(workspaceId: string): Promise<Record<string, unknown>>;
  abstract async getRecommendations(workspaceId: string): Promise<Record<string, unknown>[]>;

  /**
   * Wrap responses in standard format
   */
  protected wrapResponse<U>(
    data: U,
    workspaceId: string
  ): BIContextResponse<U> {
    return {
      data,
      timestamp: new Date(),
      workspaceId,
      status: "success",
    };
  }

  /**
   * Empty stub for extension
   */
  protected async enrichWithContext(
    data: T,
    params: BIQueryParams
  ): Promise<T> {
    // Empty implementation - to be extended
    return data;
  }
}
