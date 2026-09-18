/**
 * Shared BI Repository Utilities
 */

import type { BIQueryParams } from "./types";

/**
 * Base repository interface for all BI domains
 */
export interface IBIRepository<T> {
  query(params: BIQueryParams): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  save(item: T): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Query builder utility interface
 */
export interface IQueryBuilder {
  where(field: string, operator: string, value: unknown): IQueryBuilder;
  select(fields: string[]): IQueryBuilder;
  limit(count: number): IQueryBuilder;
  offset(count: number): IQueryBuilder;
  orderBy(field: string, direction: "asc" | "desc"): IQueryBuilder;
  build(): Record<string, unknown>;
}
