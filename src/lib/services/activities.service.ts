import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

/**
 * Activity domain model representing an interaction or task
 */
export type Activity = {
  id: string;
  workspaceId: string;
  activityType: ActivityType;
  subject: string;
  description: string | null;
  startTime: string; // ISO timestamp
  endTime: string | null; // ISO timestamp
  durationMinutes: number | null;
  status: ActivityStatus;
  outcome: ActivityOutcome | null;
  relatedToType: string; // 'contact', 'lead', 'deal', etc.
  relatedToId: string; // UUID of the related entity
  performedBy: string; // References auth user
  assignedTo: string | null; // References auth user
  createdAt: string;
  updatedAt: string;
  createdBy: string | null; // Reference to auth user
  updatedBy: string | null; // Reference to auth user
};

/**
 * Activity type enum
 */
export type ActivityType =
  | 'call'
  | 'meeting'
  | 'email'
  | 'task'
  | 'event'
  | 'follow_up'
  | 'demo'
  | 'proposal'
  | 'site_visit'
  | 'phone_call'
  | 'video_call'
  | 'presentation'
  | 'workshop'
  | 'conference'
  | 'training';

/**
 * Activity status enum
 */
export type ActivityStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'overdue';

/**
 * Activity outcome enum
 */
export type ActivityOutcome =
  | 'success'
  | 'failed'
  | 'no_answer'
  | 'left_message'
  | 'rescheduled'
  | 'declined'
  | 'not_interested'
  | 'interested'
  | 'follow_up_required'
  | 'deal_closed'
  | 'lead_qualified'
  | 'information_shared'
  | 'demo_scheduled'
  | 'other';

/**
 * Input for creating a new activity
 */
export type CreateActivityInput = {
  activityType: ActivityType;
  subject: string;
  description?: string | null;
  startTime: string; // ISO timestamp
  endTime?: string | null; // ISO timestamp
  durationMinutes?: number | null;
  status?: ActivityStatus; // Defaults to 'planned'
  outcome?: ActivityOutcome | null;
  relatedToType: string; // 'contact', 'lead', 'deal', etc.
  relatedToId: string; // UUID of the related entity
  performedBy: string; // References auth user (typically from context)
  assignedTo?: string | null; // References auth user
};

/**
 * Input for updating an activity (partial update)
 */
export type UpdateActivityInput = Partial<CreateActivityInput> & {
  id: string;
};

/**
 * Filter options for listing activities
 */
export type ListActivitiesFilter = {
  activityType?: ActivityType;
  status?: ActivityStatus;
  outcome?: ActivityOutcome;
  relatedToType?: string;
  relatedToId?: string;
  performedBy?: string;
  assignedTo?: string;
  startDateFrom?: string; // ISO date
  startDateTo?: string; // ISO date
  endDateFrom?: string; // ISO date
  endDateTo?: string; // ISO date
  search?: string; // Search in subject/description
  hasRelatedEntity?: boolean;
  limit?: number;
  offset?: number;
};

/**
 * Summary statistics for activities
 */
export type ActivitiesSummary = {
  total: number;
  byType: Record<ActivityType, number>;
  byStatus: Record<ActivityStatus, number>;
  byOutcome: Record<ActivityOutcome | null, number>;
  completed: number;
  overdue: number;
  thisWeek: number; // Created in last 7 days
  thisMonth: number; // Created in current month
};

/**
 * Maps a database row to an Activity DTO
 */
function mapActivityRow(r: any): Activity {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    activityType: r.activity_type as ActivityType,
    subject: r.subject,
    description: r.description ?? null,
    startTime: r.start_time,
    endTime: r.end_time ?? null,
    durationMinutes: r.duration_minutes ?? null,
    status: r.status as ActivityStatus,
    outcome: r.outcome ?? null,
    relatedToType: r.related_to_type,
    relatedToId: r.related_to_id,
    performedBy: r.performed_by,
    assignedTo: r.assigned_to ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by ?? null,
    updatedBy: r.updated_by ?? null,
  };
}

/**
 * List activities for a workspace with optional filtering and pagination
 */
