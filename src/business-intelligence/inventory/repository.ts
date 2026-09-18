/**
 * Inventory Intelligence Repository
 * Interface for inventory BI data access
 */

import type { InventoryLevel, InventoryMovement } from "./types";

export interface IInventoryRepository {
  getLevels(workspaceId: string): Promise<InventoryLevel[]>;
  getMovements(assetId: string): Promise<InventoryMovement[]>;
  updateLevel(level: InventoryLevel): Promise<void>;
  recordMovement(movement: InventoryMovement): Promise<void>;
}
