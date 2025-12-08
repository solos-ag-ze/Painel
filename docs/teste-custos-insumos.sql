-- Script de Teste: Custos de Insumos por Talhão
-- Este script ajuda a diagnosticar e verificar os dados necessários para o cálculo

-- ========================================
-- 1. VERIFICAR ATIVIDADES AGRÍCOLAS
-- ========================================
-- Lista atividades do último mês com seus produtos
SELECT 
  la.atividade_id,
  la.nome_atividade,
  la.data_atividade,
  COUNT(DISTINCT lp.id) as qtd_produtos,
  COUNT(DISTINCT lt.talhao_id) as qtd_talhoes
FROM lancamentos_agricolas la
LEFT JOIN lancamento_produtos lp ON la.atividade_id = lp.atividade_id
LEFT JOIN lancamento_talhoes lt ON la.atividade_id = lt.atividade_id
WHERE la.data_atividade >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY la.atividade_id, la.nome_atividade, la.data_atividade
ORDER BY la.data_atividade DESC
LIMIT 20;

-- ========================================
-- 2. VERIFICAR PRODUTOS SEM CUSTO
-- ========================================
-- Produtos utilizados nas atividades que não têm custo_total_item calculado
SELECT DISTINCT
  lp.produto_id,
  lp.nome_produto,
  lp.custo_total_item,
  COUNT(lp.id) as vezes_usado
FROM lancamento_produtos lp
WHERE lp.custo_total_item IS NULL 
   OR lp.custo_total_item = 0
   OR lp.custo_total_item = ''
GROUP BY lp.produto_id, lp.nome_produto, lp.custo_total_item
ORDER BY vezes_usado DESC;

-- ========================================
-- 3. CUSTOS POR PRODUTO E TALHÃO
-- ========================================
-- Mostra quanto foi gasto de cada produto em cada talhão
SELECT 
  t.nome as talhao,
  lp.nome_produto as produto,
  SUM(lp.quantidade_val) as quantidade_total,
  lp.quantidade_un as unidade,
  SUM(CAST(lp.custo_total_item AS NUMERIC)) as custo_total
FROM lancamento_produtos lp
INNER JOIN lancamentos_agricolas la ON lp.atividade_id = la.atividade_id
INNER JOIN lancamento_talhoes lt ON la.atividade_id = lt.atividade_id
INNER JOIN talhoes t ON lt.talhao_id = t.id_talhao
WHERE la.data_atividade >= '2024-05-01' -- Início da safra 2024/2025
  AND la.data_atividade <= '2025-04-30' -- Fim da safra 2024/2025
  AND lp.custo_total_item IS NOT NULL
  AND CAST(lp.custo_total_item AS NUMERIC) > 0
GROUP BY t.nome, lp.nome_produto, lp.quantidade_un
ORDER BY t.nome, custo_total DESC;

-- ========================================
-- 4. RESUMO POR TALHÃO
-- ========================================
-- Total de custos de insumos por talhão na safra
SELECT 
  t.id_talhao,
  t.nome as talhao,
  t.area,
  COUNT(DISTINCT la.atividade_id) as qtd_atividades,
  COUNT(DISTINCT lp.produto_id) as qtd_produtos_diferentes,
  SUM(CAST(lp.custo_total_item AS NUMERIC)) as custo_total_insumos,
  ROUND(SUM(CAST(lp.custo_total_item AS NUMERIC)) / NULLIF(t.area, 0), 2) as custo_por_hectare
FROM talhoes t
LEFT JOIN lancamento_talhoes lt ON t.id_talhao = lt.talhao_id
LEFT JOIN lancamentos_agricolas la ON lt.atividade_id = la.atividade_id
LEFT JOIN lancamento_produtos lp ON la.atividade_id = lp.atividade_id
WHERE la.data_atividade >= '2024-05-01'
  AND la.data_atividade <= '2025-04-30'
  AND lp.custo_total_item IS NOT NULL
  AND CAST(lp.custo_total_item AS NUMERIC) > 0
  AND t.talhao_default = false
GROUP BY t.id_talhao, t.nome, t.area
ORDER BY custo_total_insumos DESC;

-- ========================================
-- 5. ATIVIDADES SEM PRODUTOS
-- ========================================
-- Lista atividades que não têm produtos vinculados
SELECT 
  la.atividade_id,
  la.nome_atividade,
  la.data_atividade,
  COUNT(lt.talhao_id) as qtd_talhoes
FROM lancamentos_agricolas la
LEFT JOIN lancamento_produtos lp ON la.atividade_id = lp.atividade_id
LEFT JOIN lancamento_talhoes lt ON la.atividade_id = lt.atividade_id
WHERE la.data_atividade >= CURRENT_DATE - INTERVAL '90 days'
  AND lp.id IS NULL
GROUP BY la.atividade_id, la.nome_atividade, la.data_atividade
ORDER BY la.data_atividade DESC;

-- ========================================
-- 6. ATIVIDADES SEM TALHÕES
-- ========================================
-- Lista atividades que não têm talhões vinculados
SELECT 
  la.atividade_id,
  la.nome_atividade,
  la.data_atividade,
  COUNT(lp.id) as qtd_produtos
