-- SENTINEL FORT — Phase 2C: Brand Assets & Workspace Theme Settings Persistence

-- 1. Brand Assets Table
CREATE TABLE IF NOT EXISTS public.brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('logos', 'favicons', 'backgrounds', 'watermarks', 'seals', 'social')),
  name text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  mime_type text,
  file_size integer,
  width integer,
  height integer,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_assets_ws_type ON public.brand_assets (workspace_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_brand_assets_active ON public.brand_assets (workspace_id, is_active);

-- Enable RLS on brand_assets
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

-- Read policy: Any authenticated or anon user can view branding assets for legitimate display
CREATE POLICY "brand_assets_read_policy" ON public.brand_assets
  FOR SELECT TO anon, authenticated
  USING (true);

-- Insert policy: Workspace Admins can upload brand assets for their workspace
CREATE POLICY "brand_assets_insert_policy" ON public.brand_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.roles r ON wm.role_id = r.id
      WHERE wm.workspace_id = brand_assets.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND r.name IN ('admin', 'manager', 'sales_manager', 'workspace_admin', 'platform_admin')
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Update policy: Workspace Admins can update their workspace assets
CREATE POLICY "brand_assets_update_policy" ON public.brand_assets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.roles r ON wm.role_id = r.id
      WHERE wm.workspace_id = brand_assets.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND r.name IN ('admin', 'manager', 'sales_manager', 'workspace_admin', 'platform_admin')
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Delete policy: Workspace Admins can delete their workspace assets
CREATE POLICY "brand_assets_delete_policy" ON public.brand_assets
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.roles r ON wm.role_id = r.id
      WHERE wm.workspace_id = brand_assets.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND r.name IN ('admin', 'manager', 'sales_manager', 'workspace_admin', 'platform_admin')
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 2. Workspace Theme Settings Table
CREATE TABLE IF NOT EXISTS public.workspace_theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  preset_id text NOT NULL DEFAULT 'clout_obsidian_gold',
  custom_colors jsonb DEFAULT '{}'::jsonb,
  font_display text DEFAULT '"Instrument Serif", ui-serif, Georgia, serif',
  font_sans text DEFAULT '"Work Sans", ui-sans-serif, system-ui, sans-serif',
  font_scale numeric DEFAULT 1.0,
  radius text DEFAULT '0.5rem',
  motion_profile_id text DEFAULT 'executive',
  atmosphere_config jsonb DEFAULT '{"enabled": true, "gridIntensity": "medium", "glowIntensity": "medium", "particleDensity": "medium", "driftIntensity": "medium", "watermarkVisibility": true}'::jsonb,
  component_config jsonb DEFAULT '{"elevation": "subtle", "borderStrength": "standard", "buttonShape": "sleek", "density": "comfortable", "glassEffect": "subtle"}'::jsonb,
  favicon_url text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ws_theme_settings_ws ON public.workspace_theme_settings (workspace_id);

-- Enable RLS on workspace_theme_settings
ALTER TABLE public.workspace_theme_settings ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone can read theme settings to render the workspace theme
CREATE POLICY "ws_theme_settings_read_policy" ON public.workspace_theme_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- Insert/Update/Upsert policy: Admin-only
CREATE POLICY "ws_theme_settings_write_policy" ON public.workspace_theme_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.roles r ON wm.role_id = r.id
      WHERE wm.workspace_id = workspace_theme_settings.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND r.name IN ('admin', 'manager', 'sales_manager', 'workspace_admin', 'platform_admin')
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 3. Storage Bucket Configuration for branding-assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding-assets', 'branding-assets', true)
ON CONFLICT (id) DO NOTHING;
