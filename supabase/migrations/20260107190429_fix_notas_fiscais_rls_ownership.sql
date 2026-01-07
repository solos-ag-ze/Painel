/*
  # Corrige RLS do bucket notas_fiscais para usar ownership via tabela

  1. Problema Identificado
    - As políticas atuais exigem que o path comece com user_id
    - Isso funciona em dev mas falha em prod quando o user_id não bate
    - O bucket atividades_agricolas funciona porque verifica ownership via tabela

  2. Solução
    - Criar políticas similares ao atividades_agricolas
    - Verificar ownership através da tabela transacoes_financeiras
    - Permitir acesso se:
      a) service_role (backend)
      b) prefixo do path é user_id do usuário
      c) file_id corresponde a id_transacao ou id_grupo_anexo do usuário

  3. Políticas Criadas
    - SELECT: service_role OU owner via prefix OU owner via transação
    - INSERT: service_role OU owner via prefix OU owner via transação  
    - UPDATE: service_role OU owner via prefix OU owner via transação
    - DELETE: service_role OU owner via prefix OU owner via transação
    
  4. Extração do file_id
    - Usa regexp para extrair o UUID do nome do arquivo
    - Aceita formatos: user_id/file_id.ext, arquivos/file_id.ext, file_id.ext
*/

-- Remover políticas antigas do notas_fiscais
DROP POLICY IF EXISTS "Notas_fiscais: user owns object (insert)" ON storage.objects;
DROP POLICY IF EXISTS "Notas_fiscais: user owns object (update)" ON storage.objects;
DROP POLICY IF EXISTS "Notas_fiscais: user owns object (delete)" ON storage.objects;
DROP POLICY IF EXISTS "Notas_fiscais: select public" ON storage.objects;
DROP POLICY IF EXISTS "Notas_fiscais: select owner-or-service" ON storage.objects;
DROP POLICY IF EXISTS "Notas fiscais: user owns transaction (insert)" ON storage.objects;
DROP POLICY IF EXISTS "Notas fiscais: user owns transaction (update)" ON storage.objects;
DROP POLICY IF EXISTS "Notas fiscais: user owns transaction (delete)" ON storage.objects;
DROP POLICY IF EXISTS "Notas fiscais: select owner-only" ON storage.objects;

-- SELECT: permite leitura se service_role, ou owner via prefix, ou owner via transação
CREATE POLICY "Notas fiscais: select owner-or-service-or-transaction" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'notas_fiscais' AND (
    auth.role() = 'service_role'
    OR split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.transacoes_financeiras t
      WHERE (
        t.id_transacao::text = regexp_replace(split_part(name, '/', array_length(string_to_array(name, '/'), 1)), '\.[^.]+$', '')
        OR t.id_grupo_anexo::text = regexp_replace(split_part(name, '/', array_length(string_to_array(name, '/'), 1)), '\.[^.]+$', '')
      )
      AND t.user_id::text = auth.uid()::text
    )
  )
);

-- INSERT: permite escrita se service_role, ou owner via prefix, ou owner via transação
CREATE POLICY "Notas fiscais: insert owner-or-service-or-transaction" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'notas_fiscais' AND (
    auth.role() = 'service_role'
    OR split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.transacoes_financeiras t
      WHERE (
        t.id_transacao::text = regexp_replace(split_part(name, '/', array_length(string_to_array(name, '/'), 1)), '\.[^.]+$', '')
        OR t.id_grupo_anexo::text = regexp_replace(split_part(name, '/', array_length(string_to_array(name, '/'), 1)), '\.[^.]+$', '')
      )
      AND t.user_id::text = auth.uid()::text
    )
  )
);

-- UPDATE: permite atualização se service_role, ou owner via prefix, ou owner via transação
CREATE POLICY "Notas fiscais: update owner-or-service-or-transaction" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'notas_fiscais' AND (
    auth.role() = 'service_role'
    OR split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.transacoes_financeiras t
      WHERE (
        t.id_transacao::text = regexp_replace(split_part(name, '/', array_length(string_to_array(name, '/'), 1)), '\.[^.]+$', '')
        OR t.id_grupo_anexo::text = regexp_replace(split_part(name, '/', array_length(string_to_array(name, '/'), 1)), '\.[^.]+$', '')
      )
      AND t.user_id::text = auth.uid()::text
    )
  )
)
WITH CHECK (
  bucket_id = 'notas_fiscais' AND (
    auth.role() = 'service_role'
    OR split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.transacoes_financeiras t
      WHERE (
        t.id_transacao::text = regexp_replace(split_part(name, '/', array_length(string_to_array(name, '/'), 1)), '\.[^.]+$', '')
        OR t.id_grupo_anexo::text = regexp_replace(split_part(name, '/', array_length(string_to_array(name, '/'), 1)), '\.[^.]+$', '')
      )
      AND t.user_id::text = auth.uid()::text
    )
  )
);

-- DELETE: permite exclusão se service_role, ou owner via prefix, ou owner via transação
CREATE POLICY "Notas fiscais: delete owner-or-service-or-transaction" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'notas_fiscais' AND (
    auth.role() = 'service_role'
    OR split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.transacoes_financeiras t
      WHERE (
        t.id_transacao::text = regexp_replace(split_part(name, '/', array_length(string_to_array(name, '/'), 1)), '\.[^.]+$', '')
        OR t.id_grupo_anexo::text = regexp_replace(split_part(name, '/', array_length(string_to_array(name, '/'), 1)), '\.[^.]+$', '')
      )
      AND t.user_id::text = auth.uid()::text
    )
  )
);
