
-- Bucket privado para documentos da frota
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helper: extrai filial (primeiro segmento do path) e checa acesso
-- Convenção de path: <filial_id>/<modulo>/<entidade_id>/<arquivo>

CREATE POLICY "documentos_select_filial"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (storage.foldername(name))[1] = public.current_filial_id()::text
  )
);

CREATE POLICY "documentos_insert_filial"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (storage.foldername(name))[1] = public.current_filial_id()::text
  )
);

CREATE POLICY "documentos_update_filial"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documentos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (storage.foldername(name))[1] = public.current_filial_id()::text
  )
);

CREATE POLICY "documentos_delete_filial"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (storage.foldername(name))[1] = public.current_filial_id()::text
  )
);
