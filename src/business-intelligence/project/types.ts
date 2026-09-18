/**
 * Project Intelligence Domain
 * Analytics and insights about projects, timelines, and deliverables
 */

export interface ProjectPhase {
  id: string;
  name: string;
  status: "pending" | "active" | "completed" | "delayed";
  progress: number;
  startDate: Date;
  endDate: Date;
}

export interface ProjectMetric {
  projectId: string;
  name: string;
  value: unknown;
  unit: string;
  timestamp: Date;
}

export interface ProjectIntelligence {
  phases: ProjectPhase[];
  metrics: ProjectMetric[];
  summary?: Record<string, unknown>;
}
