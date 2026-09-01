REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE POLICY "own body photos read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'body-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own body photos write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'body-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own body photos update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'body-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own body photos delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'body-photos' AND auth.uid()::text = (storage.foldername(name))[1]);