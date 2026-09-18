/**
 * Executive Intelligence Repository
 * Interface for executive BI data access
 */

import type { ExecutiveKPI, ExecutiveSummary } from "./types";

export interface IExecutiveRepository {
  getKPIs(workspaceId: string): Promise<ExecutiveKPI[]>;
  getSummary(workspaceId: string, period: string): Promise<ExecutiveSummary | null>;
  saveKPI(kpi: ExecutiveKPI): Promise<void>;
  updateSummary(summary: ExecutiveSummary): Promise<void>;
}
