-- ============================================
-- SCRIPT DE DIAGNÓSTICO: Anexos Manejo Agrícola
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- para verificar configurações de Storage e RLS

-- 1. VERIFICAR SE O BUCKET EXISTE
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE name = 'atividades_agricolas';

-- 2. LISTAR TODAS AS POLICIES DO BUCKET
SELECT 
  id,
  name,
  bucket_id,
  action,
  definition,
  check_expression
FROM storage.policies 
WHERE bucket_id = 'atividades_agricolas'
ORDER BY action;

-- 3. VERIFICAR SE EXISTEM POLICIES DE DELETE
SELECT 
  id,
  name,
  bucket_id,
  action,
  definition
FROM storage.policies 
WHERE bucket_id = 'atividades_agricolas' 
  AND action = 'DELETE';

-- 4. LISTAR ARQUIVOS NO BUCKET (PASTA IMAGENS)
-- Substitua 'SEU_USER_ID' pelo user_id real se necessário
SELECT * FROM storage.objects 
WHERE bucket_id = 'atividades_agricolas' 
  AND name LIKE 'imagens/%'
ORDER BY created_at DESC
LIMIT 20;

-- 5. LISTAR ARQUIVOS NO BUCKET (PASTA ARQUIVOS)
SELECT * FROM storage.objects 
WHERE bucket_id = 'atividades_agricolas' 
  AND name LIKE 'arquivos/%'
ORDER BY created_at DESC
LIMIT 20;

-- 6. VERIFICAR ESTADO DA TABELA lancamentos_agricolas
-- Substitua 'ATIVIDADE_ID_AQUI' pelo ID real da atividade que você está testando
SELECT 
  atividade_id,
  nome_atividade,
  esperando_por_anexo,
  created_at,
  updated_at
FROM lancamentos_agricolas 
WHERE atividade_id = 'ATIVIDADE_ID_AQUI';

-- 7. TESTAR SE O USUÁRIO ATUAL TEM PERMISSÃO PARA DELETAR
-- Execute isso LOGADO como o usuário que está usando o painel
-- Se retornar true, você tem permissão
SELECT auth.uid() as current_user_id;

-- 8. CRIAR POLICY DE DELETE SE NÃO EXISTIR (DESENVOLVIMENTO)
-- ⚠️ ATENÇÃO: Esta policy permite DELETE para qualquer usuário autenticado
-- Use apenas em DEV! Em PROD, ajuste conforme suas regras de negócio
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'atividades_agricolas');

-- 9. CRIAR POLICY DE DELETE COM FILTRO DE USER_ID (PRODUÇÃO)
-- Esta policy só permite deletar arquivos que estão na pasta do próprio usuário
-- Descomente se quiser usar esta abordagem:
/*
CREATE POLICY IF NOT EXISTS "Allow users to delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'atividades_agricolas' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
*/

-- 10. VERIFICAR SE HÁ ARQUIVOS "ÓRFÃOS" (sem atividade correspondente)
SELECT 
  so.name,
  so.created_at,
  la.atividade_id
FROM storage.objects so
LEFT JOIN lancamentos_agricolas la 
  ON so.name LIKE '%' || la.atividade_id || '%'
WHERE so.bucket_id = 'atividades_agricolas'
  AND la.atividade_id IS NULL
LIMIT 20;

-- ============================================
-- COMANDOS ÚTEIS PARA DEBUG
-- ============================================

-- FORÇAR ATUALIZAÇÃO DA FLAG (caso precise resetar manualmente)
-- Substitua 'ATIVIDADE_ID_AQUI' pelo ID real
-- UPDATE lancamentos_agricolas 
-- SET esperando_por_anexo = false 
-- WHERE atividade_id = 'ATIVIDADE_ID_AQUI';

-- DELETAR ARQUIVO MANUALMENTE DO STORAGE (último recurso)
-- Substitua 'PATH_COMPLETO' pelo caminho completo do arquivo
-- DELETE FROM storage.objects 
-- WHERE bucket_id = 'atividades_agricolas' 
--   AND name = 'imagens/ATIVIDADE_ID.jpg';
