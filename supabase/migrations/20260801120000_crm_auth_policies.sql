-- Minimal CRM authorization fix for authenticated workspace members
-- Keeps workspace isolation, no public read access, and RLS enabled.

-- Helper to check "any of these roles"
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    DROP POLICY IF EXISTS "leads_select_roles" ON public.leads;
    CREATE POLICY "leads_select_roles" ON public.leads
      FOR SELECT TO authenticated
      USING (
        public.has_any_role(auth.uid(), ARRAY['admin','manager','agent','viewer']::public.app_role[])
        AND (
          public.is_workspace_member(auth.uid(), workspace_id)
          OR workspace_id IS NULL
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calls') THEN
    DROP POLICY IF EXISTS "calls_select_roles" ON public.calls;
    CREATE POLICY "calls_select_roles" ON public.calls
      FOR SELECT TO authenticated
      USING (
        public.has_any_role(auth.uid(), ARRAY['admin','manager','agent','viewer']::public.app_role[])
        AND (
          public.is_workspace_member(auth.uid(), workspace_id)
          OR workspace_id IS NULL
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties') THEN
    DROP POLICY IF EXISTS "properties_select_roles" ON public.properties;
    CREATE POLICY "properties_select_roles" ON public.properties
      FOR SELECT TO authenticated
      USING (
        public.has_any_role(auth.uid(), ARRAY['admin','manager','agent','viewer']::public.app_role[])
        AND (
          public.is_workspace_member(auth.uid(), workspace_id)
          OR workspace_id IS NULL
        )
      );
  END IF;
END $$;
