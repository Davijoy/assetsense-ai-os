-- Sentinel Fort
-- Meta Lead Ads ingestion foundation.
--
-- Architecture:
--   Workspace -> Meta connection -> Meta lead forms
--   Meta webhook -> deduplicated event -> CRM lead
--
-- Security:
--   Integration credentials are server/service-role only.
--   Page/form routing is explicit and workspace-scoped.
--   No fallback to the default workspace is permitted.

-- ============================================================================
-- 1. Workspace-owned Meta connection
-- ============================================================================

CREATE TABLE public.meta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL
    REFERENCES public.workspaces(id) ON DELETE CASCADE,

  provider TEXT NOT NULL DEFAULT 'meta'
    CHECK (provider = 'meta'),

  page_id TEXT NOT NULL,
  page_name TEXT,

  -- Meta credentials must never be exposed through browser-side reads.
  -- Initial implementation stores the server-managed credential here.
  -- This may later move behind a dedicated secret-management layer.
  access_token TEXT,

  token_expires_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'error')),

  connected_by UUID,

  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, page_id),

  -- Supports a composite FK from form mappings so connection, workspace
  -- and Meta Page identity cannot disagree.
  UNIQUE (id, workspace_id, page_id)
);

CREATE INDEX meta_connections_workspace_idx
  ON public.meta_connections(workspace_id);

CREATE INDEX meta_connections_page_idx
  ON public.meta_connections(page_id);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

-- Deliberately no authenticated SELECT/INSERT/UPDATE/DELETE grants.
-- Webhook/OAuth server paths operate through the service role.
GRANT ALL ON public.meta_connections TO service_role;


-- ============================================================================
-- 2. Explicit Meta Page/Form -> Sentinel Workspace mapping
-- ============================================================================

CREATE TABLE public.meta_lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  connection_id UUID NOT NULL
    REFERENCES public.meta_connections(id) ON DELETE CASCADE,

  workspace_id UUID NOT NULL
    REFERENCES public.workspaces(id) ON DELETE CASCADE,

  page_id TEXT NOT NULL,
  form_id TEXT NOT NULL,
  form_name TEXT,

  active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A Meta form must resolve to exactly one Sentinel workspace.
  UNIQUE (page_id, form_id),

  -- Enforce that this mapping belongs to the same workspace + Page
  -- as its parent Meta connection.
  FOREIGN KEY (connection_id, workspace_id, page_id)
    REFERENCES public.meta_connections(id, workspace_id, page_id)
    ON DELETE CASCADE
);

CREATE INDEX meta_lead_forms_workspace_idx
  ON public.meta_lead_forms(workspace_id);

CREATE INDEX meta_lead_forms_connection_idx
  ON public.meta_lead_forms(connection_id);

CREATE INDEX meta_lead_forms_route_idx
  ON public.meta_lead_forms(page_id, form_id)
  WHERE active = true;

ALTER TABLE public.meta_lead_forms ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.meta_lead_forms TO service_role;


-- ============================================================================
-- 3. Deduplicated Meta webhook ingestion events
-- ============================================================================

CREATE TABLE public.meta_lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID
    REFERENCES public.workspaces(id) ON DELETE SET NULL,

  connection_id UUID
    REFERENCES public.meta_connections(id) ON DELETE SET NULL,

  form_mapping_id UUID
    REFERENCES public.meta_lead_forms(id) ON DELETE SET NULL,

  lead_id UUID
    REFERENCES public.leads(id) ON DELETE SET NULL,

  leadgen_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  form_id TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'received'
    CHECK (
      status IN (
        'received',
        'unmapped',
        'fetching',
        'fetched',
        'processing',
        'created',
        'duplicate',
        'failed'
      )
    ),

  attempt_count INTEGER NOT NULL DEFAULT 0
    CHECK (attempt_count >= 0),

  -- Operational diagnostics only. Do not store access tokens here.
  error_code TEXT,
  error_message TEXT,

  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Meta lead ID is the canonical ingestion idempotency key.
  UNIQUE (leadgen_id)
);

CREATE INDEX meta_lead_events_workspace_received_idx
  ON public.meta_lead_events(workspace_id, received_at DESC);

CREATE INDEX meta_lead_events_status_idx
  ON public.meta_lead_events(status);

CREATE INDEX meta_lead_events_route_idx
  ON public.meta_lead_events(page_id, form_id);

CREATE INDEX meta_lead_events_lead_idx
  ON public.meta_lead_events(lead_id)
  WHERE lead_id IS NOT NULL;

ALTER TABLE public.meta_lead_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.meta_lead_events TO service_role;


-- ============================================================================
-- 4. updated_at maintenance
-- ============================================================================

CREATE TRIGGER trg_meta_connections_updated
  BEFORE UPDATE ON public.meta_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_meta_lead_forms_updated
  BEFORE UPDATE ON public.meta_lead_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_meta_lead_events_updated
  BEFORE UPDATE ON public.meta_lead_events
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================================
-- SECURITY NOTE
-- ============================================================================
--
-- These tables intentionally expose no authenticated-user policies.
--
-- Meta OAuth connection management, webhook routing, credential access,
-- lead retrieval and event processing must execute through trusted
-- server-only paths.
--
-- A webhook event whose page_id + form_id has no active mapping must remain
-- unresolved/unmapped. It must never fall back to Sentinel Fort HQ or another
-- workspace.
