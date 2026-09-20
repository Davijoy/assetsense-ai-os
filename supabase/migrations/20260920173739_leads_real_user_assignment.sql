-- Sentinel Fort
-- Real-user lead assignment foundation.
-- `assigned_to` is the canonical authenticated user UUID.
-- Legacy `owner` remains temporarily for backward compatibility.

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS assigned_to UUID;

COMMENT ON COLUMN public.leads.assigned_to IS
'Authenticated user UUID assigned to this lead. Canonical assignment identity; legacy owner text retained temporarily.';

CREATE INDEX IF NOT EXISTS leads_assigned_to_idx
ON public.leads(assigned_to);

CREATE INDEX IF NOT EXISTS leads_workspace_assigned_to_idx
ON public.leads(workspace_id, assigned_to);
