/*
  # Add quantidade_inicial field to estoque_de_produtos

  1. Purpose
    - Store the original quantity entered by the user during product registration
    - This allows accurate historical tracking without retroactive calculations
    - Provides transparency to users about what they actually entered

  2. Changes
    - Add `quantidade_inicial` column to `estoque_de_produtos` table
    - Set as NUMERIC to match quantidade_em_estoque data type
    - NOT NULL with default value for data integrity

  3. Data Migration
    - For existing products without movements: quantidade_inicial = quantidade_em_estoque
    - For existing products with movements: quantidade_inicial = quantidade_em_estoque + total_saidas
    - This ensures historical data remains accurate

  4. Notes
    - The field stores quantity in the same standard unit as quantidade_em_estoque (mg or mL)
    - This maintains consistency with the unit conversion system
    - Future product registrations will store this value at creation time
*/

-- Add quantidade_inicial column
ALTER TABLE estoque_de_produtos
ADD COLUMN IF NOT EXISTS quantidade_inicial NUMERIC;

-- Add comment explaining the field
COMMENT ON COLUMN estoque_de_produtos.quantidade_inicial IS 
'Original quantity entered by user during product registration, stored in standard units (mg or mL). Used for accurate historical tracking.';

-- Populate quantidade_inicial for existing products
-- Calculate as: current stock + all exits (movements + activity usages)
DO $$
DECLARE
  produto_record RECORD;
  total_saidas NUMERIC;
  total_lancamentos NUMERIC;
BEGIN
  FOR produto_record IN 
    SELECT id, quantidade_em_estoque, unidade_de_medida
    FROM estoque_de_produtos
    WHERE quantidade_inicial IS NULL
  LOOP
    -- Calculate total exits from movimentacoes_estoque
    SELECT COALESCE(SUM(quantidade), 0) INTO total_saidas
    FROM movimentacoes_estoque
    WHERE produto_id = produto_record.id AND tipo = 'saida';
    
    -- Calculate total usage from lancamento_produtos
    SELECT COALESCE(SUM(quantidade_val), 0) INTO total_lancamentos
    FROM lancamento_produtos
    WHERE produto_id = produto_record.id;
    
    -- Set quantidade_inicial = current stock + all exits
    UPDATE estoque_de_produtos
    SET quantidade_inicial = produto_record.quantidade_em_estoque + total_saidas + total_lancamentos
    WHERE id = produto_record.id;
    
    RAISE NOTICE 'Product ID %: estoque=%, saidas=%, lancamentos=%, inicial=%', 
      produto_record.id, 
      produto_record.quantidade_em_estoque, 
      total_saidas, 
      total_lancamentos,
      produto_record.quantidade_em_estoque + total_saidas + total_lancamentos;
  END LOOP;
END $$;

-- Make the column NOT NULL after populating data
ALTER TABLE estoque_de_produtos
ALTER COLUMN quantidade_inicial SET NOT NULL;

-- Set default for future inserts
ALTER TABLE estoque_de_produtos
ALTER COLUMN quantidade_inicial SET DEFAULT 0;

-- Log completion
DO $$
DECLARE
  total_products INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products
  FROM estoque_de_produtos
  WHERE quantidade_inicial IS NOT NULL;
  
  RAISE NOTICE 'Successfully populated quantidade_inicial for % products', total_products;
END $$;