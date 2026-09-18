-- =========================================================================
-- PLATFORM ADMINISTRATOR WORKSPACE MEMBERS & AUDIT RLS POLICIES
-- =========================================================================
-- Location: supabase/migrations/20260918180000_admin_workspace_members_and_audit_rls.sql
--
-- Purpose:
--   Completes the Platform Administrator access control model by granting
--   verified platform administrators (holding app_role 'admin') the capability
--   to view and update workspace memberships (System A), manage sentinel profiles,
--   and record administrative audit logs across workspaces.
--
-- Security Rules:
--   1. Regular users (viewer, agent, builder, developer, manager) CANNOT read
--      or modify other users' workspace memberships outside their own workspace.
--   2. Only authenticated users with public.has_role(auth.uid(), 'admin') are
--      granted administrative cross-workspace membership read/write policies.
--   3. Non-admin users are strictly restricted to their own workspace memberships.
--   4. Preserves fail-closed workspace isolation and zero administrative leakage.
-- =========================================================================

-- 1. workspace_members: Allow platform admins to SELECT, UPDATE, INSERT, and DELETE
DROP POLICY IF EXISTS "members read own workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;

CREATE POLICY "workspace_members_select_policy"
  ON public.workspace_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_workspace_member(auth.uid(), workspace_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "workspace_members_update_admin" ON public.workspace_members;
CREATE POLICY "workspace_members_update_admin"
  ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "workspace_members_insert_admin" ON public.workspace_members;
CREATE POLICY "workspace_members_insert_admin"
  ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "workspace_members_delete_admin" ON public.workspace_members;
CREATE POLICY "workspace_members_delete_admin"
  ON public.workspace_members FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;

-- 2. sentinel_user_profiles: Allow platform admins to manage user experience profiles
DROP POLICY IF EXISTS "admins manage sentinel profiles" ON public.sentinel_user_profiles;
CREATE POLICY "admins manage sentinel profiles"
  ON public.sentinel_user_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT ALL ON public.sentinel_user_profiles TO authenticated;

-- 3. audit_logs: Allow platform admins and managers to insert audit trail records
DROP POLICY IF EXISTS "audit_logs_insert_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_admin"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

GRANT INSERT ON public.audit_logs TO authenticated;
