/**
 * Project Intelligence Repository
 * Interface for project BI data access
 */

import type { ProjectPhase, ProjectMetric } from "./types";

export interface IProjectRepository {
  getPhases(projectId: string): Promise<ProjectPhase[]>;
  getMetrics(projectId: string): Promise<ProjectMetric[]>;
  savePhase(phase: ProjectPhase): Promise<void>;
  updateMetric(metric: ProjectMetric): Promise<void>;
}
