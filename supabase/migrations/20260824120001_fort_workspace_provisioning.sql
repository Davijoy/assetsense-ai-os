-- =========================================================================
-- FORT WORKSPACE PROVISIONING  (additive only — no destructive DDL)
-- =========================================================================
-- Creates the missing link between an authenticated identity and a workspace.
--
--     authenticated user
--           |
--     private FORT workspace        (new, parent_id NULL, no inheritance)
--           |
--     workspace_members             (existing table — NOT duplicated)
--           |
--     safe default role: viewer     (System A membership + global app_role)
--
-- APPROVED BUSINESS RULES ENCODED HERE
--   1. Self-signup users get their OWN PRIVATE workspace.
--   2. A new user is NEVER auto-joined to Sentinel Fort HQ
--      (00000000-0000-0000-0000-00000000d3f7). Hard-guarded below.
--   3. The default role is ALWAYS viewer. admin / manager / builder /
--      developer are never assigned by provisioning, under any condition.
--   4. Invited / suspended users are NOT auto-provisioned. The function
--      returns NULL and the caller renders "awaiting provisioning".
--   5. Idempotent: a user who already has an active membership gets that
--      workspace back — never a second one.
--
-- SECURITY
--   * SECURITY DEFINER, but the subject is ALWAYS auth.uid(). There is no
--     _user_id parameter, so one authenticated user can never provision,
--     join, or elevate another.
--   * No RLS policy is created, altered or dropped.
--   * No existing role, permission or membership row is modified.
--
-- DATA SAFETY (verified against every workspace_id column in this schema)
--   public.leads / calls / properties / kie_documents / branding_settings
--   carry DEFAULT '00000000-0000-0000-0000-00000000d3f7'. This function
--   creates NO domain rows whatsoever, so those defaults are never exercised
--   during provisioning and no new user's data can land in Sentinel Fort HQ.
--   All other workspace-scoped tables (deals, contacts, activities, market_*,
--   property_relationships, sentinel_user_profiles) have NO default and
--   require an explicit workspace_id from the caller.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.provision_fort_workspace()
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Internal platform workspace. New users are NEVER placed here.
  c_hq_workspace  CONSTANT UUID := '00000000-0000-0000-0000-00000000d3f7';

  v_user          UUID := auth.uid();
  v_existing      UUID;
  v_blocked       BOOLEAN;
  v_viewer_role   UUID;
  v_workspace     UUID;
  v_slug          TEXT;
  v_email         TEXT;
  v_name          TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'provision_fort_workspace: no authenticated user';
  END IF;

  -- (5) IDEMPOTENT — already a member somewhere: return that workspace.
  SELECT wm.workspace_id
    INTO v_existing
    FROM public.workspace_members wm
   WHERE wm.user_id = v_user
     AND wm.status  = 'active'
   ORDER BY wm.is_primary DESC, wm.created_at ASC
   LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- (4) An invitation or suspension is pending: the invitation/administrative
  -- path owns this user. Do NOT create a private workspace behind its back.
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members wm
     WHERE wm.user_id = v_user
       AND wm.status IN ('invited', 'suspended')
  ) INTO v_blocked;

  IF v_blocked THEN
    RETURN NULL;  -- caller renders "awaiting provisioning"
  END IF;

  -- Safe default membership role (System A, system-level viewer).
  SELECT r.id INTO v_viewer_role
    FROM public.roles r
   WHERE r.workspace_id IS NULL
     AND r.name = 'viewer'
   LIMIT 1;

  IF v_viewer_role IS NULL THEN
    -- Missing baseline seed — refuse rather than invent a role.
    RETURN NULL;
  END IF;

  -- Workspace identity is generated here so the slug can be derived from it.
  v_workspace := gen_random_uuid();

  -- (2) HARD GUARD — provisioning can never target the internal workspace.
  IF v_workspace = c_hq_workspace THEN
    RAISE EXCEPTION 'provision_fort_workspace: refusing to provision the internal workspace';
  END IF;

  v_slug := 'fort-' || substr(replace(v_workspace::text, '-', ''), 1, 12);

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_user;
  v_name := coalesce(nullif(split_part(coalesce(v_email, ''), '@', 1), ''), 'fort') || ' Fort';

  -- (1) Private workspace. parent_id is explicitly NULL: no hierarchy, so no
  -- inherited membership, no inherited data, no exposure of any other tenant.
  INSERT INTO public.workspaces (id, category, type, name, slug, parent_id, settings)
  VALUES (
    v_workspace,
    'CUSTOMER',
    'COMPANY',
    v_name,
    v_slug,
    NULL,
    jsonb_build_object(
      'private',         true,
      'provisioned_by',  'self_signup',
      'ai_mode',         'advisory'
    )
  );
  -- public_id (FORT-XXX####) is assigned by workspaces_assign_public_id_trg.

  -- (3) Membership: viewer, active, primary.
  INSERT INTO public.workspace_members (workspace_id, user_id, role_id, status, is_primary)
  VALUES (v_workspace, v_user, v_viewer_role, 'active', true)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- (3) Global app_role floor. Only when the user has NO roles at all — this
  -- never downgrades, never adds a second role, and never grants a privileged
  -- role. handle_new_user() normally does this at signup; this covers users
  -- created before that trigger existed or whose insert failed.
  INSERT INTO public.user_roles (user_id, role)
  SELECT v_user, 'viewer'::public.app_role
   WHERE NOT EXISTS (
     SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_user
   )
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Platform default feature flags for the new workspace. These are defaults,
  -- not a copy of Sentinel Fort HQ state — no HQ row is read.
  INSERT INTO public.feature_flags (workspace_id, flag_key, enabled) VALUES
    (v_workspace, 'crm',                 true),
    (v_workspace, 'marketplace',         true),
    (v_workspace, 'ai_marketing',        true),
    (v_workspace, 'loans',               false),
    (v_workspace, 'insurance',           false),
    (v_workspace, 'deal_rooms',          true),
    (v_workspace, 'executive_analytics', true)
  ON CONFLICT DO NOTHING;

  RETURN v_workspace;
END;
$$;

COMMENT ON FUNCTION public.provision_fort_workspace() IS
  'Provision a private FORT workspace for auth.uid(). Idempotent. Always assigns the viewer role. Never joins Sentinel Fort HQ, never grants a privileged role, never accepts a caller-supplied user or workspace id. Returns NULL when provisioning cannot be safely determined (pending invitation / suspended / missing baseline seed).';

REVOKE EXECUTE ON FUNCTION public.provision_fort_workspace() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.provision_fort_workspace() TO authenticated, service_role;
