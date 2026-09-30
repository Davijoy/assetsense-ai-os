-- SENTINEL FORT — Phase 2D Production Hardening:
-- Concurrency-Safe Version Numbering & Transactional Restore RPCs

-- 1. Create Brand Version Snapshot RPC (Concurrency-Safe via Advisory Transaction Lock)
CREATE OR REPLACE FUNCTION public.create_brand_version_snapshot(
  p_workspace_id UUID,
  p_change_type TEXT,
  p_change_summary TEXT,
  p_snapshot JSONB,
  p_label TEXT DEFAULT NULL,
  p_restored_from_version_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_authorized BOOLEAN := FALSE;
  v_next_version INTEGER;
  v_inserted_row RECORD;
BEGIN
  -- 1. Get authenticated caller ID
  v_user_id := auth.uid();
  
  -- Defensively check authorization
  IF v_user_id IS NOT NULL THEN
    SELECT (
      public.has_role(v_user_id, 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        JOIN public.roles r ON wm.role_id = r.id
        WHERE wm.workspace_id = p_workspace_id
          AND wm.user_id = v_user_id
          AND wm.status = 'active'
          AND r.name IN ('admin', 'manager', 'sales_manager', 'workspace_admin', 'platform_admin')
      )
    ) INTO v_is_authorized;
  ELSE
    -- Service role / postgres superuser bypass for background maintenance & scripts
    IF current_setting('request.jwt.claim.role', true) = 'service_role' OR current_user = 'postgres' THEN
      v_is_authorized := TRUE;
    END IF;
  END IF;

  IF v_user_id IS NOT NULL AND NOT v_is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: User is not an administrator of workspace %', p_workspace_id;
  END IF;

  -- 2. Validate input parameters
  IF p_change_type NOT IN ('workspace_save', 'experience_save', 'workspace_reset', 'experience_reset', 'version_restore') THEN
    RAISE EXCEPTION 'Invalid change_type: %', p_change_type;
  END IF;

  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'Snapshot must be a valid JSON object';
  END IF;

  -- 3. Acquire workspace-scoped PostgreSQL advisory transaction lock
  PERFORM pg_advisory_xact_lock(hashtext('brand_version_ws_' || p_workspace_id::text));

  -- 4. Calculate next sequential version number under the transaction lock
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.brand_theme_versions
  WHERE workspace_id = p_workspace_id;

  -- 5. Insert new version record
  INSERT INTO public.brand_theme_versions (
    workspace_id,
    version_number,
    label,
    change_type,
    change_summary,
    snapshot,
    restored_from_version_id,
    is_current,
    created_by,
    created_at
  ) VALUES (
    p_workspace_id,
    v_next_version,
    p_label,
    p_change_type,
    p_change_summary,
    p_snapshot,
    p_restored_from_version_id,
    true,
    v_user_id,
    now()
  )
  RETURNING * INTO v_inserted_row;

  RETURN jsonb_build_object(
    'id', v_inserted_row.id,
    'workspace_id', v_inserted_row.workspace_id,
    'version_number', v_inserted_row.version_number,
    'label', v_inserted_row.label,
    'change_type', v_inserted_row.change_type,
    'change_summary', v_inserted_row.change_summary,
    'snapshot', v_inserted_row.snapshot,
    'restored_from_version_id', v_inserted_row.restored_from_version_id,
    'is_current', v_inserted_row.is_current,
    'created_by', v_inserted_row.created_by,
    'created_at', v_inserted_row.created_at
  );
END;
$$;


-- 2. Transactional Brand Version Restore RPC (All-or-Nothing Execution)
CREATE OR REPLACE FUNCTION public.restore_brand_theme_version(
  p_workspace_id UUID,
  p_target_version_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_authorized BOOLEAN := FALSE;
  v_target_version RECORD;
  v_snapshot JSONB;
  v_ws_theme JSONB;
  v_exp_overrides JSONB;
  v_exp_key TEXT;
  v_exp_val JSONB;
  v_next_version INTEGER;
  v_new_version RECORD;
  v_warnings TEXT[] := ARRAY[]::TEXT[];
  v_preset_id TEXT;
  v_motion_id TEXT;
  v_favicon_url TEXT;
BEGIN
  -- 1. Authenticate & Authorize
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT (
      public.has_role(v_user_id, 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        JOIN public.roles r ON wm.role_id = r.id
        WHERE wm.workspace_id = p_workspace_id
          AND wm.user_id = v_user_id
          AND wm.status = 'active'
          AND r.name IN ('admin', 'manager', 'sales_manager', 'workspace_admin', 'platform_admin')
      )
    ) INTO v_is_authorized;
  ELSE
    IF current_setting('request.jwt.claim.role', true) = 'service_role' OR current_user = 'postgres' THEN
      v_is_authorized := TRUE;
    END IF;
  END IF;

  IF v_user_id IS NOT NULL AND NOT v_is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: User is not an administrator of workspace %', p_workspace_id;
  END IF;

  -- 2. Acquire workspace-scoped PostgreSQL advisory transaction lock
  PERFORM pg_advisory_xact_lock(hashtext('brand_version_ws_' || p_workspace_id::text));

  -- 3. Load requested target version and verify ownership
  SELECT * INTO v_target_version
  FROM public.brand_theme_versions
  WHERE id = p_target_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target version % not found', p_target_version_id;
  END IF;

  IF v_target_version.workspace_id <> p_workspace_id THEN
    RAISE EXCEPTION 'Security violation: Version % does not belong to workspace %', p_target_version_id, p_workspace_id;
  END IF;

  v_snapshot := v_target_version.snapshot;
  IF v_snapshot IS NULL OR jsonb_typeof(v_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'Malformed snapshot in version %', p_target_version_id;
  END IF;

  v_ws_theme := v_snapshot->'workspaceTheme';
  IF v_ws_theme IS NULL OR jsonb_typeof(v_ws_theme) <> 'object' THEN
    RAISE EXCEPTION 'Invalid snapshot structure: missing workspaceTheme object';
  END IF;

  -- Validate preset ID & motion profile ID against supported design tokens
  v_preset_id := v_ws_theme->>'presetId';
  IF v_preset_id IS NOT NULL AND v_preset_id NOT IN ('clout_obsidian_gold', 'sovereign_emerald', 'cobalt_cyber', 'amethyst_executive', 'rose_platinum') THEN
    RAISE EXCEPTION 'Invalid theme preset ID in snapshot: %', v_preset_id;
  END IF;

  v_motion_id := v_ws_theme->>'motionProfileId';
  IF v_motion_id IS NOT NULL AND v_motion_id NOT IN ('off', 'subtle', 'executive', 'immersive') THEN
    RAISE EXCEPTION 'Invalid motion profile ID in snapshot: %', v_motion_id;
  END IF;

  -- 4. Historical Asset Verification against brand_assets
  v_favicon_url := COALESCE(v_snapshot->>'faviconUrl', v_ws_theme->>'faviconUrl');
  IF v_favicon_url IS NOT NULL AND length(trim(v_favicon_url)) > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.brand_assets
      WHERE workspace_id = p_workspace_id AND public_url = v_favicon_url
    ) THEN
      v_warnings := array_append(v_warnings, 'Historical favicon (' || v_favicon_url || ') was not found in active brand assets; resetting to default.');
      v_favicon_url := NULL;
    END IF;
  ELSE
    v_favicon_url := NULL;
  END IF;

  -- 5. Upsert Workspace Theme Settings in DB
  INSERT INTO public.workspace_theme_settings (
    workspace_id,
    preset_id,
    custom_colors,
    font_display,
    font_sans,
    font_scale,
    radius,
    motion_profile_id,
    atmosphere_config,
    component_config,
    favicon_url,
    updated_by,
    updated_at
  ) VALUES (
    p_workspace_id,
    COALESCE(v_ws_theme->>'presetId', 'clout_obsidian_gold'),
    COALESCE(v_ws_theme->'customColors', '{}'::jsonb),
    v_ws_theme->>'fontDisplay',
    v_ws_theme->>'fontSans',
    COALESCE((v_ws_theme->>'fontScale')::numeric, 1.0),
    v_ws_theme->>'radius',
    COALESCE(v_ws_theme->>'motionProfileId', 'executive'),
    COALESCE(v_ws_theme->'atmosphereConfig', '{}'::jsonb),
    COALESCE(v_ws_theme->'componentConfig', '{}'::jsonb),
    v_favicon_url,
    v_user_id,
    now()
  )
  ON CONFLICT (workspace_id) DO UPDATE SET
    preset_id = EXCLUDED.preset_id,
    custom_colors = EXCLUDED.custom_colors,
    font_display = EXCLUDED.font_display,
    font_sans = EXCLUDED.font_sans,
    font_scale = EXCLUDED.font_scale,
    radius = EXCLUDED.radius,
    motion_profile_id = EXCLUDED.motion_profile_id,
    atmosphere_config = EXCLUDED.atmosphere_config,
    component_config = EXCLUDED.component_config,
    favicon_url = EXCLUDED.favicon_url,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  -- 6. Atomically Replace Experience Overrides
  -- Clear all existing overrides for this workspace to eliminate stale records
  DELETE FROM public.workspace_experience_theme_overrides
  WHERE workspace_id = p_workspace_id;

  -- Re-populate only the experience overrides explicitly present in snapshot
  v_exp_overrides := v_snapshot->'experienceOverrides';
  IF v_exp_overrides IS NOT NULL AND jsonb_typeof(v_exp_overrides) = 'object' THEN
    FOR v_exp_key, v_exp_val IN SELECT * FROM jsonb_each(v_exp_overrides)
    LOOP
      IF v_exp_key IN ('platform_administrator', 'investor', 'developer_builder', 'sales_executive') THEN
        IF v_exp_val IS NOT NULL AND jsonb_typeof(v_exp_val) = 'object' AND v_exp_val <> '{}'::jsonb THEN
          INSERT INTO public.workspace_experience_theme_overrides (
            workspace_id,
            experience_type,
            overrides,
            updated_by,
            updated_at
          ) VALUES (
            p_workspace_id,
            v_exp_key,
            v_exp_val,
            v_user_id,
            now()
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 7. Create New Append-Only Version Recording the Restore
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.brand_theme_versions
  WHERE workspace_id = p_workspace_id;

  INSERT INTO public.brand_theme_versions (
    workspace_id,
    version_number,
    label,
    change_type,
    change_summary,
    snapshot,
    restored_from_version_id,
    is_current,
    created_by,
    created_at
  ) VALUES (
    p_workspace_id,
    v_next_version,
    'Rollback to v' || v_target_version.version_number::text,
    'version_restore',
    'Restored configuration from v' || v_target_version.version_number::text || COALESCE(' ("' || v_target_version.label || '")', ''),
    jsonb_set(
      v_snapshot,
      '{faviconUrl}',
      CASE WHEN v_favicon_url IS NULL THEN 'null'::jsonb ELSE to_jsonb(v_favicon_url) END
    ),
    v_target_version.id,
    true,
    v_user_id,
    now()
  )
  RETURNING * INTO v_new_version;

  RETURN jsonb_build_object(
    'success', true,
    'restored_version_number', v_new_version.version_number,
    'restored_version_id', v_new_version.id,
    'restored_from_version_id', v_target_version.id,
    'warnings', to_jsonb(v_warnings),
    'version', jsonb_build_object(
      'id', v_new_version.id,
      'workspace_id', v_new_version.workspace_id,
      'version_number', v_new_version.version_number,
      'label', v_new_version.label,
      'change_type', v_new_version.change_type,
      'change_summary', v_new_version.change_summary,
      'snapshot', v_new_version.snapshot,
      'restored_from_version_id', v_new_version.restored_from_version_id,
      'is_current', v_new_version.is_current,
      'created_by', v_new_version.created_by,
      'created_at', v_new_version.created_at
    )
  );
END;
$$;
