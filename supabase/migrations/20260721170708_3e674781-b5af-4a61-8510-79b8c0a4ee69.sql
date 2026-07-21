
-- Drop overly permissive SELECT policies that leak data across workspaces
DROP POLICY IF EXISTS "branding auth read" ON public.branding_settings;
DROP POLICY IF EXISTS "calls_select_roles" ON public.calls;
DROP POLICY IF EXISTS "feature_flags_select_roles" ON public.feature_flags;
DROP POLICY IF EXISTS "kie_chunks_select_roles" ON public.kie_doc_chunks;
DROP POLICY IF EXISTS "kie_documents_select_roles" ON public.kie_documents;
DROP POLICY IF EXISTS "leads_select_roles" ON public.leads;
DROP POLICY IF EXISTS "properties_select_roles" ON public.properties;
DROP POLICY IF EXISTS "prop_rel_select" ON public.property_relationships;
DROP POLICY IF EXISTS "workspaces_select_roles" ON public.workspaces;

-- branding_settings: workspace-scoped read
CREATE POLICY "branding ws read" ON public.branding_settings
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- properties: workspace-scoped read
CREATE POLICY "properties ws read" ON public.properties
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Tighten kie-docs storage insert to require an owning kie_documents row in the same workspace
DROP POLICY IF EXISTS "kie-docs ws insert" ON storage.objects;
CREATE POLICY "kie-docs ws insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kie-docs'
    AND EXISTS (
      SELECT 1 FROM public.kie_documents d
      WHERE d.storage_path = storage.objects.name
        AND public.is_workspace_member(auth.uid(), d.workspace_id)
    )
  );
