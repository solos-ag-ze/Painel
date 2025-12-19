-- create_policies_all_buckets.sql
-- Políticas sugeridas para buckets listados pelo usuário.
-- Rode este script no SQL Editor do Supabase (projeto -> SQL).
-- IMPORTANTE: reveja e adapte as policies restritivas para o padrão de nomes que você usa (prefixos por user/id_grupo_anex o).

-- dividas_financiamentos (sensível)
-- TEMPLATE BÁSICO (aplicar a buckets não sensíveis)
-- Substitua BUCKET_NAME pelo nome do bucket.
-- Permite escrita apenas a usuários autenticados; leitura fica controlada por bucket_id.

-- EXEMPLO:
-- CREATE POLICY "Allow authenticated insert into BUCKET_NAME" ON storage.objects
-- FOR INSERT
-- WITH CHECK (
--   auth.role() = 'authenticated' AND
--   bucket_id = 'BUCKET_NAME'
-- );

-- ==================================================================
-- 1) Policies para buckets menos sensíveis (usar template básico)

-- pragas_e_doencas
CREATE POLICY "Allow authenticated insert into pragas_e_doencas" ON storage.objects
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'pragas_e_doencas'
);

CREATE POLICY "Allow authenticated update pragas_e_doencas" ON storage.objects
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'pragas_e_doencas'
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'pragas_e_doencas'
);

CREATE POLICY "Allow authenticated delete pragas_e_doencas" ON storage.objects
FOR DELETE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'pragas_e_doencas'
);

CREATE POLICY "Allow select pragas_e_doencas" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'pragas_e_doencas'
);

-- atividades_agricolas
CREATE POLICY "Allow authenticated insert into atividades_agricolas" ON storage.objects
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'atividades_agricolas'
);

CREATE POLICY "Allow authenticated update atividades_agricolas" ON storage.objects
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'atividades_agricolas'
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'atividades_agricolas'
);

CREATE POLICY "Allow authenticated delete atividades_agricolas" ON storage.objects
FOR DELETE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'atividades_agricolas'
);

CREATE POLICY "Allow select atividades_agricolas" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'atividades_agricolas'
);

-- produtos
CREATE POLICY "Allow authenticated insert into produtos" ON storage.objects
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'produtos'
);

CREATE POLICY "Allow authenticated update produtos" ON storage.objects
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'produtos'
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'produtos'
);

CREATE POLICY "Allow authenticated delete produtos" ON storage.objects
FOR DELETE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'produtos'
);

CREATE POLICY "Allow select produtos" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'produtos'
);

-- Documento_Maquina (sugestão: permite escrita apenas a authenticaed)
CREATE POLICY "Allow authenticated insert into Documento_Maquina" ON storage.objects
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'Documento_Maquina'
);

CREATE POLICY "Allow authenticated update Documento_Maquina" ON storage.objects
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'Documento_Maquina'
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'Documento_Maquina'
);

CREATE POLICY "Allow authenticated delete Documento_Maquina" ON storage.objects
FOR DELETE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'Documento_Maquina'
);

CREATE POLICY "Allow select Documento_Maquina" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'Documento_Maquina'
);

-- ==================================================================
-- 2) Buckets sensíveis: aplicar policies mais restritivas (ownership by prefix)
-- Recomendo aplicar estas em vez das policies genéricas para os buckets sensíveis.

-- notas_fiscais (exige que o nome do arquivo comece com o user_id ou id_grupo_anexo)
-- Este exemplo assume que você grava arquivos como "<user_id>/..." ou "<id_grupo_anexo>/...".
CREATE POLICY "Notas_fiscais: user owns object (insert)" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'notas_fiscais' AND
  split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Notas_fiscais: user owns object (update)" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'notas_fiscais' AND
  split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'notas_fiscais' AND
  split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Notas_fiscais: user owns object (delete)" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'notas_fiscais' AND
  split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Notas_fiscais: select public" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'notas_fiscais'
);

-- dividas_financiamentos (sensível)
CREATE POLICY "Dividas: user owns object (insert)" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'dividas_financiamentos' AND
  split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Dividas: user owns object (update)" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'dividas_financiamentos' AND
  split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'dividas_financiamentos' AND
  split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Dividas: user owns object (delete)" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'dividas_financiamentos' AND
  split_part(name, '/', 1) = auth.uid()::text
);

-- SELECT policy para dividas_financiamentos: apenas o owner ou service_role
DROP POLICY IF EXISTS "Dividas: select owner-only" ON storage.objects;
CREATE POLICY "Dividas: select owner-only" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'dividas_financiamentos' AND
  (
    auth.role() = 'service_role' OR
    split_part(name, '/', 1) = auth.uid()::text
  )
);


-- ==================================================================
-- NOTAS FINAIS / INSTRUÇÕES
-- 1) Se você NÃO usa prefixo <user_id>/ no nome dos arquivos, adapte as policies
--    para usar outro critério (ex.: split_part(name, '_', 1) = auth.uid() ou
--    verificar id_grupo_anexo presente no nome).
-- 2) Para aplicar: copie este arquivo e execute no SQL Editor do Supabase.
-- 3) Teste com um usuário autenticado (garanta que o JWT esteja sendo setado no cliente).
-- 4) Se ocorrer erro "new row violates row-level security policy" cole o log aqui
--    que eu ajusto a policy específica.
-- 5) Depois de testar, ajuste as policies para serem o mais restritivas possíveis.
