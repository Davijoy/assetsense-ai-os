-- =========================================================================
-- REPAIR: workspace member with no global app_role  (one-time data fix)
-- =========================================================================
-- Fixes the discovered condition:
--
--     workspace_members row EXISTS        -> current_workspace_id() resolves
--     public.user_roles rows = 0          -> every module renders LOCKED
--
-- The Phase-1 migration (20260627092619) attached every auth user that existed
-- AT THAT TIME to Sentinel Fort HQ as `platform_admin`. The app_role system
-- (20260628075652) landed afterwards, so those accounts were never given a row
-- in public.user_roles — leaving the platform owner authenticated, workspaced,
-- and role-less.
--
-- THIS IS A RULE, NOT A USER ID.
--   Subject set = accounts that ALREADY hold an active `platform_admin`
--   membership of the INTERNAL Sentinel Fort HQ workspace AND have zero rows
--   in public.user_roles.
--
--   * No user UUID is hardcoded here or anywhere in application code.
--   * No application-level "owner bypass" is introduced. The repaired account
--     resolves through the normal pipeline:
--         auth -> workspace_members -> user_roles -> requireRoles -> RLS
--   * This is a ONE-TIME backfill, not a trigger. It cannot elevate any
--     future signup: new users have no HQ membership, so they are not in the
--     subject set. Re-running it is a no-op once roles exist.
--   * Accounts that already have ANY app_role are untouched (no upgrade, no
--     downgrade).
-- =========================================================================

INSERT INTO public.user_roles (user_id, role)
SELECT wm.user_id, 'admin'::public.app_role
  FROM public.workspace_members wm
 WHERE wm.workspace_id = '00000000-0000-0000-0000-00000000d3f7'  -- Sentinel Fort HQ
   AND wm.role_id      = '00000000-0000-0000-0000-0000000ad301'  -- platform_admin
   AND wm.status       = 'active'
   AND NOT EXISTS (
     SELECT 1 FROM public.user_roles ur WHERE ur.user_id = wm.user_id
   )
ON CONFLICT (user_id, role) DO NOTHING;
