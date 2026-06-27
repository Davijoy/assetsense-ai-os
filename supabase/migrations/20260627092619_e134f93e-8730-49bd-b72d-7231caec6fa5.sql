
-- =========================================================================
-- REOS v1.0 — Phase 1: Multi-Tenant Foundation
-- =========================================================================

-- Enums --------------------------------------------------------------------
CREATE TYPE public.workspace_category AS ENUM ('INTERNAL', 'CUSTOMER', 'PARTNER');

CREATE TYPE public.workspace_type AS ENUM (
  -- CUSTOMER
  'BUYER', 'CHANNEL_PARTNER', 'COMPANY',
  -- INTERNAL
  'PLATFORM_ADMIN', 'EXECUTIVE', 'OPERATIONS', 'CUSTOMER_SUCCESS',
  'DATA_OPERATIONS', 'COMPLIANCE', 'SUPPORT',
  -- PARTNER
  'BANK', 'LENDER', 'LEGAL_FIRM', 'INSURANCE_PROVIDER',
  'PROPERTY_MANAGER', 'VALUATION_AGENCY', 'ESCROW_PROVIDER',
  'INSPECTION_AGENCY'
);

CREATE TYPE public.member_status AS ENUM ('active', 'invited', 'suspended');

-- Core tables --------------------------------------------------------------
CREATE TABLE public.workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    public.workspace_category NOT NULL,
  type        public.workspace_type     NOT NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  parent_id   UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workspaces TO authenticated;
GRANT ALL    ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL    ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE, -- NULL = system role
  name         TEXT NOT NULL,
  description  TEXT,
  is_system    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL    ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id)       ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL    ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,                          -- auth.users(id); no FK per project conventions
  role_id      UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  status       public.member_status NOT NULL DEFAULT 'active',
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX workspace_members_user_idx ON public.workspace_members(user_id);
GRANT SELECT ON public.workspace_members TO authenticated;
GRANT ALL    ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.feature_flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  flag_key     TEXT NOT NULL,
  enabled      BOOLEAN NOT NULL DEFAULT false,
  config       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, flag_key)
);
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL    ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  actor_id     UUID,
  action       TEXT NOT NULL,
  entity       TEXT NOT NULL,
  entity_id    TEXT,
  diff         JSONB NOT NULL DEFAULT '{}'::jsonb,
  ts           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_workspace_ts_idx ON public.audit_logs(workspace_id, ts DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL    ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer helpers -------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.workspace_members
  WHERE user_id = auth.uid() AND status = 'active'
  ORDER BY is_primary DESC, created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members m
    JOIN public.role_permissions rp ON rp.role_id = m.role_id
    JOIN public.permissions p       ON p.id = rp.permission_id
    WHERE m.user_id = _user_id AND m.status = 'active' AND p.code = _perm
  );
$$;

-- RLS policies on new tables ----------------------------------------------
CREATE POLICY "workspaces self-read"
  ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), id));

CREATE POLICY "permissions read all auth"
  ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "roles read system or own workspace"
  ON public.roles FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "role_permissions read all auth"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "members read own workspace"
  ON public.workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "flags read own workspace"
  ON public.feature_flags FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "audit read own workspace"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id));

-- Seed default internal workspace + roles + permissions --------------------
INSERT INTO public.workspaces (id, category, type, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-00000000d3f7',
  'INTERNAL', 'PLATFORM_ADMIN',
  'Sentinel Fort HQ', 'sentinel-fort-hq',
  jsonb_build_object('ai_mode', 'advisory', 'default', true)
);

INSERT INTO public.permissions (code, description) VALUES
  ('workspace.read',     'View workspace'),
  ('workspace.admin',    'Administer workspace'),
  ('leads.read',         'Read leads'),
  ('leads.write',        'Create/update leads'),
  ('properties.read',    'Read properties'),
  ('properties.write',   'Create/update properties'),
  ('calls.read',         'Read call activity'),
  ('deals.read',         'Read deals'),
  ('deals.write',        'Manage deals'),
  ('documents.read',     'Read documents'),
  ('documents.write',    'Upload/manage documents'),
  ('branding.write',     'Manage branding'),
  ('ai.invoke',          'Invoke AI agents'),
  ('ai.approve',         'Approve AI actions'),
  ('audit.read',         'Read audit logs'),
  ('flags.write',        'Manage feature flags');

INSERT INTO public.roles (id, workspace_id, name, description, is_system) VALUES
  ('00000000-0000-0000-0000-0000000ad301', NULL, 'platform_admin', 'Full platform access', true),
  ('00000000-0000-0000-0000-0000000ad302', NULL, 'member',         'Standard workspace member', true),
  ('00000000-0000-0000-0000-0000000ad303', NULL, 'viewer',         'Read-only access', true);

-- platform_admin = every permission
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-0000000ad301', id FROM public.permissions;

