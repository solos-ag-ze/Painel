/*
  # Fix valor_unitario Calculation for Existing Products

  1. Problem
    - valor_unitario was calculated based on original unit (kg, L) but stored quantity is in standard unit (mg, mL)
    - This causes valor_total to be incorrectly calculated: quantidade_em_estoque (mg) × valor_unitario (per kg)
    - Results in absurdly large total values

  2. Solution
    - Recalculate valor_unitario for all existing products
    - valor_unitario should be: valor_total / quantidade_em_estoque (both in standard units)
    - This ensures correct calculation: quantidade_em_estoque × valor_unitario = valor_total

  3. Logic
    - For each product with valor_total > 0 and quantidade_em_estoque > 0
    - Recalculate: valor_unitario = valor_total / quantidade_em_estoque
    - This makes valor_unitario represent the price per standard unit (mg or mL)

  4. Safety
    - Only updates products where calculation is possible (both values > 0)
    - Preserves valor_total (the original purchase price)
    - Maintains unidade_valor_original for future reference
*/

-- Recalculate valor_unitario for all existing products
UPDATE estoque_de_produtos
SET valor_unitario = CASE 
  WHEN quantidade_em_estoque > 0 AND valor_total > 0 
  THEN valor_total / quantidade_em_estoque 
  ELSE valor_unitario 
END
WHERE quantidade_em_estoque > 0 AND valor_total IS NOT NULL;

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM estoque_de_produtos
  WHERE quantidade_em_estoque > 0 AND valor_total > 0;
  
  RAISE NOTICE 'Updated valor_unitario for % products', updated_count;
END $$;