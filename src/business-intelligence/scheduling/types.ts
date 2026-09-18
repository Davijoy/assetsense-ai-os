/**
 * Scheduling Intelligence Domain
 * Analytics and insights about schedules, timelines, and resource allocation
 */

export interface ScheduleSlot {
  id: string;
  resourceId: string;
  startTime: Date;
  endTime: Date;
  status: "available" | "booked" | "blocked" | "maintenance";
  metadata?: Record<string, unknown>;
}

export interface ScheduleConflict {
  id: string;
  slot1Id: string;
  slot2Id: string;
  severity: "low" | "medium" | "high";
  resolution?: string;
  timestamp: Date;
}

export interface ScheduleIntelligence {
  slots: ScheduleSlot[];
  conflicts: ScheduleConflict[];
  summary?: Record<string, unknown>;
}
