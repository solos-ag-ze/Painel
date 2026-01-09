/*
  # Fix Storage Bucket RLS Policies
  
  1. Description
    - Fixes Row Level Security policies for all storage buckets
    - Allows authenticated users to upload, update, delete and select files
    - Applies proper ownership checks for sensitive buckets
    
  2. Buckets Affected
    - Documento_Maquina: General machine document storage
    - produtos: Product attachments  
    - notas_fiscais: Invoice documents (user-prefixed paths)
    - dividas_financiamentos: Debt/financing documents (user-prefixed paths)
    - pragas_e_doencas: Pest and disease images
    - atividades_agricolas: Agricultural activity attachments
    - documentos: General documents storage
    
  3. Security
    - All policies require authentication
    - Sensitive buckets use path-based ownership (split_part)
    - Public buckets allow any authenticated user
    
  4. Important Notes
    - Drops existing policies to avoid conflicts
    - Recreates all policies with correct permissions
    - Ensures users can upload, update, delete and view their files
*/

-- ========================================
-- Drop all existing policies on storage.objects
-- ========================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT pol.polname
    FROM pg_policy pol
    JOIN pg_class c ON pol.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'storage' AND c.relname = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', r.polname);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Documento_Maquina: Allow all authenticated users
-- ========================================
CREATE POLICY "Documento_Maquina: authenticated insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Documento_Maquina');

CREATE POLICY "Documento_Maquina: authenticated update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'Documento_Maquina')
WITH CHECK (bucket_id = 'Documento_Maquina');

CREATE POLICY "Documento_Maquina: authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'Documento_Maquina');

CREATE POLICY "Documento_Maquina: authenticated select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'Documento_Maquina');

-- ========================================
-- produtos: Allow all authenticated users
-- ========================================
CREATE POLICY "produtos: authenticated insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'produtos');

CREATE POLICY "produtos: authenticated update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'produtos')
WITH CHECK (bucket_id = 'produtos');

CREATE POLICY "produtos: authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'produtos');

CREATE POLICY "produtos: authenticated select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'produtos');

-- ========================================
-- documentos: Allow all authenticated users
-- ========================================
CREATE POLICY "documentos: authenticated insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "documentos: authenticated update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos')
WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "documentos: authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documentos');

CREATE POLICY "documentos: authenticated select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documentos');

-- ========================================
-- notas_fiscais: Owner-based access (user_id prefix)
-- ========================================
CREATE POLICY "notas_fiscais: owner insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notas_fiscais' AND
  split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "notas_fiscais: owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'notas_fiscais' AND
  split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'notas_fiscais' AND
  split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "notas_fiscais: owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'notas_fiscais' AND
  split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "notas_fiscais: owner select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'notas_fiscais' AND
  split_part(name, '/', 1) = auth.uid()::text
);

-- ========================================
-- dividas_financiamentos: Owner-based access
-- ========================================
CREATE POLICY "dividas_financiamentos: owner insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dividas_financiamentos' AND
  split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "dividas_financiamentos: owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dividas_financiamentos' AND
  split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'dividas_financiamentos' AND
  split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "dividas_financiamentos: owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dividas_financiamentos' AND
  split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "dividas_financiamentos: owner select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'dividas_financiamentos' AND
  split_part(name, '/', 1) = auth.uid()::text
);

-- ========================================
-- pragas_e_doencas: Owner-based or occurrence-based access
-- ========================================
CREATE POLICY "pragas_e_doencas: owner insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pragas_e_doencas' AND
  (
    split_part(name, '/', 1) = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.pragas_e_doencas p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "pragas_e_doencas: owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pragas_e_doencas' AND
  (
    split_part(name, '/', 1) = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.pragas_e_doencas p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'pragas_e_doencas' AND
  (
    split_part(name, '/', 1) = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.pragas_e_doencas p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "pragas_e_doencas: owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pragas_e_doencas' AND
  (
    split_part(name, '/', 1) = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.pragas_e_doencas p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "pragas_e_doencas: owner select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'pragas_e_doencas' AND
  (
    split_part(name, '/', 1) = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.pragas_e_doencas p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  )
);

-- ========================================
-- atividades_agricolas: Activity-based ownership
-- ========================================
CREATE POLICY "atividades_agricolas: activity owner insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'atividades_agricolas' AND
  EXISTS (
    SELECT 1 FROM public.lancamentos_agricolas a
    WHERE a.atividade_id::text = (substring(name FROM '^(?:imagens|arquivos)/([^/.]+)'))::text
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "atividades_agricolas: activity owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'atividades_agricolas' AND
  EXISTS (
    SELECT 1 FROM public.lancamentos_agricolas a
    WHERE a.atividade_id::text = (substring(name FROM '^(?:imagens|arquivos)/([^/.]+)'))::text
      AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'atividades_agricolas' AND
  EXISTS (
    SELECT 1 FROM public.lancamentos_agricolas a
    WHERE a.atividade_id::text = (substring(name FROM '^(?:imagens|arquivos)/([^/.]+)'))::text
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "atividades_agricolas: activity owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'atividades_agricolas' AND
  EXISTS (
    SELECT 1 FROM public.lancamentos_agricolas a
    WHERE a.atividade_id::text = (substring(name FROM '^(?:imagens|arquivos)/([^/.]+)'))::text
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "atividades_agricolas: activity owner select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'atividades_agricolas' AND
  EXISTS (
    SELECT 1 FROM public.lancamentos_agricolas a
    WHERE a.atividade_id::text = (substring(name FROM '^(?:imagens|arquivos)/([^/.]+)'))::text
      AND a.user_id = auth.uid()
  )
);