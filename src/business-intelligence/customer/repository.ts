/**
 * Customer Intelligence Repository
 * Interface for customer BI data access
 */

import type { CustomerLevel, CustomerMovement } from "./types";

export interface ICustomerRepository {
  getLevels(workspaceId: string): Promise<CustomerLevel[]>;
  getMovements(contactId: string): Promise<CustomerMovement[]>;
  updateLevel(level: CustomerLevel): Promise<void>;
  recordMovement(movement: CustomerMovement): Promise<void>;
}