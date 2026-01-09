-- ============================================
-- SCRIPT PARA CRIAR POLICY DE DELETE NO BUCKET
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- (Execute query por query, uma de cada vez)

-- 1. VERIFICAR POLICIES EXISTENTES DO BUCKET atividades_agricolas
-- Execute esta query PRIMEIRO para ver o padrão das policies existentes
SELECT 
  policyname,
  cmd AS operation,
  roles,
  qual AS using_expression
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (qual LIKE '%atividades_agricolas%' OR policyname LIKE '%atividades_agricolas%')
ORDER BY cmd, policyname;

-- 2. CRIAR POLICY DE DELETE (seguindo o padrão das existentes)
-- ⚠️ Só execute DEPOIS de ver o resultado da query #1
-- Se já existir uma policy de DELETE, ajuste o nome abaixo

-- Remover policy antiga se existir
DROP POLICY IF EXISTS "Allow authenticated delete atividades_agricolas" ON storage.objects;

-- Criar policy de DELETE no mesmo padrão das outras (UPDATE/SELECT)
CREATE POLICY "Allow authenticated delete atividades_agricolas"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'atividades_agricolas'
);

-- 3. VERIFICAR SE A POLICY DE DELETE FOI CRIADA COM SUCESSO
-- 3. VERIFICAR SE A POLICY DE DELETE FOI CRIADA COM SUCESSO
SELECT 
  policyname,
  cmd AS operation,
  roles,
  qual AS using_expression
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (qual LIKE '%atividades_agricolas%' OR policyname LIKE '%atividades_agricolas%')
  AND cmd = 'DELETE';

-- ============================================
-- VERIFICAÇÃO FINAL - TODAS AS POLICIES
-- ============================================

-- 4. LISTAR TODAS AS POLICIES DO BUCKET (incluindo a nova DELETE)
SELECT 
  policyname,
  cmd AS operation,
  roles,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Permite ver arquivos'
    WHEN cmd = 'INSERT' THEN '✅ Permite criar arquivos'
    WHEN cmd = 'UPDATE' THEN '✅ Permite atualizar/substituir arquivos'
    WHEN cmd = 'DELETE' THEN '✅ Permite deletar arquivos'
  END as description
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (qual LIKE '%atividades_agricolas%' OR policyname LIKE '%atividades_agricolas%')
ORDER BY cmd;

-- ============================================
-- RESULTADO ESPERADO DA QUERY #4:
-- ============================================
-- Você deve ver 4 policies (ou pelo menos 3):
-- - DELETE: Allow authenticated delete atividades_agricolas
-- - INSERT: (nome da policy existente)
-- - SELECT: (nome da policy existente)  
-- - UPDATE: (nome da policy existente)
--
-- Se DELETE aparecer na lista, está PRONTO! ✅
-- Teste a exclusão no painel após confirmar.
-- ============================================
