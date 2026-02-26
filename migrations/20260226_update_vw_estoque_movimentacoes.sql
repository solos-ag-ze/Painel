-- Migration: Corrige referência de tabela e expõe quantidade/unidade originais
-- Created: 2026-02-26

BEGIN;

-- Se a view existir com colunas diferentes, DROP evita erro de rename
DROP VIEW IF EXISTS public.vw_estoque_movimentacoes_completas CASCADE;

CREATE VIEW public.vw_estoque_movimentacoes_completas AS
SELECT
  m.id AS movimento_id,
  m.user_id,
  m.produto_id,
  p.nome AS nome_produto,
  p.unidade_base,
  p.categoria,
  p.marca_ou_fabricante AS marca,
  p.fornecedor AS fornecedor_produto,
  p.registro_mapa AS registro_mapa_produto,
  m.local_id,
  l.nome AS nome_local_estoque,
  m.tipo_movimento,
  m.quantidade_base,
  -- Quantidade/unidade originais (quando presentes nos itens do documento)
  -- Valida e normaliza string antes de converter para numeric (aceita ',' como decimal)
  CASE
    WHEN edi.quantidade IS NULL THEN NULL
    WHEN trim(edi.quantidade::text) = '' THEN NULL
    WHEN replace(trim(edi.quantidade::text), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$' THEN replace(trim(edi.quantidade::text), ',', '.')::numeric
    ELSE NULL
  END AS quantidade_documento,
  -- Quantidade do documento convertida para a unidade base do produto (quando possível)
  -- Regras simples: mL <-> L, g <-> kg. Para outros pares será NULL.
  (
    CASE
      WHEN (
        CASE
          WHEN edi.quantidade IS NULL THEN NULL
          WHEN trim(edi.quantidade::text) = '' THEN NULL
          WHEN replace(trim(edi.quantidade::text), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$' THEN replace(trim(edi.quantidade::text), ',', '.')::numeric
          ELSE NULL
        END
      ) IS NULL THEN NULL
      ELSE (
        CASE
          WHEN lower(edi.unidade::text) = lower(p.unidade_base::text) THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric)
          WHEN lower(edi.unidade::text) IN ('ml') AND lower(p.unidade_base::text) IN ('l') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) / 1000
          WHEN lower(edi.unidade::text) IN ('l') AND lower(p.unidade_base::text) IN ('ml') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) * 1000
          WHEN lower(edi.unidade::text) IN ('g') AND lower(p.unidade_base::text) IN ('kg') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) / 1000
          WHEN lower(edi.unidade::text) IN ('kg') AND lower(p.unidade_base::text) IN ('g') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) * 1000
          ELSE NULL
        END
      )
    END
  ) AS quantidade_documento_em_base,
  edi.unidade AS unidade_documento,
  -- Custo por unidade na unidade base (para permitir cálculo proporcional)
  (
    CASE
      WHEN m.quantidade_base IS NULL OR m.quantidade_base = 0 THEN NULL
      ELSE (
        CASE
          WHEN m.tipo_movimento IN ('SAIDA', 'APLICACAO') THEN COALESCE((
            SELECT SUM(c.custo_unitario_base * c.quantidade_base)
            FROM estoque_consumos_fifo c
            WHERE c.movimento_saida_id = m.id
          ), 0) / m.quantidade_base
          ELSE COALESCE(m.valor_total, 0) / m.quantidade_base
        END
      )
    END
  ) AS custo_por_unidade_base,
  -- Custo total da aplicação expresso na unidade do documento (quando possível)
  (
    CASE
      WHEN (
        CASE
          WHEN edi.quantidade IS NULL THEN NULL
          WHEN trim(edi.quantidade::text) = '' THEN NULL
          WHEN replace(trim(edi.quantidade::text), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$' THEN replace(trim(edi.quantidade::text), ',', '.')::numeric
          ELSE NULL
        END
      ) IS NULL THEN NULL
      WHEN (
        CASE
          WHEN lower(edi.unidade::text) = lower(p.unidade_base::text) THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric)
          WHEN lower(edi.unidade::text) IN ('ml') AND lower(p.unidade_base::text) IN ('l') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) / 1000
          WHEN lower(edi.unidade::text) IN ('l') AND lower(p.unidade_base::text) IN ('ml') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) * 1000
          WHEN lower(edi.unidade::text) IN ('g') AND lower(p.unidade_base::text) IN ('kg') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) / 1000
          WHEN lower(edi.unidade::text) IN ('kg') AND lower(p.unidade_base::text) IN ('g') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) * 1000
          ELSE NULL
        END
      ) IS NULL THEN NULL
      ELSE (
        (
          CASE
            WHEN m.quantidade_base IS NULL OR m.quantidade_base = 0 THEN NULL
            ELSE (
              CASE
                WHEN m.tipo_movimento IN ('SAIDA', 'APLICACAO') THEN COALESCE((
                  SELECT SUM(c.custo_unitario_base * c.quantidade_base)
                  FROM estoque_consumos_fifo c
                  WHERE c.movimento_saida_id = m.id
                ), 0) / m.quantidade_base
                ELSE COALESCE(m.valor_total, 0) / m.quantidade_base
              END
            )
          END
        ) * (
          CASE
            WHEN lower(edi.unidade::text) = lower(p.unidade_base::text) THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric)
            WHEN lower(edi.unidade::text) IN ('ml') AND lower(p.unidade_base::text) IN ('l') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) / 1000
            WHEN lower(edi.unidade::text) IN ('l') AND lower(p.unidade_base::text) IN ('ml') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) * 1000
            WHEN lower(edi.unidade::text) IN ('g') AND lower(p.unidade_base::text) IN ('kg') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) / 1000
            WHEN lower(edi.unidade::text) IN ('kg') AND lower(p.unidade_base::text) IN ('g') THEN (replace(trim(edi.quantidade::text), ',', '.')::numeric) * 1000
            ELSE NULL
          END
        )
      )
    END
  ) AS custo_total_aplicacao_documento,
  -- Valor unitário: para entradas, do próprio movimento; para saídas/aplicações, NULL (usar custo total)
  CASE
    WHEN m.tipo_movimento IN ('SAIDA', 'APLICACAO') THEN NULL
    ELSE m.custo_unitario_base
  END AS valor_unitario,
  p.unidade_base AS unidade_valor_original,
  -- Valor total: para saídas/aplicações, soma dos consumos FIFO; para entradas, do próprio movimento
  CASE
    WHEN m.tipo_movimento IN ('SAIDA', 'APLICACAO')
      THEN COALESCE((
        SELECT SUM(c.custo_unitario_base * c.quantidade_base)
        FROM estoque_consumos_fifo c
        WHERE c.movimento_saida_id = m.id
      ), 0)
    ELSE COALESCE(m.valor_total, 0)
  END AS valor_total,
  -- Custo total da aplicação: explicitamente para saídas/aplicações, igual ao valor_total acima
  CASE
    WHEN m.tipo_movimento IN ('SAIDA', 'APLICACAO')
      THEN COALESCE((
        SELECT SUM(c.custo_unitario_base * c.quantidade_base)
        FROM estoque_consumos_fifo c
        WHERE c.movimento_saida_id = m.id
      ), 0)
    ELSE NULL
  END AS custo_total_aplicacao,
  -- Custo calculado: para saídas/aplicações, igual ao valor_total/custo_total_aplicacao; para entradas, igual ao valor_total
  CASE
    WHEN m.tipo_movimento IN ('SAIDA', 'APLICACAO')
      THEN COALESCE((
        SELECT SUM(c.custo_unitario_base * c.quantidade_base)
        FROM estoque_consumos_fifo c
        WHERE c.movimento_saida_id = m.id
      ), 0)
    ELSE COALESCE(m.valor_total, 0)
  END AS custo_calculado,
  m.lote,
  m.validade,
  m.fornecedor,
  m.registro_mapa,
  m.anexo_url,
  m.criado_em,
  m.estorna_movimento_id,
  v.id AS documento_versao_id,
  d.id AS documento_id,
  d.tipo AS documento_tipo,
  d.origem_tipo,
  d.status AS documento_status,
  d.criado_em AS documento_criado_em
FROM
  estoque_movimentos m
JOIN
  estoque_documentos_versoes v ON m.documento_versao_id = v.id
JOIN
  estoque_documentos d ON v.documento_id = d.id
JOIN
  cadastro_produtos p ON m.produto_id = p.id
JOIN
  cadastro_locais_estoque l ON m.local_id = l.id
-- Join para expor os valores originais do item do documento (se existir)
LEFT JOIN
  estoque_documentos_itens edi
    ON v.id = edi.documento_versao_id
   AND m.produto_id = edi.produto_id;

COMMIT;
