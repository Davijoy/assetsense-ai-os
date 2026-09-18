/**
 * SENTINEL FORT — Active Entity & Decision Context Layer
 *
 * Allows UI surfaces (e.g. Marketplace, Inventory, CRM, Units) to publish
 * the specific object currently being inspected or interacted with by the user.
 * Supports:
 * - Entity types: property | project | unit | lead | tower | dealroom
 * - Unit-level intelligence (floor, facing, price/sqft, floor premium)
 * - Multi-entity comparison context (Entity A vs Entity B)
 * - Lightweight session interaction memory (progression tracking)
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type EntityType = "property" | "project" | "unit" | "lead" | "tower" | "dealroom";

export interface ActiveEntity {
  id: string;
  type: EntityType;
  name: string;
  module: string;
  location?: string;
  price?: string;
  priceNumber?: number;
  pricePerSqft?: number;
  configuration?: string;
  size?: string;
  sizeSqft?: number;
  builder?: string;
  status?: string;
  inventory?: number;
  demand?: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH";
  supply?: "CONSTRAINED" | "MODERATE" | "HIGH";
  absorption?: number;
  appreciation?: string;
  appreciationPct?: number;
  score?: number;
  rawScore?: number;
  risk?: "low" | "medium" | "high";
  data: Record<string, string | number>;

  // Unit-specific fields (when type === "unit" or inspecting a specific unit)
  selectedUnit?: string;
  selectedProject?: string;
  selectedTower?: string;
  unitNumber?: string;
  floor?: number;
  facing?: string;
  floorPremiumPct?: number;
}

interface ActiveEntityContextValue {
  activeEntity: ActiveEntity | null;
  setActiveEntity: (entity: ActiveEntity | null) => void;
  comparisonEntity: ActiveEntity | null;
  setComparisonEntity: (entity: ActiveEntity | null) => void;
  startComparison: (entityA: ActiveEntity, entityB: ActiveEntity) => void;
  clearComparison: () => void;
  recentEntities: ActiveEntity[];
  addToHistory: (entity: ActiveEntity) => void;
}

const ActiveEntityContext = createContext<ActiveEntityContextValue>({
  activeEntity: null,
  setActiveEntity: () => {},
  comparisonEntity: null,
  setComparisonEntity: () => {},
  startComparison: () => {},
  clearComparison: () => {},
  recentEntities: [],
  addToHistory: () => {},
});

export function ActiveEntityProvider({ children }: { children: ReactNode }) {
  const [activeEntity, setActiveEntityState] = useState<ActiveEntity | null>(null);
  const [comparisonEntity, setComparisonEntity] = useState<ActiveEntity | null>(null);
  const [recentEntities, setRecentEntities] = useState<ActiveEntity[]>([]);

  const addToHistory = useCallback((entity: ActiveEntity) => {
    setRecentEntities((prev) => {
      const filtered = prev.filter((e) => e.id !== entity.id);
      return [entity, ...filtered].slice(0, 5); // Keep up to 5 recent entities
    });
  }, []);

  const setActiveEntity = useCallback((entity: ActiveEntity | null) => {
    setActiveEntityState(entity);
    if (entity) {
      addToHistory(entity);
    }
  }, [addToHistory]);

  const startComparison = useCallback((entityA: ActiveEntity, entityB: ActiveEntity) => {
    setActiveEntityState(entityA);
    setComparisonEntity(entityB);
    addToHistory(entityA);
    addToHistory(entityB);
  }, [addToHistory]);

  const clearComparison = useCallback(() => {
    setComparisonEntity(null);
  }, []);

  return (
    <ActiveEntityContext.Provider
      value={{
        activeEntity,
        setActiveEntity,
        comparisonEntity,
        setComparisonEntity,
        startComparison,
        clearComparison,
        recentEntities,
        addToHistory,
      }}
    >
      {children}
    </ActiveEntityContext.Provider>
  );
}

export function useActiveEntity() {
  return useContext(ActiveEntityContext);
}
