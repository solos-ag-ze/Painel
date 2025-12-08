-- Migração: Adicionar coluna entrada_referencia_id para sistema FIFO de entradas/saídas
-- Data: 2025-12-02
-- Descrição: Esta coluna permite que registros de SAÍDA referenciem a ENTRADA de origem,
--            possibilitando o controle FIFO (First In, First Out) do estoque.

-- 1. Adicionar coluna entrada_referencia_id (referência à entrada de origem para saídas)
ALTER TABLE estoque_de_produtos 
ADD COLUMN IF NOT EXISTS entrada_referencia_id INTEGER REFERENCES estoque_de_produtos(id);

-- 2. Criar índice para melhorar performance de buscas por entrada_referencia_id
CREATE INDEX IF NOT EXISTS idx_estoque_entrada_referencia 
ON estoque_de_produtos(entrada_referencia_id) 
WHERE entrada_referencia_id IS NOT NULL;

-- 3. Criar índice para melhorar performance de buscas por tipo_de_movimentacao
CREATE INDEX IF NOT EXISTS idx_estoque_tipo_movimentacao 
ON estoque_de_produtos(tipo_de_movimentacao) 
WHERE tipo_de_movimentacao IS NOT NULL;

-- 4. Criar índice composto para buscas de estoque por usuário e nome do produto
CREATE INDEX IF NOT EXISTS idx_estoque_user_nome_produto 
ON estoque_de_produtos(user_id, nome_do_produto);

-- 5. Criar índice para ordenação FIFO (created_at)
CREATE INDEX IF NOT EXISTS idx_estoque_created_at 
ON estoque_de_produtos(created_at);

-- 6. Comentários para documentação
COMMENT ON COLUMN estoque_de_produtos.entrada_referencia_id IS 
'ID da entrada de origem para registros de saída (FIFO). NULL para entradas.';

COMMENT ON COLUMN estoque_de_produtos.tipo_de_movimentacao IS 
'Tipo da movimentação: "entrada" para adições ao estoque, "saida" para retiradas. NULL é tratado como entrada (legado).';

-- 7. Garantir que tipo_de_movimentacao tenha valores válidos
-- (Opcional: adicionar constraint CHECK se desejar validação no banco)
-- ALTER TABLE estoque_de_produtos 
-- ADD CONSTRAINT chk_tipo_movimentacao 
-- CHECK (tipo_de_movimentacao IS NULL OR tipo_de_movimentacao IN ('entrada', 'saida'));
