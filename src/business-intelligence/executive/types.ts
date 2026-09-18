/**
 * Executive Intelligence Domain
 * Analytics and insights for executive dashboards and strategic decisions
 */

export interface ExecutiveKPI {
  id: string;
  name: string;
  value: number;
  target: number;
  status: "on_track" | "at_risk" | "off_track";
  unit: string;
  trend: number;
}

export interface ExecutiveSummary {
  period: string;
  totalMetrics: number;
  metricsOnTrack: number;
  metricsAtRisk: number;
  metricsOffTrack: number;
  highlights: string[];
  concerns: string[];
}

export interface ExecutiveIntelligence {
  kpis: ExecutiveKPI[];
  summary?: ExecutiveSummary;
  details?: Record<string, unknown>;
}
