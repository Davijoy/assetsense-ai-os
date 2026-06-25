
-- branding_settings: keep public SELECT (logo on landing), restrict writes
DROP POLICY IF EXISTS "branding insert" ON public.branding_settings;
DROP POLICY IF EXISTS "branding update" ON public.branding_settings;
CREATE POLICY "branding insert auth" ON public.branding_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "branding update auth" ON public.branding_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
REVOKE INSERT, UPDATE ON public.branding_settings FROM anon;
GRANT INSERT, UPDATE ON public.branding_settings TO authenticated;

-- calls: restrict SELECT to authenticated
DROP POLICY IF EXISTS "calls public read" ON public.calls;
CREATE POLICY "calls auth read" ON public.calls FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.calls FROM anon;

-- leads: restrict SELECT to authenticated
DROP POLICY IF EXISTS "leads public read" ON public.leads;
CREATE POLICY "leads auth read" ON public.leads FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.leads FROM anon;

-- kie_documents: restrict all to authenticated
DROP POLICY IF EXISTS "kie_docs delete" ON public.kie_documents;
DROP POLICY IF EXISTS "kie_docs insert" ON public.kie_documents;
DROP POLICY IF EXISTS "kie_docs read" ON public.kie_documents;
DROP POLICY IF EXISTS "kie_docs update" ON public.kie_documents;
CREATE POLICY "kie_docs auth read" ON public.kie_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "kie_docs auth insert" ON public.kie_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "kie_docs auth update" ON public.kie_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "kie_docs auth delete" ON public.kie_documents FOR DELETE TO authenticated USING (true);
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.kie_documents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kie_documents TO authenticated;

-- kie_doc_chunks: restrict all to authenticated
DROP POLICY IF EXISTS "kie_chunks delete" ON public.kie_doc_chunks;
DROP POLICY IF EXISTS "kie_chunks insert" ON public.kie_doc_chunks;
DROP POLICY IF EXISTS "kie_chunks read" ON public.kie_doc_chunks;
CREATE POLICY "kie_chunks auth read" ON public.kie_doc_chunks FOR SELECT TO authenticated USING (true);
CREATE POLICY "kie_chunks auth insert" ON public.kie_doc_chunks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "kie_chunks auth delete" ON public.kie_doc_chunks FOR DELETE TO authenticated USING (true);
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.kie_doc_chunks FROM anon;
GRANT SELECT, INSERT, DELETE ON public.kie_doc_chunks TO authenticated;

-- Storage bucket kie-docs: restrict policies to authenticated
DROP POLICY IF EXISTS "kie-docs read" ON storage.objects;
DROP POLICY IF EXISTS "kie-docs insert" ON storage.objects;
DROP POLICY IF EXISTS "kie-docs update" ON storage.objects;
DROP POLICY IF EXISTS "kie-docs delete" ON storage.objects;
CREATE POLICY "kie-docs auth read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kie-docs');
CREATE POLICY "kie-docs auth insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kie-docs');
CREATE POLICY "kie-docs auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'kie-docs') WITH CHECK (bucket_id = 'kie-docs');
CREATE POLICY "kie-docs auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'kie-docs');
