-- SENTINEL FORT
-- Persist exact CRM site-visit and follow-up scheduling values.
-- Additive migration only. Existing lead data remains unchanged.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS site_visit_date date,
  ADD COLUMN IF NOT EXISTS site_visit_time time without time zone,
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS follow_up_time time without time zone,
  ADD COLUMN IF NOT EXISTS follow_up_status text,
  ADD COLUMN IF NOT EXISTS follow_up_notes text;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_follow_up_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_follow_up_status_check
  CHECK (
    follow_up_status IS NULL
    OR follow_up_status IN (
      'pending',
      'completed',
      'rescheduled',
      'overdue'
    )
  );

CREATE INDEX IF NOT EXISTS idx_leads_site_visit_date
  ON public.leads (workspace_id, site_visit_date)
  WHERE site_visit_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date
  ON public.leads (workspace_id, follow_up_date)
  WHERE follow_up_date IS NOT NULL;
