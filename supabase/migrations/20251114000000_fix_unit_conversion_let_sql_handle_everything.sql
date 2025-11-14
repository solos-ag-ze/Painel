-- ============================================================================
-- MIGRATION: Correção definitiva do sistema de unidades
-- Data: 2025-11-14
-- Objetivo: SQL assume TODA responsabilidade de padronização e cálculos
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO DE PADRONIZAÇÃO DE UNIDADES
-- Remove espaços, parênteses e converte para minúscula
-- ============================================================================
CREATE OR REPLACE FUNCTION padronizar_unidade(unidade TEXT)
RETURNS TEXT AS $$
BEGIN
  IF unidade IS NULL THEN
    RETURN 'un';
  END IF;
  
  -- Remove espaços, parênteses e texto adicional, converte para minúscula
  -- Exemplos:
  -- "kg (quilo)" → "kg"
  -- "KG" → "kg"
  -- "kg " → "kg"
  -- "L (litro)" → "l"
  RETURN LOWER(TRIM(REGEXP_REPLACE(unidade, '\s*\(.*?\)', '', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 2. FUNÇÃO DE CONVERSÃO PARA UNIDADE BASE
-- Converte qualquer quantidade para a unidade base (mg para massa, mL para volume)
-- ============================================================================
CREATE OR REPLACE FUNCTION converter_para_unidade_base(
  quantidade NUMERIC,
  unidade TEXT
)
RETURNS TABLE(quantidade_base NUMERIC, unidade_base TEXT, tipo_unidade TEXT) AS $$
DECLARE
  unidade_padronizada TEXT;
BEGIN
  unidade_padronizada := padronizar_unidade(unidade);
  
  -- Unidades de MASSA (base: mg)
  IF unidade_padronizada IN ('ton', 't', 'tonelada', 'toneladas') THEN
    RETURN QUERY SELECT quantidade * 1000000000, 'mg'::TEXT, 'massa'::TEXT;
  ELSIF unidade_padronizada IN ('kg', 'kilo', 'quilo', 'kilogramas') THEN
    RETURN QUERY SELECT quantidade * 1000000, 'mg'::TEXT, 'massa'::TEXT;
  ELSIF unidade_padronizada IN ('g', 'grama', 'gramas') THEN
    RETURN QUERY SELECT quantidade * 1000, 'mg'::TEXT, 'massa'::TEXT;
  ELSIF unidade_padronizada IN ('mg', 'miligrama', 'miligramas') THEN
    RETURN QUERY SELECT quantidade, 'mg'::TEXT, 'massa'::TEXT;
  
  -- Unidades de VOLUME (base: mL)
  ELSIF unidade_padronizada IN ('l', 'litro', 'litros') THEN
    RETURN QUERY SELECT quantidade * 1000, 'mL'::TEXT, 'volume'::TEXT;
  ELSIF unidade_padronizada IN ('ml', 'mililitro', 'mililitros') THEN
    RETURN QUERY SELECT quantidade, 'mL'::TEXT, 'volume'::TEXT;
  
  -- Unidades genéricas (sem conversão)
  ELSE
    RETURN QUERY SELECT quantidade, 'un'::TEXT, 'unidade'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 3. FUNÇÃO DE CONVERSÃO DA UNIDADE BASE PARA QUALQUER UNIDADE
-- Converte de mg/mL para a unidade desejada
-- ============================================================================
CREATE OR REPLACE FUNCTION converter_de_unidade_base(
  quantidade_base NUMERIC,
  unidade_base TEXT,
  unidade_destino TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  unidade_destino_padronizada TEXT;
BEGIN
  unidade_destino_padronizada := padronizar_unidade(unidade_destino);
  
  -- Conversões de MASSA (de mg para...)
  IF unidade_base = 'mg' THEN
    IF unidade_destino_padronizada IN ('ton', 't', 'tonelada', 'toneladas') THEN
      RETURN quantidade_base / 1000000000;
    ELSIF unidade_destino_padronizada IN ('kg', 'kilo', 'quilo', 'kilogramas') THEN
      RETURN quantidade_base / 1000000;
    ELSIF unidade_destino_padronizada IN ('g', 'grama', 'gramas') THEN
      RETURN quantidade_base / 1000;
    ELSIF unidade_destino_padronizada IN ('mg', 'miligrama', 'miligramas') THEN
      RETURN quantidade_base;
    END IF;
  
  -- Conversões de VOLUME (de mL para...)
  ELSIF unidade_base = 'mL' THEN
    IF unidade_destino_padronizada IN ('l', 'litro', 'litros') THEN
      RETURN quantidade_base / 1000;
    ELSIF unidade_destino_padronizada IN ('ml', 'mililitro', 'mililitros') THEN
      RETURN quantidade_base;
    END IF;
  END IF;
  
  -- Se não encontrou conversão, retorna o valor original
  RETURN quantidade_base;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 4. FUNÇÃO PARA CALCULAR VALOR MÉDIO
-- Calcula o valor médio ponderado na unidade original do produto
-- ============================================================================
CREATE OR REPLACE FUNCTION calcular_valor_medio(p_produto_id BIGINT)
RETURNS NUMERIC AS $$
DECLARE
  v_unidade_original TEXT;
  v_valor_total NUMERIC;
  v_quantidade_inicial NUMERIC;
  v_valor_medio NUMERIC;
BEGIN
  -- Buscar informações do produto
  SELECT 
    unidade_valor_original,
    valor_total,
    quantidade_inicial
  INTO 
    v_unidade_original,
    v_valor_total,
    v_quantidade_inicial
  FROM estoque_de_produtos
  WHERE id = p_produto_id;
  
  -- Se não encontrou o produto ou não tem valor, retorna 0
  IF NOT FOUND OR v_valor_total IS NULL OR v_valor_total = 0 OR v_quantidade_inicial IS NULL OR v_quantidade_inicial = 0 THEN
    RETURN 0;
  END IF;
  
  -- Calcula valor médio: valor_total / quantidade_inicial
  -- Isso dá o valor por unidade ORIGINAL (ex: R$/kg, R$/L)
  v_valor_medio := v_valor_total / v_quantidade_inicial;
  
  RETURN COALESCE(v_valor_medio, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. TRIGGER PARA ATUALIZAR VALOR_MEDIO AUTOMATICAMENTE
-- ============================================================================
CREATE OR REPLACE FUNCTION atualizar_valor_medio()
RETURNS TRIGGER AS $$
BEGIN
  NEW.valor_medio := calcular_valor_medio(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_atualizar_valor_medio ON estoque_de_produtos;

-- Cria novo trigger
CREATE TRIGGER trigger_atualizar_valor_medio
  BEFORE INSERT OR UPDATE OF valor_total, quantidade_inicial, unidade_valor_original
  ON estoque_de_produtos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_medio();

-- ============================================================================
-- 6. ATUALIZAR TODOS OS PRODUTOS EXISTENTES
-- Recalcula valor_medio para todos os produtos
-- ============================================================================
UPDATE estoque_de_produtos
SET valor_medio = calcular_valor_medio(id)
WHERE valor_total IS NOT NULL AND valor_total > 0;

-- ============================================================================
-- 7. FUNÇÃO AUXILIAR: Converter quantidade entre unidades
-- Útil para conversões diretas no frontend
-- ============================================================================
CREATE OR REPLACE FUNCTION converter_quantidade(
  quantidade NUMERIC,
  unidade_origem TEXT,
  unidade_destino TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  quantidade_base NUMERIC;
  unidade_base TEXT;
BEGIN
  -- Primeiro converte para unidade base
  SELECT cb.quantidade_base, cb.unidade_base
  INTO quantidade_base, unidade_base
  FROM converter_para_unidade_base(quantidade, unidade_origem) cb;
  
  -- Depois converte da base para o destino
  RETURN converter_de_unidade_base(quantidade_base, unidade_base, unidade_destino);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================
COMMENT ON FUNCTION padronizar_unidade IS 'Padroniza unidades removendo espaços, parênteses e convertendo para minúscula';
COMMENT ON FUNCTION converter_para_unidade_base IS 'Converte quantidade para unidade base (mg para massa, mL para volume)';
COMMENT ON FUNCTION converter_de_unidade_base IS 'Converte quantidade da unidade base para qualquer unidade';
COMMENT ON FUNCTION calcular_valor_medio IS 'Calcula valor médio ponderado na unidade original do produto';
COMMENT ON FUNCTION converter_quantidade IS 'Converte quantidade diretamente entre duas unidades';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
