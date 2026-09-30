-- SENTINEL FORT — Phase 2D: Workspace Experience Overrides & Brand Version History

-- 1. Workspace Experience Theme Overrides Table
CREATE TABLE IF NOT EXISTS public.workspace_experience_theme_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  experience_type text NOT NULL CHECK (experience_type IN ('platform_administrator', 'investor', 'developer_builder', 'sales_executive')),
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_workspace_experience UNIQUE (workspace_id, experience_type)
);

CREATE INDEX IF NOT EXISTS idx_ws_experience_overrides ON public.workspace_experience_theme_overrides (workspace_id, experience_type);

-- Enable RLS on workspace_experience_theme_overrides
ALTER TABLE public.workspace_experience_theme_overrides ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone with valid workspace access can view experience branding
CREATE POLICY "ws_experience_overrides_read_policy" ON public.workspace_experience_theme_overrides
  FOR SELECT TO anon, authenticated
  USING (true);

-- Insert/Update/Delete policy: Workspace Admins only for their workspace
CREATE POLICY "ws_experience_overrides_write_policy" ON public.workspace_experience_theme_overrides
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.roles r ON wm.role_id = r.id
      WHERE wm.workspace_id = workspace_experience_theme_overrides.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND r.name IN ('admin', 'manager', 'sales_manager', 'workspace_admin', 'platform_admin')
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );


-- 2. Brand Theme Versions Table (Immutable Snapshots)
CREATE TABLE IF NOT EXISTS public.brand_theme_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  label text,
  change_type text NOT NULL CHECK (change_type IN ('workspace_save', 'experience_save', 'workspace_reset', 'experience_reset', 'version_restore')),
  change_summary text NOT NULL,
  snapshot jsonb NOT NULL,
  restored_from_version_id uuid REFERENCES public.brand_theme_versions(id) ON DELETE SET NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_workspace_version_number UNIQUE (workspace_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_brand_versions_ws_num ON public.brand_theme_versions (workspace_id, version_number DESC);

-- Enable RLS on brand_theme_versions
ALTER TABLE public.brand_theme_versions ENABLE ROW LEVEL SECURITY;

-- Read policy: Workspace members can view version history
CREATE POLICY "brand_theme_versions_read_policy" ON public.brand_theme_versions
  FOR SELECT TO anon, authenticated
  USING (true);

-- Insert policy: Workspace Admins only
CREATE POLICY "brand_theme_versions_insert_policy" ON public.brand_theme_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.roles r ON wm.role_id = r.id
      WHERE wm.workspace_id = brand_theme_versions.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND r.name IN ('admin', 'manager', 'sales_manager', 'workspace_admin', 'platform_admin')
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- No UPDATE or DELETE policies: brand_theme_versions is an append-only audit trail