export async function listActivities(
  supabase: AnySupabase,
  workspaceId: string,
  filter: ListActivitiesFilter = {}
): Promise<Activity[]> {
  let query = (supabase as any)
    .from("activities")
    .select("id,workspace_id,activity_type,subject,description,start_time,end_time,duration_minutes,status,outcome,related_to_type,related_to_id,performed_by,assigned_to,created_at,updated_at,created_by,updated_by")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  // Apply filters
  if (filter.activityType) query = query.eq("activity_type", filter.activityType);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.outcome) query = query.eq("outcome", filter.outcome);
  if (filter.relatedToType) query = query.eq("related_to_type", filter.relatedToType);
  if (filter.relatedToId) query = query.eq("related_to_id", filter.relatedToId);
  if (filter.performedBy) query = query.eq("performed_by", filter.performedBy);
  if (filter.assignedTo) query = query.eq("assigned_to", filter.assignedTo);
  if (filter.startDateFrom) query = query.gte("start_time", filter.startDateFrom);
  if (filter.startDateTo) query = query.lte("start_time", filter.startDateTo);
  if (filter.endDateFrom) query = query.gte("end_time", filter.endDateFrom);
  if (filter.endDateTo) query = query.lte("end_time", filter.endDateTo);
  if (filter.search) {
    const searchTerm = `%${filter.search}%`;
    query = query.or(`subject.ilike${searchTerm},description.ilike${searchTerm}`);
  }
  if (filter.hasRelatedEntity !== undefined) {
    if (filter.hasRelatedEntity) {
      query = query.not("related_to_type", "is", null);
    } else {
      query = query.is("related_to_type", null);
    }
  }

  // Apply pagination
  if (filter.limit !== undefined) {
    query = query.limit(filter.limit);
    if (filter.offset !== undefined) {
      query = query.offset(filter.offset);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapActivityRow);
}

/**
 * Get a single activity by ID (workspace-scoped for security)
 */
export async function getActivityById(
  supabase: AnySupabase,
  workspaceId: string,
  activityId: string
): Promise<Activity | null> {
  const { data, error } = await (supabase as any)
    .from("activities")
    .select("id,workspace_id,activity_type,subject,description,start_time,end_time,duration_minutes,status,outcome,related_to_type,related_to_id,performed_by,assigned_to,created_at,updated_at,created_by,updated_by")
    .eq("id", activityId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapActivityRow(data) : null;
}

/**
 * Create a new activity in the workspace
 */
export async function createActivity(
  supabase: AnySupabase,
  workspaceId: string,
  input: CreateActivityInput
): Promise<Activity> {
  const {
    activityType,
    subject,
    description = null,
    startTime,
    endTime = null,
    durationMinutes = null,
    status = 'planned',
    outcome = null,
    relatedToType,
    relatedToId,
    performedBy,
    assignedTo = null
  } = input;

  const { data, error } = await (supabase as any)
    .from("activities")
    .insert({
      workspace_id: workspaceId,
      activity_type: activityType,
      subject: subject,
      description: description,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      status: status,
      outcome: outcome,
      related_to_type: relatedToType,
      related_to_id: relatedToId,
      performed_by: performedBy,
      assigned_to: assignedTo
    })
    .select()
    .single();

  if (error) throw error;
  return mapActivityRow(data);
}

/**
 * Update an existing activity (workspace-scoped for security)
 */
export async function updateActivity(
  supabase: AnySupabase,
  workspaceId: string,
  input: UpdateActivityInput
): Promise<Activity> {
  // Get the original activity for comparison
  const originalActivity = await getActivityById(supabase, workspaceId, input.id);
  if (!originalActivity) {
    throw new Error(`Activity not found: ${input.id}`);
  }

  const updateData: any = {};

  // Only include fields that are defined in the input
  if (input.activityType !== undefined) updateData.activity_type = input.activityType;
  if (input.subject !== undefined) updateData.subject = input.subject;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.startTime !== undefined) updateData.start_time = input.startTime;
  if (input.endTime !== undefined) updateData.end_time = input.endTime;
  if (input.durationMinutes !== undefined) updateData.duration_minutes = input.durationMinutes;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.outcome !== undefined) updateData.outcome = input.outcome;
  if (input.relatedToType !== undefined) updateData.related_to_type = input.relatedToType;
  if (input.relatedToId !== undefined) updateData.related_to_id = input.relatedToId;
  if (input.performedBy !== undefined) updateData.performed_by = input.performedBy;
  if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo;

  // Don't update audit fields here (those should be set by application logic)

  const { data, error } = await (supabase as any)
    .from("activities")
    .update(updateData)
    .eq("id", input.id)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) throw error;
  return mapActivityRow(data);
}

