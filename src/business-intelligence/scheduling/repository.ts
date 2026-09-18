/**
 * Scheduling Intelligence Repository
 * Interface for scheduling BI data access
 */

import type { ScheduleSlot, ScheduleConflict } from "./types";

export interface ISchedulingRepository {
  getSlots(resourceId: string): Promise<ScheduleSlot[]>;
  getConflicts(workspaceId: string): Promise<ScheduleConflict[]>;
  saveSlot(slot: ScheduleSlot): Promise<void>;
  recordConflict(conflict: ScheduleConflict): Promise<void>;
}
