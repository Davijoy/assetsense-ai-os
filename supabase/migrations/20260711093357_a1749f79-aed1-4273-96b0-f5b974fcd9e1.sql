
-- 1. branding_settings: drop public SELECT policies, add authenticated-only
DROP POLICY IF EXISTS "branding read" ON public.branding_settings;
DROP POLICY IF EXISTS "branding_select_all" ON public.branding_settings;
CREATE POLICY "branding auth read" ON public.branding_settings
  FOR SELECT TO authenticated USING (true);

-- 2. profiles: own row only (admins retain full read)
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. properties: remove anon public read
DROP POLICY IF EXISTS "properties public read" ON public.properties;

-- 4. Global reference tables: drop broad "read all auth" and "auth.uid() IS NOT NULL"
--    Replace with active workspace membership requirement.
DROP POLICY IF EXISTS "documents_global read all auth" ON public.documents_global;
DROP POLICY IF EXISTS "documents_global_select_roles" ON public.documents_global;
CREATE POLICY "documents_global ws read" ON public.documents_global
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.user_id = auth.uid() AND m.status='active'));

DROP POLICY IF EXISTS "valuation_models read all auth" ON public.valuation_models;
DROP POLICY IF EXISTS "valuation_models_select_roles" ON public.valuation_models;
CREATE POLICY "valuation_models ws read" ON public.valuation_models
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.user_id = auth.uid() AND m.status='active'));

DROP POLICY IF EXISTS "property_embeddings read all auth" ON public.property_embeddings;
DROP POLICY IF EXISTS "property_embeddings_select_roles" ON public.property_embeddings;
CREATE POLICY "property_embeddings ws read" ON public.property_embeddings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.user_id = auth.uid() AND m.status='active'));

DROP POLICY IF EXISTS "properties_global read all auth" ON public.properties_global;
DROP POLICY IF EXISTS "properties_global_select_roles" ON public.properties_global;
CREATE POLICY "properties_global ws read" ON public.properties_global
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.user_id = auth.uid() AND m.status='active'));

DROP POLICY IF EXISTS "locations read all auth" ON public.locations;
DROP POLICY IF EXISTS "locations_select_roles" ON public.locations;
CREATE POLICY "locations ws read" ON public.locations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.user_id = auth.uid() AND m.status='active'));

DROP POLICY IF EXISTS "market_data read all auth" ON public.market_data;
DROP POLICY IF EXISTS "market_data_select_roles" ON public.market_data;
CREATE POLICY "market_data ws read" ON public.market_data
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.user_id = auth.uid() AND m.status='active'));

DROP POLICY IF EXISTS "property_media read all auth" ON public.property_media;
DROP POLICY IF EXISTS "property_media_select_roles" ON public.property_media;
CREATE POLICY "property_media ws read" ON public.property_media
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.user_id = auth.uid() AND m.status='active'));

DROP POLICY IF EXISTS "permissions read all auth" ON public.permissions;
CREATE POLICY "permissions ws read" ON public.permissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.user_id = auth.uid() AND m.status='active'));

DROP POLICY IF EXISTS "role_permissions read all auth" ON public.role_permissions;
CREATE POLICY "role_permissions ws read" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.user_id = auth.uid() AND m.status='active'));

-- 5. kie_doc_chunks: drop broad true policies, scope via kie_documents workspace
DROP POLICY IF EXISTS "kie_chunks auth read" ON public.kie_doc_chunks;
DROP POLICY IF EXISTS "kie_chunks auth insert" ON public.kie_doc_chunks;
DROP POLICY IF EXISTS "kie_chunks auth update" ON public.kie_doc_chunks;
DROP POLICY IF EXISTS "kie_chunks auth delete" ON public.kie_doc_chunks;

CREATE POLICY "kie_chunks ws read" ON public.kie_doc_chunks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.kie_documents d
    WHERE d.id = kie_doc_chunks.document_id
      AND public.is_workspace_member(auth.uid(), d.workspace_id)
  ));
CREATE POLICY "kie_chunks ws insert" ON public.kie_doc_chunks
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.kie_documents d
    WHERE d.id = kie_doc_chunks.document_id
      AND public.is_workspace_member(auth.uid(), d.workspace_id)
  ));
CREATE POLICY "kie_chunks ws update" ON public.kie_doc_chunks
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.kie_documents d
    WHERE d.id = kie_doc_chunks.document_id
      AND public.is_workspace_member(auth.uid(), d.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.kie_documents d
    WHERE d.id = kie_doc_chunks.document_id
      AND public.is_workspace_member(auth.uid(), d.workspace_id)
  ));
CREATE POLICY "kie_chunks ws delete" ON public.kie_doc_chunks
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.kie_documents d
    WHERE d.id = kie_doc_chunks.document_id
      AND public.is_workspace_member(auth.uid(), d.workspace_id)
  ));

-- 6. kie-docs storage: verify workspace ownership via kie_documents.storage_path
DROP POLICY IF EXISTS "kie-docs auth read" ON storage.objects;
DROP POLICY IF EXISTS "kie-docs auth insert" ON storage.objects;
DROP POLICY IF EXISTS "kie-docs auth update" ON storage.objects;
DROP POLICY IF EXISTS "kie-docs auth delete" ON storage.objects;

CREATE POLICY "kie-docs ws read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kie-docs'
    AND EXISTS (
      SELECT 1 FROM public.kie_documents d
      WHERE d.storage_path = storage.objects.name
        AND public.is_workspace_member(auth.uid(), d.workspace_id)
    )
  );
CREATE POLICY "kie-docs ws insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kie-docs'
    AND EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.user_id = auth.uid() AND m.status='active'
    )
  );
CREATE POLICY "kie-docs ws update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'kie-docs'
    AND EXISTS (
      SELECT 1 FROM public.kie_documents d
      WHERE d.storage_path = storage.objects.name
        AND public.is_workspace_member(auth.uid(), d.workspace_id)
    )
  );
CREATE POLICY "kie-docs ws delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'kie-docs'
    AND EXISTS (
      SELECT 1 FROM public.kie_documents d
      WHERE d.storage_path = storage.objects.name
        AND public.is_workspace_member(auth.uid(), d.workspace_id)
    )
  );

-- 7. Lock down SECURITY DEFINER functions from anon (and public).
--    Authenticated retains EXECUTE where policies/app code need it.
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_workspace_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_properties(vector, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_kie_chunks(vector, integer) FROM PUBLIC, anon, authenticated;
