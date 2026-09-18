-- =========================================================================
-- REOS v1.0 — Phase 3: Workspace Domain Tables (Activities)
-- =========================================================================

-- Enums for Activity domain --------------------------------------------------

CREATE TYPE public.activity_type AS ENUM (
  'call',
  'meeting',
  'email',
  'task',
  'event',
  'follow_up',
  'demo',
  'proposal',
  'site_visit',
  'phone_call',
  'video_call',
  'presentation',
  'workshop',
  'conference',
  'training'
);

CREATE TYPE public.activity_status AS ENUM (
  'planned',
  'in_progress',
  'completed',
  'cancelled',
  'overdue'
);

CREATE TYPE public.activity_outcome AS ENUM (
  'success',
  'failed',
  'no_answer',
  'left_message',
  'rescheduled',
  'declined',
  'not_interested',
  'interested',
  'follow_up_required',
  'deal_closed',
  'lead_qualified',
  'information_shared',
  'demo_scheduled',
  'other'
);

-- Core table ---------------------------------------------------------------

CREATE TABLE public.activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  activity_type   activity_type NOT NULL,
  subject         VARCHAR(200) NOT NULL,
  description     TEXT,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,
  duration_minutes INTEGER,
  status          activity_status NOT NULL DEFAULT 'planned',
  outcome         activity_outcome,
  related_to_type VARCHAR(50) NOT NULL, -- 'contact', 'lead', 'deal', 'campaign', 'user'
  related_to_id   UUID NOT NULL,        -- References the related entity
  performed_by    UUID NOT NULL, -- Reference to auth.users (who performed the activity)
  assigned_to     UUID,        -- Reference to auth.users (who the activity is assigned to)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id), -- Will be set by application
  updated_by      UUID REFERENCES auth.users(id), -- Will be set by application

  -- Constraints
  CONSTRAINT activities_duration_check CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  CONSTRAINT activities_time_check CHECK (end_time IS NULL OR end_time >= start_time),
  CONSTRAINT activities_related_to_type_check CHECK (
    related_to_type IN ('contact', 'lead', 'deal', 'campaign', 'user')
  ),
  CONSTRAINT activities_call_lead_check CHECK (
    NOT (activity_type = 'call' AND related_to_type <> 'lead')
  )
);

COMMENT ON TABLE public.activities IS 'Tracks all customer and internal interactions (calls, meetings, emails, tasks, etc.)';
COMMENT ON COLUMN public.activities.workspace_id IS 'Workspace this activity belongs to for multi-tenancy';
COMMENT ON COLUMN public.activities.activity_type IS 'Type of activity (call, meeting, email, task, etc.)';
COMMENT ON COLUMN public.activities.subject IS 'Brief summary or title of activity';
COMMENT ON COLUMN public.activities.description IS 'Detailed description or notes';
COMMENT ON COLUMN public.activities.start_time IS 'When the activity starts or occurred';
COMMENT ON COLUMN public.activities.end_time IS 'When the activity ends or ended';
COMMENT ON COLUMN public.activities.duration_minutes IS 'Duration in minutes';
COMMENT ON COLUMN public.activities.status IS 'Current lifecycle status';
COMMENT ON COLUMN public.activities.outcome IS 'Result or outcome of the activity';
COMMENT ON COLUMN public.activities.related_to_type IS 'Type of related entity (contact, lead, deal, etc.)';
COMMENT ON COLUMN public.activities.related_to_id IS 'ID of the related entity';
COMMENT ON COLUMN public.activities.performed_by IS 'User who performed the activity';
COMMENT ON COLUMN public.activities.assigned_to IS 'User to whom the activity is assigned';
COMMENT ON COLUMN public.activities.created_by IS 'User who created the record';
COMMENT ON COLUMN public.activities.updated_by IS 'User who last updated the record';

-- Indexes for performance
CREATE INDEX activities_workspace_idx ON public.activities(workspace_id);
CREATE INDEX activities_type_idx ON public.activities(activity_type);
CREATE INDEX activities_status_idx ON public.activities(status);
CREATE INDEX activities_outcome_idx ON public.activities(outcome);
CREATE INDEX activities_related_idx ON public.activities(related_to_type, related_to_id);
CREATE INDEX activities_performed_by_idx ON public.activities(performed_by);
CREATE INDEX activities_assigned_to_idx ON public.activities(assigned_to);
CREATE INDEX activities_start_time_idx ON public.activities(start_time);
CREATE INDEX activities_created_at_idx ON public.activities(created_at);

-- Composite indexes for common query patterns
CREATE INDEX activities_workspace_type_idx ON public.activities(workspace_id, activity_type);
CREATE INDEX activities_workspace_status_idx ON public.activities(workspace_id, status);
CREATE INDEX activities_workspace_related_idx ON public.activities(workspace_id, related_to_type, related_to_id);
CREATE INDEX activities_performed_date_idx ON public.activities(performed_by, start_time);
CREATE INDEX activities_assigned_date_idx ON public.activities(assigned_to, start_time);
CREATE INDEX activities_workspace_type_status_idx ON public.activities(workspace_id, activity_type, status);

-- Enable Row Level Security
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS policies following established pattern
CREATE POLICY "activities ws select" ON public.activities
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "activities ws insert" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "activities ws update" ON public.activities
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "activities ws delete" ON public.activities
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Grant permissions
GRANT SELECT ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;

-- Trigger for updated_at timestamp
DROP TRIGGER IF EXISTS update_activities_updated_at ON public.activities;
CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();