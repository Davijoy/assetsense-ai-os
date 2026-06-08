CREATE POLICY "kie-docs read" ON storage.objects FOR SELECT USING (bucket_id = 'kie-docs');
CREATE POLICY "kie-docs insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kie-docs');
CREATE POLICY "kie-docs update" ON storage.objects FOR UPDATE USING (bucket_id = 'kie-docs');
CREATE POLICY "kie-docs delete" ON storage.objects FOR DELETE USING (bucket_id = 'kie-docs');