-- member = read+write app data, no admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-0000000ad302', id FROM public.permissions
WHERE code IN ('workspace.read','leads.read','leads.write','properties.read','properties.write',
               'calls.read','deals.read','deals.write','documents.read','documents.write','ai.invoke');

-- viewer = read-only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-0000000ad303', id FROM public.permissions
WHERE code LIKE '%.read';

-- Attach every existing auth user to the default workspace as platform_admin
INSERT INTO public.workspace_members (workspace_id, user_id, role_id, status, is_primary)
SELECT '00000000-0000-0000-0000-00000000d3f7',
       u.id,
       '00000000-0000-0000-0000-0000000ad301',
       'active', true
FROM auth.users u
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Default feature flags
INSERT INTO public.feature_flags (workspace_id, flag_key, enabled) VALUES
  ('00000000-0000-0000-0000-00000000d3f7', 'crm',                 true),
  ('00000000-0000-0000-0000-00000000d3f7', 'marketplace',         true),
  ('00000000-0000-0000-0000-00000000d3f7', 'ai_marketing',        true),
  ('00000000-0000-0000-0000-00000000d3f7', 'loans',               false),
  ('00000000-0000-0000-0000-00000000d3f7', 'insurance',           false),
  ('00000000-0000-0000-0000-00000000d3f7', 'deal_rooms',          true),
  ('00000000-0000-0000-0000-00000000d3f7', 'executive_analytics', true);

-- =========================================================================
-- Back-fill workspace_id on existing domain tables
-- =========================================================================
ALTER TABLE public.leads             ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.calls             ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.properties        ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.kie_documents     ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.branding_settings ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

UPDATE public.leads             SET workspace_id = '00000000-0000-0000-0000-00000000d3f7' WHERE workspace_id IS NULL;
UPDATE public.calls             SET workspace_id = '00000000-0000-0000-0000-00000000d3f7' WHERE workspace_id IS NULL;
UPDATE public.properties        SET workspace_id = '00000000-0000-0000-0000-00000000d3f7' WHERE workspace_id IS NULL;
UPDATE public.kie_documents     SET workspace_id = '00000000-0000-0000-0000-00000000d3f7' WHERE workspace_id IS NULL;
UPDATE public.branding_settings SET workspace_id = '00000000-0000-0000-0000-00000000d3f7' WHERE workspace_id IS NULL;

ALTER TABLE public.leads             ALTER COLUMN workspace_id SET NOT NULL,
                                     ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-00000000d3f7';
ALTER TABLE public.calls             ALTER COLUMN workspace_id SET NOT NULL,
                                     ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-00000000d3f7';
ALTER TABLE public.properties        ALTER COLUMN workspace_id SET NOT NULL,
                                     ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-00000000d3f7';
ALTER TABLE public.kie_documents     ALTER COLUMN workspace_id SET NOT NULL,
                                     ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-00000000d3f7';
ALTER TABLE public.branding_settings ALTER COLUMN workspace_id SET NOT NULL,
                                     ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-00000000d3f7';

CREATE INDEX leads_workspace_idx             ON public.leads(workspace_id);
CREATE INDEX calls_workspace_idx             ON public.calls(workspace_id);
CREATE INDEX properties_workspace_idx        ON public.properties(workspace_id);
CREATE INDEX kie_documents_workspace_idx     ON public.kie_documents(workspace_id);
CREATE INDEX branding_settings_workspace_idx ON public.branding_settings(workspace_id);

-- Replace existing "always true" policies with workspace-scoped policies.
-- (Public read on branding logos is preserved.)

-- leads
DROP POLICY IF EXISTS "leads auth read" ON public.leads;
CREATE POLICY "leads ws read"  ON public.leads  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- calls
DROP POLICY IF EXISTS "calls auth read" ON public.calls;
CREATE POLICY "calls ws read"  ON public.calls  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- properties (was public read for anon+authenticated; keep anon read for marketplace)
-- already public; leave as-is for marketplace browse.

-- kie_documents
DROP POLICY IF EXISTS "kie_docs auth read"   ON public.kie_documents;
DROP POLICY IF EXISTS "kie_docs auth insert" ON public.kie_documents;
DROP POLICY IF EXISTS "kie_docs auth update" ON public.kie_documents;
DROP POLICY IF EXISTS "kie_docs auth delete" ON public.kie_documents;
CREATE POLICY "kie_docs ws read"   ON public.kie_documents FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "kie_docs ws insert" ON public.kie_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "kie_docs ws update" ON public.kie_documents FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "kie_docs ws delete" ON public.kie_documents FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- branding_settings: keep public read for logos, scope writes to workspace members
DROP POLICY IF EXISTS "branding insert auth" ON public.branding_settings;
DROP POLICY IF EXISTS "branding update auth" ON public.branding_settings;
CREATE POLICY "branding ws insert" ON public.branding_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "branding ws update" ON public.branding_settings FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
