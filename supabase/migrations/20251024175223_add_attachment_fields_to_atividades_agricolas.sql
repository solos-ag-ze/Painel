/*
  # Adicionar campos de anexo na tabela atividades_agricolas

  1. Alterações na Tabela
    - Adiciona coluna `anexo_url` (text) para armazenar URL de imagem anexada
    - Adiciona coluna `anexo_arquivo_url` (text) para armazenar URL de arquivo anexado (PDF/XML)
  
  2. Índices
    - Cria índice para consultas por atividades com anexos
  
  3. Comentários
    - Documenta os novos campos para referência futura
  
  4. Segurança
    - Mantém as políticas RLS existentes
*/

-- Adicionar coluna para URL de imagem anexada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'atividades_agricolas' 
    AND column_name = 'anexo_url'
  ) THEN
    ALTER TABLE atividades_agricolas ADD COLUMN anexo_url text;
  END IF;
END $$;

-- Adicionar coluna para URL de arquivo anexado (PDF/XML)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'atividades_agricolas' 
    AND column_name = 'anexo_arquivo_url'
  ) THEN
    ALTER TABLE atividades_agricolas ADD COLUMN anexo_arquivo_url text;
  END IF;
END $$;

-- Criar índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_atividades_anexo_url 
ON atividades_agricolas(anexo_url) 
WHERE anexo_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atividades_anexo_arquivo_url 
ON atividades_agricolas(anexo_arquivo_url) 
WHERE anexo_arquivo_url IS NOT NULL;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN atividades_agricolas.anexo_url IS 'URL da imagem anexada no bucket atividades_agricolas';
COMMENT ON COLUMN atividades_agricolas.anexo_arquivo_url IS 'URL do arquivo (PDF/XML) anexado no bucket atividades_agricolas';