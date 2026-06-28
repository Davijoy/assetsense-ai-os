
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

-- =========================================================
-- LEADS  (admin/manager/agent full, viewer read-only)
-- =========================================================
DROP POLICY IF EXISTS "Authenticated read leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated manage leads" ON public.leads;

CREATE POLICY "leads_select_roles" ON public.leads
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','agent','viewer']::public.app_role[]));

CREATE POLICY "leads_insert_roles" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','agent']::public.app_role[]));

CREATE POLICY "leads_update_roles" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','agent']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','agent']::public.app_role[]));

CREATE POLICY "leads_delete_roles" ON public.leads
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

-- =========================================================
-- CALLS
-- =========================================================
DROP POLICY IF EXISTS "Authenticated read calls" ON public.calls;
DROP POLICY IF EXISTS "Authenticated manage calls" ON public.calls;

CREATE POLICY "calls_select_roles" ON public.calls
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','agent','viewer']::public.app_role[]));

CREATE POLICY "calls_insert_roles" ON public.calls
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','agent']::public.app_role[]));

CREATE POLICY "calls_update_roles" ON public.calls
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','agent']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','agent']::public.app_role[]));

CREATE POLICY "calls_delete_roles" ON public.calls
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

-- =========================================================
-- PROPERTIES (legacy) + PROPERTIES_GLOBAL + property_media + property_embeddings
-- All signed-in read; admin/manager write
-- =========================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['properties','properties_global','property_media','property_embeddings','market_data','locations','valuation_models','documents_global']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_all_auth', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated read %1$I" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated manage %1$I" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "%1$I_select" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "%1$I_write" ON public.%1$I', t);

    EXECUTE format($f$
      CREATE POLICY "%1$s_select_roles" ON public.%1$I
        FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "%1$s_write_roles" ON public.%1$I
        FOR ALL TO authenticated
        USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
        WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
    $f$, t);
  END LOOP;
END $$;

-- =========================================================
-- WORKSPACES / MEMBERS / FLAGS / AUDIT
-- =========================================================
DROP POLICY IF EXISTS "workspaces_select" ON public.workspaces;
CREATE POLICY "workspaces_select_roles" ON public.workspaces
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "workspaces_write_admin" ON public.workspaces
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "feature_flags_select" ON public.feature_flags;
CREATE POLICY "feature_flags_select_roles" ON public.feature_flags
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "feature_flags_write_roles" ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

-- =========================================================
-- BRANDING (all read, admin write)
-- =========================================================
DROP POLICY IF EXISTS "branding_settings_select" ON public.branding_settings;
DROP POLICY IF EXISTS "branding_settings_write" ON public.branding_settings;
DROP POLICY IF EXISTS "Public read branding" ON public.branding_settings;
DROP POLICY IF EXISTS "Authenticated manage branding" ON public.branding_settings;

CREATE POLICY "branding_select_all" ON public.branding_settings
  FOR SELECT USING (true);
CREATE POLICY "branding_write_admin" ON public.branding_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- KIE documents & chunks (admin/manager/agent read; admin/manager write)
-- =========================================================
DROP POLICY IF EXISTS "kie_documents_select" ON public.kie_documents;
DROP POLICY IF EXISTS "kie_documents_write" ON public.kie_documents;
DROP POLICY IF EXISTS "Authenticated read kie_documents" ON public.kie_documents;
DROP POLICY IF EXISTS "Authenticated manage kie_documents" ON public.kie_documents;

CREATE POLICY "kie_documents_select_roles" ON public.kie_documents
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','agent']::public.app_role[]));
CREATE POLICY "kie_documents_write_roles" ON public.kie_documents
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

DROP POLICY IF EXISTS "kie_doc_chunks_select" ON public.kie_doc_chunks;
DROP POLICY IF EXISTS "kie_doc_chunks_write" ON public.kie_doc_chunks;
DROP POLICY IF EXISTS "Authenticated read kie_doc_chunks" ON public.kie_doc_chunks;
DROP POLICY IF EXISTS "Authenticated manage kie_doc_chunks" ON public.kie_doc_chunks;

CREATE POLICY "kie_chunks_select_roles" ON public.kie_doc_chunks
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','agent']::public.app_role[]));
CREATE POLICY "kie_chunks_write_roles" ON public.kie_doc_chunks
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

-- =========================================================
-- property_relationships, workspace_members, roles, role_permissions, permissions
-- Keep readable by signed in; modifications admin-only
-- =========================================================
DROP POLICY IF EXISTS "property_relationships_select" ON public.property_relationships;
DROP POLICY IF EXISTS "property_relationships_write" ON public.property_relationships;
CREATE POLICY "prop_rel_select" ON public.property_relationships
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "prop_rel_write" ON public.property_relationships
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));
