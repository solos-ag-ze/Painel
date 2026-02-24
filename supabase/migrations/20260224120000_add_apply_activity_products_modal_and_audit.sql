-- Migration: cria tabela de auditoria e função RPC apply_activity_products_modal
-- Gera entradas/saídas no estoque com idempotência por atividade e registra ações

CREATE TABLE IF NOT EXISTS public.activity_estoque_movements (
  id bigserial PRIMARY KEY,
  atividade_id uuid NOT NULL,
  estoque_id bigint NOT NULL,
  action_text text NOT NULL,
  quantidade numeric,
  unidade text,
  criado_em timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.apply_activity_products_modal(p_activity_id uuid, p_products jsonb, p_user_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  rec jsonb;
  new_item RECORD;
  old_item_row RECORD;
  old_products jsonb;
  result jsonb := '[]'::jsonb;
  v_user uuid := p_user_id;
  v_std_unit text;
  v_multiplier numeric;
  v_new_std numeric;
  v_old_std numeric;
  v_delta numeric;
  v_available numeric;
  v_prod_id uuid;
  v_entrada_id bigint;
  v_actions jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL THEN
    BEGIN
      SELECT auth.uid()::uuid INTO v_user;
    EXCEPTION WHEN others THEN
      v_user := p_user_id;
    END;
  END IF;

  IF p_products IS NULL THEN
    RETURN jsonb_build_object('error', 'p_products é nulo');
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'produto_catalogo_id', produto_catalogo_id,
    'nome_produto', nome_produto,
    'quantidade_val', quantidade_val,
    'quantidade_un', quantidade_un
  )) INTO old_products
  FROM lancamento_produtos
  WHERE atividade_id = p_activity_id;

  IF old_products IS NULL THEN
    old_products := '[]'::jsonb;
  END IF;

  -- unidade map simplificada (usa funções existentes se preferir)
  CREATE TEMP TABLE IF NOT EXISTS tmp_unit_map(unit text, multiplier numeric, std_unit text) ON COMMIT DROP;
  INSERT INTO tmp_unit_map(unit, multiplier, std_unit) VALUES
    ('mg', 1, 'mg'),
    ('g', 1000, 'mg'),
    ('kg', 1000000, 'mg'),
    ('ton', 1000000000, 'mg'),
    ('mL', 1, 'mL'),
    ('ml', 1, 'mL'),
    ('L', 1000, 'mL'),
    ('l', 1000, 'mL'),
    ('un', 1, 'un')
  ON CONFLICT DO NOTHING;

  FOR new_item IN SELECT * FROM jsonb_to_recordset(p_products) AS (
    id text,
    produto_catalogo_id uuid,
    nome_produto text,
    quantidade_val numeric,
    quantidade_un text
  ) LOOP

    SELECT (op->>'id')::text AS id,
           (op->>'produto_catalogo_id')::uuid AS produto_catalogo_id,
           op->>'nome_produto' AS nome_produto,
           (op->>'quantidade_val')::numeric AS quantidade_val,
           op->>'quantidade_un' AS quantidade_un
    INTO old_item_row
    FROM jsonb_array_elements(old_products) op
    WHERE (op->>'id') = new_item.id
       OR ((op->>'produto_catalogo_id') IS NOT NULL AND (op->>'produto_catalogo_id') = COALESCE(new_item.produto_catalogo_id::text, ''))
       OR (op->>'nome_produto') = new_item.nome_produto
    LIMIT 1;

    SELECT multiplier, std_unit INTO v_multiplier, v_std_unit FROM tmp_unit_map WHERE unit = COALESCE(new_item.quantidade_un, 'un') LIMIT 1;
    IF v_multiplier IS NULL THEN
      SELECT multiplier, std_unit INTO v_multiplier, v_std_unit FROM tmp_unit_map WHERE lower(unit) = lower(COALESCE(new_item.quantidade_un, 'un')) LIMIT 1;
    END IF;
    IF v_multiplier IS NULL THEN
      v_multiplier := 1; v_std_unit := 'un';
    END IF;
    v_new_std := COALESCE(new_item.quantidade_val, 0) * v_multiplier;

    IF old_item_row IS NOT NULL THEN
      SELECT multiplier, std_unit INTO v_multiplier, v_std_unit FROM tmp_unit_map WHERE unit = COALESCE(old_item_row.quantidade_un, 'un') LIMIT 1;
      IF v_multiplier IS NULL THEN
        SELECT multiplier, std_unit INTO v_multiplier, v_std_unit FROM tmp_unit_map WHERE lower(unit) = lower(COALESCE(old_item_row.quantidade_un, 'un')) LIMIT 1;
      END IF;
      IF v_multiplier IS NULL THEN
        v_multiplier := 1; v_std_unit := 'un';
      END IF;
      v_old_std := COALESCE(old_item_row.quantidade_val, 0) * v_multiplier;
    ELSE
      v_old_std := 0;
    END IF;

    v_delta := v_new_std - v_old_std;

    IF new_item.produto_catalogo_id IS NOT NULL THEN
      v_prod_id := new_item.produto_catalogo_id;
    ELSE
      IF old_item_row IS NULL THEN
        INSERT INTO estoque_de_produtos(
          user_id, nome_do_produto, unidade_de_medida, quantidade_em_estoque, quantidade_inicial, tipo_de_movimentacao, produto_id, created_at
        ) VALUES (
          v_user, new_item.nome_produto, COALESCE(v_std_unit, 'un'), 0, 0, 'entrada', gen_random_uuid(), now()
        ) RETURNING produto_id, id INTO v_prod_id, v_entrada_id;
      ELSE
        SELECT produto_id, id INTO v_prod_id, v_entrada_id FROM estoque_de_produtos WHERE user_id = v_user AND nome_do_produto = COALESCE(new_item.nome_produto, '') LIMIT 1;
        IF v_prod_id IS NULL THEN
          v_prod_id := gen_random_uuid();
        END IF;
      END IF;
    END IF;

    SELECT COALESCE(SUM(CASE WHEN tipo_de_movimentacao = 'entrada' OR tipo_de_movimentacao IS NULL THEN quantidade_em_estoque WHEN tipo_de_movimentacao = 'saida' THEN -quantidade_em_estoque ELSE 0 END), 0)
    INTO v_available
    FROM estoque_de_produtos
    WHERE produto_id = v_prod_id AND user_id = v_user;

    IF v_delta > 0 THEN
      INSERT INTO estoque_de_produtos(
        user_id, propriedade_id, nome_do_produto, marca_ou_fabricante, categoria,
        unidade_de_medida, quantidade_em_estoque, quantidade_inicial, valor_unitario, valor_total,
        unidade_valor_original, lote, validade, fornecedor, registro_mapa,
        tipo_de_movimentacao, entrada_referencia_id, produto_id, observacoes_das_movimentacoes, created_at
      ) VALUES (
        v_user, NULL, new_item.nome_produto, NULL, NULL,
        v_std_unit, v_delta, v_delta, NULL, NULL,
        NULL, NULL, NULL, NULL, NULL,
        'saida', NULL, v_prod_id, 'Saída automática via edição de atividade', now()
      ) RETURNING id INTO v_entrada_id;

      INSERT INTO public.activity_estoque_movements(atividade_id, estoque_id, action_text, quantidade, unidade) VALUES (p_activity_id, v_entrada_id, 'saida', v_delta, v_std_unit);

      v_actions := v_actions || jsonb_build_object('action', 'saida', 'produto', COALESCE(new_item.nome_produto, ''), 'quantidade_padrao', v_delta, 'produto_id', v_prod_id, 'row_id', v_entrada_id);

      IF v_available < v_delta THEN
        UPDATE lancamentos_agricolas SET estoque_excedido = true WHERE atividade_id = p_activity_id;
        v_actions := v_actions || jsonb_build_object('warning', 'estoque_excedido', 'produto', COALESCE(new_item.nome_produto, ''));
      END IF;

    ELSIF v_delta < 0 THEN
      INSERT INTO estoque_de_produtos(
        user_id, propriedade_id, nome_do_produto, unidade_de_medida, quantidade_em_estoque, quantidade_inicial, tipo_de_movimentacao, produto_id, observacoes_das_movimentacoes, created_at
      ) VALUES (
        v_user, NULL, new_item.nome_produto, v_std_unit, (-v_delta), (-v_delta), 'entrada', v_prod_id, 'Reposição via edição de atividade', now()
      ) RETURNING id INTO v_entrada_id;

      INSERT INTO public.activity_estoque_movements(atividade_id, estoque_id, action_text, quantidade, unidade) VALUES (p_activity_id, v_entrada_id, 'entrada', (-v_delta), v_std_unit);

      v_actions := v_actions || jsonb_build_object('action', 'entrada', 'produto', COALESCE(new_item.nome_produto, ''), 'quantidade_padrao', (-v_delta), 'produto_id', v_prod_id, 'row_id', v_entrada_id);
    ELSE
      v_actions := v_actions || jsonb_build_object('action', 'noop', 'produto', COALESCE(new_item.nome_produto, ''));
    END IF;

  END LOOP;

  result := jsonb_build_object('status', 'ok', 'actions', v_actions);
  RETURN result;
END;
$function$;
