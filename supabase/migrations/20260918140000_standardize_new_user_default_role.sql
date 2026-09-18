-- =========================================================================
-- STANDARDIZE NEW USER DEFAULT ROLE (Additive forward migration)
-- =========================================================================
-- Location: supabase/migrations/20260918140000_standardize_new_user_default_role.sql
--
-- Purpose:
--   Permanently replaces legacy public.handle_new_user() first-user logic
--   (CASE WHEN user_count <= 1 THEN 'admin') with an unconditional safe-floor
--   'viewer'::public.app_role assignment for all ordinary self-signups.
--
-- Security Rules:
--   1. Every self-signup unconditionally receives the safe 'viewer' app_role.
--   2. No user registration order (first user vs Nth user) can auto-elevate.
--   3. Founder and Platform Administrator elevation remains strictly
--      out-of-band via supabase/admin/provision_founder_account.sql.
--   4. Preserves all profile creation, avatar, and metadata handling.
--   5. Execution permissions remain locked down (no public/anon execution).
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Every ordinary self-signup unconditionally receives the safe default 'viewer' role.
  -- Administrative elevation must be performed explicitly out-of-band.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger on auth.users: creates profile and unconditionally assigns safe default viewer app_role. Never auto-elevates first user to admin.';

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
