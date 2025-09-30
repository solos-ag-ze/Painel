/*
  # Corrigir permissões da tabela cotacao_diaria_cafe

  1. Verificar e ajustar RLS
  2. Criar políticas de acesso público para leitura
  3. Garantir que a aplicação consiga ler os dados
*/

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'cotacao_diaria_cafe';

-- Desabilitar RLS temporariamente para teste (se necessário)
ALTER TABLE cotacao_diaria_cafe DISABLE ROW LEVEL SECURITY;

-- Ou criar política pública de leitura se RLS estiver habilitado
DO $$
BEGIN
  -- Verificar se RLS está habilitado
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'cotacao_diaria_cafe' 
    AND rowsecurity = true
  ) THEN
    -- Criar política de leitura pública
    DROP POLICY IF EXISTS "Cotacao publica para leitura" ON cotacao_diaria_cafe;
    
    CREATE POLICY "Cotacao publica para leitura"
      ON cotacao_diaria_cafe
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Garantir que os dados existem
INSERT INTO cotacao_diaria_cafe (id, cultura, municipio, preco, variacao) 
VALUES (1, 'Café', 'Guaxupé/MG (Cooxupé)', 'R$1.959,00', '+1,03')
ON CONFLICT (id) DO UPDATE SET
  cultura = EXCLUDED.cultura,
  municipio = EXCLUDED.municipio,
  preco = EXCLUDED.preco,
  variacao = EXCLUDED.variacao;

-- Verificar se os dados foram inseridos
SELECT * FROM cotacao_diaria_cafe WHERE id = 1;