/**
 * Delete an activity (workspace-scoped for security)
 */
export async function deleteActivity(
  supabase: AnySupabase,
  workspaceId: string,
  activityId: string
): Promise<void> {
  const { error } = await (supabase as any)
    .from("activities")
    .delete()
    .eq("id", activityId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;
}

/**
 * Get activities summary/statistics for a workspace
 */
export async function getActivitiesSummary(
  supabase: AnySupabase,
  workspaceId: string
): Promise<ActivitiesSummary> {
  const { data, error } = await (supabase as any)
    .from("activities")
    .select("activity_type,status,outcome,created_at")
    .eq("workspace_id", workspaceId);

  if (error) throw error;
  const activities = data ?? [];

  const summary: ActivitiesSummary = {
    total: activities.length,
    byType: {} as Record<ActivityType, number>,
    byStatus: {} as Record<ActivityStatus, number>,
    byOutcome: {} as Record<ActivityOutcome | null, number>,
    completed: 0,
    overdue: 0,
    thisWeek: 0,
    thisMonth: 0
  };

  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);

  for (const activity of activities) {
    // Count by type
    const type = activity.activity_type as ActivityType;
    if (!(type in summary.byType)) {
      summary.byType[type] = 0;
    }
    summary.byType[type]++;

    // Count by status
    const status = activity.status as ActivityStatus;
    if (!(status in summary.byStatus)) {
      summary.byStatus[status] = 0;
    }
    summary.byStatus[status]++;

    // Count by outcome
    const outcome = activity.outcome ?? null;
    if (outcome === null) {
      if (!(null in summary.byOutcome)) {
        summary.byOutcome[null] = 0;
      }
      summary.byOutcome[null]++;
    } else {
      if (!(outcome in summary.byOutcome)) {
        summary.byOutcome[outcome as ActivityOutcome] = 0;
      }
      summary.byOutcome[outcome as ActivityOutcome]++;
    }

    // Count completed activities
    if (status === 'completed') {
      summary.completed++;
    }

    // Count overdue activities
    if (status === 'overdue') {
      summary.overdue++;
    }

    // Count activities created this week
    if (activity.created_at) {
      const createdDate = new Date(activity.created_at);
      if (createdDate >= oneWeekAgo) {
        summary.thisWeek++;
      }
      if (createdDate >= oneMonthAgo) {
        summary.thisMonth++;
      }
    }
  }

  return summary;
}

/**
 * Get activities related to a specific entity (contact, lead, deal, etc.)
 */
export async function getActivitiesByRelatedEntity(
  supabase: AnySupabase,
  workspaceId: string,
  relatedToType: string,
  relatedToId: string,
  filter?: ListActivitiesFilter
): Promise<Activity[]> {
  // Start with base query
  let query = (supabase as any)
    .from("activities")
    .select("id,workspace_id,activity_type,subject,description,start_time,end_time,duration_minutes,status,outcome,related_to_type,related_to_id,performed_by,assigned_to,created_at,updated_at,created_by,updated_by")
    .eq("workspace_id", workspaceId)
    .eq("related_to_type", relatedToType)
    .eq("related_to_id", relatedToId)
    .order("created_at", { ascending: false });

  // Apply additional filters if provided
  if (filter) {
    if (filter.activityType) query = query.eq("activity_type", filter.activityType);
    if (filter.status) query = query.eq("status", filter.status);
    if (filter.outcome) query = query.eq("outcome", filter.outcome);
    if (filter.performedBy) query = query.eq("performed_by", filter.performedBy);
    if (filter.assignedTo) query = query.eq("assigned_to", filter.assignedTo);
    if (filter.startDateFrom) query = query.gte("start_time", filter.startDateFrom);
    if (filter.startDateTo) query = query.lte("start_time", filter.startDateTo);
    if (filter.endDateFrom) query = query.gte("end_time", filter.endDateFrom);
    if (filter.endDateTo) query = query.lte("end_time", filter.endDateTo);
    if (filter.search) {
      const searchTerm = `%${filter.search}%`;
      query = query.or(`subject.ilike${searchTerm},description.ilike${searchTerm}`);
    }
    if (filter.hasRelatedEntity !== undefined) {
      if (filter.hasRelatedEntity) {
        query = query.not("related_to_type", "is", null);
      } else {
        query = query.is("related_to_type", null);
      }
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapActivityRow);
}