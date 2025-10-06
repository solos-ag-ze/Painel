/*
  # Sistema de Anexos Compartilhados para Transações Parceladas

  ## Objetivo
  Permitir que múltiplas parcelas de uma mesma transação compartilhem o mesmo arquivo
  no storage, evitando duplicação e mantendo consistência.

  ## Mudanças

  1. Novos Campos
    - `anexo_compartilhado_url`: URL do arquivo compartilhado entre parcelas
    - `id_grupo_anexo`: Identificador único para o grupo de anexo (usado como nome do arquivo)
    - `parcela_com_anexo_original`: Indica qual parcela possui o arquivo original no storage

  2. Índices
    - Índice em `id_transacao_pai` para melhorar queries de parcelas relacionadas
    - Índice em `id_grupo_anexo` para buscar todas as transações com mesmo anexo

  3. Segurança
    - Mantém as políticas RLS existentes
    - Anexos são acessíveis apenas pelo proprietário da transação

  ## Lógica de Funcionamento

  Para transações parceladas:
  - `id_grupo_anexo` = `id_transacao_pai` (todas as parcelas usam o ID da transação pai)
  - Arquivo no storage: `{id_grupo_anexo}.jpg`
  - Todas as parcelas têm a mesma URL em `anexo_compartilhado_url`

  Para transações individuais:
  - `id_grupo_anexo` = `id_transacao` (próprio ID)
  - Arquivo no storage: `{id_transacao}.jpg`
  - Comportamento retrocompatível com sistema anterior
*/

-- 1. Adicionar campo para URL do anexo compartilhado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes_financeiras' AND column_name = 'anexo_compartilhado_url'
  ) THEN
    ALTER TABLE transacoes_financeiras 
    ADD COLUMN anexo_compartilhado_url text;
    
    COMMENT ON COLUMN transacoes_financeiras.anexo_compartilhado_url IS 
    'URL do arquivo compartilhado entre parcelas da mesma transação';
  END IF;
END $$;

-- 2. Adicionar campo para identificador do grupo de anexo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes_financeiras' AND column_name = 'id_grupo_anexo'
  ) THEN
    ALTER TABLE transacoes_financeiras 
    ADD COLUMN id_grupo_anexo uuid;
    
    COMMENT ON COLUMN transacoes_financeiras.id_grupo_anexo IS 
    'Identificador usado para nomear o arquivo no storage. Para parcelas = id_transacao_pai, para individuais = id_transacao';
  END IF;
END $$;

-- 3. Adicionar campo para indicar parcela com anexo original
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes_financeiras' AND column_name = 'parcela_com_anexo_original'
  ) THEN
    ALTER TABLE transacoes_financeiras 
    ADD COLUMN parcela_com_anexo_original boolean DEFAULT false;
    
    COMMENT ON COLUMN transacoes_financeiras.parcela_com_anexo_original IS 
    'Indica se esta parcela foi usada para upload do arquivo original no storage';
  END IF;
END $$;

-- 4. Criar índice para melhorar performance em queries de parcelas relacionadas
CREATE INDEX IF NOT EXISTS idx_transacoes_id_transacao_pai 
ON transacoes_financeiras(id_transacao_pai) 
WHERE id_transacao_pai IS NOT NULL;

-- 5. Criar índice para buscar transações por grupo de anexo
CREATE INDEX IF NOT EXISTS idx_transacoes_id_grupo_anexo 
ON transacoes_financeiras(id_grupo_anexo) 
WHERE id_grupo_anexo IS NOT NULL;

-- 6. Inicializar id_grupo_anexo para transações existentes
-- Para transações que são parcelas (têm id_transacao_pai), usa o ID do pai
-- Para transações individuais, usa o próprio id_transacao
UPDATE transacoes_financeiras
SET id_grupo_anexo = COALESCE(id_transacao_pai, id_transacao)
WHERE id_grupo_anexo IS NULL;

-- 7. Criar função para propagar URL de anexo para todas as parcelas de um grupo
CREATE OR REPLACE FUNCTION propagar_anexo_para_parcelas()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma transação recebe um anexo compartilhado, propaga para todas as parcelas do mesmo grupo
  IF NEW.anexo_compartilhado_url IS NOT NULL AND NEW.id_grupo_anexo IS NOT NULL THEN
    UPDATE transacoes_financeiras
    SET anexo_compartilhado_url = NEW.anexo_compartilhado_url
    WHERE id_grupo_anexo = NEW.id_grupo_anexo
      AND id_transacao != NEW.id_transacao
      AND (anexo_compartilhado_url IS NULL OR anexo_compartilhado_url != NEW.anexo_compartilhado_url);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Criar trigger para propagar anexos automaticamente
DROP TRIGGER IF EXISTS trigger_propagar_anexo ON transacoes_financeiras;

CREATE TRIGGER trigger_propagar_anexo
  AFTER UPDATE OF anexo_compartilhado_url ON transacoes_financeiras
  FOR EACH ROW
  WHEN (NEW.anexo_compartilhado_url IS DISTINCT FROM OLD.anexo_compartilhado_url)
  EXECUTE FUNCTION propagar_anexo_para_parcelas();

-- 9. Criar função para limpar anexos quando transação é excluída
CREATE OR REPLACE FUNCTION limpar_anexo_ao_excluir()
RETURNS TRIGGER AS $$
DECLARE
  outras_parcelas_count INTEGER;
BEGIN
  -- Se era a parcela com anexo original, marca outra parcela do grupo
  IF OLD.parcela_com_anexo_original = true AND OLD.id_grupo_anexo IS NOT NULL THEN
    -- Conta quantas outras parcelas existem no mesmo grupo
    SELECT COUNT(*) INTO outras_parcelas_count
    FROM transacoes_financeiras
    WHERE id_grupo_anexo = OLD.id_grupo_anexo
      AND id_transacao != OLD.id_transacao
      AND ativo = true;
    
    -- Se houver outras parcelas, marca a primeira como tendo o anexo original
    IF outras_parcelas_count > 0 THEN
      UPDATE transacoes_financeiras
      SET parcela_com_anexo_original = true
      WHERE id_transacao = (
        SELECT id_transacao
        FROM transacoes_financeiras
        WHERE id_grupo_anexo = OLD.id_grupo_anexo
          AND id_transacao != OLD.id_transacao
          AND ativo = true
        LIMIT 1
      );
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Criar trigger para limpar anexos
DROP TRIGGER IF EXISTS trigger_limpar_anexo ON transacoes_financeiras;

CREATE TRIGGER trigger_limpar_anexo
  BEFORE DELETE ON transacoes_financeiras
  FOR EACH ROW
  EXECUTE FUNCTION limpar_anexo_ao_excluir();

-- 11. Comentários finais para documentação
COMMENT ON TRIGGER trigger_propagar_anexo ON transacoes_financeiras IS 
'Propaga automaticamente a URL do anexo para todas as parcelas do mesmo grupo quando uma transação recebe anexo';

COMMENT ON TRIGGER trigger_limpar_anexo ON transacoes_financeiras IS 
'Garante que outra parcela do grupo seja marcada como tendo o anexo original quando uma transação é excluída';
