-- Migration: incluir tabelas relacionadas no snapshot de histórico de lançamentos agrícolas
-- Date: 2026-02-23

-- Substitui a função de inserção para agregar dados relacionados (talhões, produtos, máquinas, responsáveis)
CREATE OR REPLACE FUNCTION public.inserir_historico_lancamento_agricola()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_id_lancamento_pai uuid;
  v_talhoes jsonb;
  v_produtos jsonb;
  v_maquinas jsonb;
  v_responsaveis jsonb;
  v_dados_novos jsonb;
  v_nome_editor text;
BEGIN
  v_id_lancamento_pai := nullif(to_jsonb(NEW)->>'id_lancamento_pai','')::uuid;

  -- Agregar linhas relacionadas, se existirem
  SELECT coalesce(jsonb_agg(to_jsonb(l) - 'atividade_id'), '[]'::jsonb) INTO v_talhoes
  FROM public.lancamento_talhoes l
  WHERE l.atividade_id = NEW.atividade_id;

  SELECT coalesce(jsonb_agg(to_jsonb(p) - 'atividade_id'), '[]'::jsonb) INTO v_produtos
  FROM public.lancamento_produtos p
  WHERE p.atividade_id = NEW.atividade_id;

  SELECT coalesce(jsonb_agg(to_jsonb(m) - 'atividade_id'), '[]'::jsonb) INTO v_maquinas
  FROM public.lancamento_maquinas m
  WHERE m.atividade_id = NEW.atividade_id;

  SELECT coalesce(jsonb_agg(to_jsonb(r) - 'atividade_id'), '[]'::jsonb) INTO v_responsaveis
  FROM public.lancamento_responsaveis r
  WHERE r.atividade_id = NEW.atividade_id;

  -- montar snapshot completo incluindo relações
  v_dados_novos := to_jsonb(NEW) || jsonb_build_object(
    'talhoes', v_talhoes,
    'produtos', v_produtos,
    'maquinas', v_maquinas,
    'responsaveis', v_responsaveis
  );

  -- determinar nome_editor (mantém comportamento atual)
  v_nome_editor := coalesce(NEW.user_id::text,'Sistema');

  INSERT INTO public.historico_lancamentos_agricolas(
    atividade_id, user_id, nome_editor,
    dados_anteriores, dados_novos, campos_alterados,
    editado_em, id_lancamento_pai
  ) VALUES (
    NEW.atividade_id,
    NEW.user_id,
    v_nome_editor,
    '{}'::jsonb,
    v_dados_novos,
    ARRAY['criação'],
    now(),
    v_id_lancamento_pai
  );

  RETURN NEW;
END;
$function$;

-- Substitui a função de atualização para agregar relações tanto em OLD quanto em NEW
CREATE OR REPLACE FUNCTION public.atualizar_historico_lancamento_agricola()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  campos_diferentes text[];
  v_id_lancamento_pai uuid;
  v_old_talhoes jsonb;
  v_old_produtos jsonb;
  v_old_maquinas jsonb;
  v_old_responsaveis jsonb;
  v_new_talhoes jsonb;
  v_new_produtos jsonb;
  v_new_maquinas jsonb;
  v_new_responsaveis jsonb;
  v_dados_anteriores jsonb;
  v_dados_novos jsonb;
  v_nome_editor text;
BEGIN
  v_id_lancamento_pai := nullif(to_jsonb(NEW)->>'id_lancamento_pai','')::uuid;

  -- calcular diferenças ignorando campos técnicos
  campos_diferentes := array(
    SELECT key
    FROM jsonb_each_text(to_jsonb(NEW))
    WHERE key NOT IN (
      'updated_at','created_at','imagem','arquivo','url_imagem','url_arquivo'
    )
      AND to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key
  );

  IF array_length(campos_diferentes,1) > 0 THEN
    -- agregar relações antigas
    SELECT coalesce(jsonb_agg(to_jsonb(l) - 'atividade_id'), '[]'::jsonb) INTO v_old_talhoes
    FROM public.lancamento_talhoes l
    WHERE l.atividade_id = OLD.atividade_id;

    SELECT coalesce(jsonb_agg(to_jsonb(p) - 'atividade_id'), '[]'::jsonb) INTO v_old_produtos
    FROM public.lancamento_produtos p
    WHERE p.atividade_id = OLD.atividade_id;

    SELECT coalesce(jsonb_agg(to_jsonb(m) - 'atividade_id'), '[]'::jsonb) INTO v_old_maquinas
    FROM public.lancamento_maquinas m
    WHERE m.atividade_id = OLD.atividade_id;

    SELECT coalesce(jsonb_agg(to_jsonb(r) - 'atividade_id'), '[]'::jsonb) INTO v_old_responsaveis
    FROM public.lancamento_responsaveis r
    WHERE r.atividade_id = OLD.atividade_id;

    -- agregar relações novas
    SELECT coalesce(jsonb_agg(to_jsonb(l) - 'atividade_id'), '[]'::jsonb) INTO v_new_talhoes
    FROM public.lancamento_talhoes l
    WHERE l.atividade_id = NEW.atividade_id;

    SELECT coalesce(jsonb_agg(to_jsonb(p) - 'atividade_id'), '[]'::jsonb) INTO v_new_produtos
    FROM public.lancamento_produtos p
    WHERE p.atividade_id = NEW.atividade_id;

    SELECT coalesce(jsonb_agg(to_jsonb(m) - 'atividade_id'), '[]'::jsonb) INTO v_new_maquinas
    FROM public.lancamento_maquinas m
    WHERE m.atividade_id = NEW.atividade_id;

    SELECT coalesce(jsonb_agg(to_jsonb(r) - 'atividade_id'), '[]'::jsonb) INTO v_new_responsaveis
    FROM public.lancamento_responsaveis r
    WHERE r.atividade_id = NEW.atividade_id;

    v_dados_anteriores := to_jsonb(OLD) || jsonb_build_object(
      'talhoes', v_old_talhoes,
      'produtos', v_old_produtos,
      'maquinas', v_old_maquinas,
      'responsaveis', v_old_responsaveis
    );

    v_dados_novos := to_jsonb(NEW) || jsonb_build_object(
      'talhoes', v_new_talhoes,
      'produtos', v_new_produtos,
      'maquinas', v_new_maquinas,
      'responsaveis', v_new_responsaveis
    );

    v_nome_editor := coalesce(NEW.user_id::text,'Sistema');

    INSERT INTO public.historico_lancamentos_agricolas(
      atividade_id, user_id, nome_editor,
      dados_anteriores, dados_novos, campos_alterados,
      editado_em, id_lancamento_pai
    ) VALUES (
      NEW.atividade_id,
      NEW.user_id,
      v_nome_editor,
      v_dados_anteriores,
      v_dados_novos,
      campos_diferentes,
      now(),
      v_id_lancamento_pai
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Fim da migration