FROM lancamentos_agricolas la
LEFT JOIN lancamento_produtos lp ON la.atividade_id = lp.atividade_id
LEFT JOIN lancamento_talhoes lt ON la.atividade_id = lt.atividade_id
WHERE la.data_atividade >= CURRENT_DATE - INTERVAL '90 days'
  AND lt.talhao_id IS NULL
GROUP BY la.atividade_id, la.nome_atividade, la.data_atividade
ORDER BY la.data_atividade DESC;

-- ========================================
-- 7. TOP 10 PRODUTOS MAIS USADOS
-- ========================================
SELECT 
  lp.produto_id,
  lp.nome_produto,
  COUNT(DISTINCT la.atividade_id) as qtd_atividades,
  SUM(lp.quantidade_val) as quantidade_total,
  lp.quantidade_un as unidade,
  SUM(CAST(lp.custo_total_item AS NUMERIC)) as custo_total
FROM lancamento_produtos lp
INNER JOIN lancamentos_agricolas la ON lp.atividade_id = la.atividade_id
WHERE la.data_atividade >= '2024-05-01'
  AND lp.custo_total_item IS NOT NULL
  AND CAST(lp.custo_total_item AS NUMERIC) > 0
GROUP BY lp.produto_id, lp.nome_produto, lp.quantidade_un
ORDER BY custo_total DESC
LIMIT 10;

-- ========================================
-- 8. EXEMPLO: NPK 10-10-10 no Talhão 1
-- ========================================
-- Mostra todos os usos de NPK no Talhão 1
SELECT 
  la.data_atividade,
  la.nome_atividade,
  t.nome as talhao,
  lp.nome_produto as produto,
  lp.quantidade_val,
  lp.quantidade_un,
  CAST(lp.custo_total_item AS NUMERIC) as custo
FROM lancamento_produtos lp
INNER JOIN lancamentos_agricolas la ON lp.atividade_id = la.atividade_id
INNER JOIN lancamento_talhoes lt ON la.atividade_id = lt.atividade_id
INNER JOIN talhoes t ON lt.talhao_id = t.id_talhao
WHERE LOWER(lp.nome_produto) LIKE '%npk%'
  AND t.nome = 'Talhão 1' -- Ajuste conforme o nome real
  AND la.data_atividade >= '2024-05-01'
ORDER BY la.data_atividade DESC;

-- ========================================
-- 9. VALIDAÇÃO DE CONSISTÊNCIA
-- ========================================
-- Verifica se há produtos com custo_total_item em formato inválido
SELECT 
  produto_id,
  nome_produto,
  custo_total_item,
  CASE 
    WHEN custo_total_item IS NULL THEN 'NULL'
    WHEN custo_total_item = '' THEN 'VAZIO'
    WHEN custo_total_item = '0' THEN 'ZERO'
    WHEN custo_total_item !~ '^[0-9]+\.?[0-9]*$' THEN 'FORMATO INVÁLIDO'
    ELSE 'OK'
  END as status_custo
FROM lancamento_produtos
WHERE produto_id IS NOT NULL
ORDER BY status_custo DESC, nome_produto;

-- ========================================
-- 10. COMPARAÇÃO DE MÉTODOS
-- ========================================
-- Compara o método antigo (proporcional) vs novo (atividades)
WITH custos_reais AS (
  -- Método novo: baseado em atividades com custo_total_item
  SELECT 
    t.id_talhao,
    t.nome,
    t.area,
    COALESCE(SUM(CAST(lp.custo_total_item AS NUMERIC)), 0) as custo_real
  FROM talhoes t
  LEFT JOIN lancamento_talhoes lt ON t.id_talhao = lt.talhao_id
  LEFT JOIN lancamentos_agricolas la ON lt.atividade_id = la.atividade_id
  LEFT JOIN lancamento_produtos lp ON la.atividade_id = lp.atividade_id
  WHERE la.data_atividade >= '2024-05-01'
    AND la.data_atividade <= '2025-04-30'
    AND t.talhao_default = false
  GROUP BY t.id_talhao, t.nome, t.area
),
total_geral AS (
  SELECT SUM(custo_real) as total FROM custos_reais
),
area_total AS (
  SELECT SUM(area) as total FROM custos_reais WHERE area > 0
)
SELECT 
  cr.nome as talhao,
  cr.area,
  cr.custo_real as metodo_novo,
  ROUND((tg.total * cr.area / at.total), 2) as metodo_antigo_proporcional,
  ROUND(cr.custo_real - (tg.total * cr.area / at.total), 2) as diferenca,
  ROUND(((cr.custo_real - (tg.total * cr.area / at.total)) / NULLIF((tg.total * cr.area / at.total), 0)) * 100, 1) as percentual_diferenca
FROM custos_reais cr
CROSS JOIN total_geral tg
CROSS JOIN area_total at
WHERE at.total > 0
ORDER BY ABS(cr.custo_real - (tg.total * cr.area / at.total)) DESC;
