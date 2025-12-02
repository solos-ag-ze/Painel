-- ============================================
-- CORREÇÃO DA TRIGGER valor_medio
-- ============================================
-- O problema: valor_medio estava sendo calculado como:
--   valor_total / quantidade_inicial (em mg/mL)
-- 
-- O correto é calcular como:
--   valor_total / quantidade_inicial (na unidade ORIGINAL do usuário)
--
-- Como quantidade_inicial é salvo em mg/mL, precisamos converter
-- de volta para a unidade_valor_original antes de dividir.
-- ============================================

-- 1️⃣ Criar função auxiliar para converter de unidade padrão (mg/mL) para unidade original
CREATE OR REPLACE FUNCTION converter_de_unidade_padrao(
  p_quantidade NUMERIC,
  p_unidade_padrao TEXT,
  p_unidade_destino TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_fator NUMERIC;
BEGIN
  -- Se unidades são iguais, retorna a quantidade sem conversão
  IF p_unidade_padrao = p_unidade_destino THEN
    RETURN p_quantidade;
  END IF;

  -- Conversões de MASSA (mg → outras unidades)
  IF p_unidade_padrao = 'mg' THEN
    CASE p_unidade_destino
      WHEN 'g' THEN v_fator := 0.001;           -- 1 mg = 0.001 g
      WHEN 'kg' THEN v_fator := 0.000001;       -- 1 mg = 0.000001 kg
      WHEN 'ton' THEN v_fator := 0.000000001;   -- 1 mg = 0.000000001 ton
      ELSE v_fator := 1;
    END CASE;
    RETURN p_quantidade * v_fator;
  END IF;

  -- Conversões de VOLUME (mL → outras unidades)
  IF p_unidade_padrao = 'mL' THEN
    CASE p_unidade_destino
      WHEN 'L' THEN v_fator := 0.001;           -- 1 mL = 0.001 L
      ELSE v_fator := 1;
    END CASE;
    RETURN p_quantidade * v_fator;
  END IF;

  -- Se não é mg nem mL, retorna a quantidade original
  RETURN p_quantidade;
END;
$$;

-- 2️⃣ Atualizar a trigger para calcular valor_medio corretamente
CREATE OR REPLACE FUNCTION calcular_valor_medio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_quantidade_na_unidade_original NUMERIC;
  v_unidade_padrao TEXT;
  v_unidade_original TEXT;
BEGIN
  -- Validar dados antes de calcular
  IF NEW.quantidade_inicial IS NULL OR NEW.quantidade_inicial = 0 THEN
    NEW.valor_medio := 0;
    RETURN NEW;
  END IF;
  
  IF NEW.valor_total IS NULL THEN
    NEW.valor_medio := 0;
    RETURN NEW;
  END IF;

  -- Obter as unidades
  v_unidade_padrao := NEW.unidade_de_medida;  -- mg ou mL (unidade do banco)
  v_unidade_original := COALESCE(NEW.unidade_valor_original, NEW.unidade_de_medida);

  -- Converter quantidade_inicial de mg/mL para a unidade original
  v_quantidade_na_unidade_original := converter_de_unidade_padrao(
    NEW.quantidade_inicial,
    v_unidade_padrao,
    v_unidade_original
  );

  -- Calcular valor_medio na unidade original
  -- Ex: R$ 15.000 / 3000 kg = R$ 5/kg
  IF v_quantidade_na_unidade_original > 0 THEN
    NEW.valor_medio := NEW.valor_total / v_quantidade_na_unidade_original;
  ELSE
    NEW.valor_medio := 0;
  END IF;

  -- Log para debug (pode ser removido em produção)
  RAISE NOTICE 'calcular_valor_medio: quantidade_inicial=% %, convertido=% %, valor_total=%, valor_medio=%',
    NEW.quantidade_inicial, v_unidade_padrao,
    v_quantidade_na_unidade_original, v_unidade_original,
    NEW.valor_total, NEW.valor_medio;

  RETURN NEW;
END;
$$;

-- 3️⃣ Recriar o trigger (caso já exista)
DROP TRIGGER IF EXISTS trigger_calcular_valor_medio ON estoque_de_produtos;

CREATE TRIGGER trigger_calcular_valor_medio
  BEFORE INSERT OR UPDATE ON estoque_de_produtos
  FOR EACH ROW
  EXECUTE FUNCTION calcular_valor_medio();

-- 4️⃣ RECALCULAR todos os valor_medio existentes no banco
-- Isso corrige os produtos que já foram cadastrados com valor_medio errado
UPDATE estoque_de_produtos
SET valor_medio = CASE 
  WHEN quantidade_inicial > 0 AND valor_total IS NOT NULL THEN
    valor_total / converter_de_unidade_padrao(
      quantidade_inicial,
      unidade_de_medida,
      COALESCE(unidade_valor_original, unidade_de_medida)
    )
  ELSE 0
END;

-- 5️⃣ VERIFICAÇÃO - Mostrar produtos com novo valor_medio calculado
SELECT 
  id,
  nome_do_produto,
  quantidade_inicial,
  unidade_de_medida AS unidade_banco,
  unidade_valor_original,
  valor_total,
  valor_medio,
  ROUND(valor_medio::numeric, 2) AS valor_medio_arredondado
FROM estoque_de_produtos
WHERE user_id = 'c7f13743-67ef-45d4-807c-9f5de81d4999'
ORDER BY created_at DESC
LIMIT 10;
