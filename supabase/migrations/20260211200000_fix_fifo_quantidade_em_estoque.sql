-- Fix: preencher quantidade_em_estoque com v_take (quantidade utilizada convertida na unidade base)
-- Antes estava 0, o que fazia o registro de "aplicacao" não mostrar a quantidade usada

CREATE OR REPLACE FUNCTION public.fn_baixar_estoque_fifo_lancamento(p_atividade_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_is_completed boolean;

  rec_item record;
  rec_lote record;

  v_un_base text;
  v_factor numeric;
  v_needed_base numeric;

  v_take numeric;
  v_qtd_original numeric;
begin
  -- 0) Se o lançamento não existe (ou chamaram com UUID errado), no-op
  select la.user_id, la.is_completed
    into v_user_id, v_is_completed
  from public.lancamentos_agricolas la
  where la.atividade_id = p_atividade_id;

  if v_user_id is null then
    return;
  end if;

  -- 1) Só baixa FIFO se o lançamento estiver COMPLETO
  if coalesce(v_is_completed, false) is false then
    return;
  end if;

  -- 2) Se não tem produtos, não faz nada
  if not exists (
    select 1
    from public.lancamento_produtos lp
    where lp.atividade_id = p_atividade_id
    limit 1
  ) then
    return;
  end if;

  -- 3) Idempotência por atividade: se já tem alocação, evita baixar duas vezes
  if exists (
    select 1
    from public.lancamento_produtos_fifo f
    where f.atividade_id = p_atividade_id
    limit 1
  ) then
    return;
  end if;

  -- Para cada item do lançamento
  for rec_item in
    select
      lp.id as lanc_prod_id,
      lp.nome_produto,
      lp.produto_catalogo_id,
      lp.quantidade_val,
      coalesce(lp.unidade_medida, lp.quantidade_un) as unidade_item
    from public.lancamento_produtos lp
    where lp.atividade_id = p_atividade_id
  loop
    if rec_item.quantidade_val is null then
      raise exception 'Produto "%" sem quantidade_val no lançamento %', rec_item.nome_produto, p_atividade_id;
    end if;

    if rec_item.produto_catalogo_id is null and (rec_item.nome_produto is null or btrim(rec_item.nome_produto)='') then
      raise exception 'Item sem produto_catalogo_id e sem nome_produto no lançamento %', p_atividade_id;
    end if;

    -- Escolhe unidade base do lote (pega do primeiro lote disponível em estoque)
    select public.normalizar_unidade(e.unidade_de_medida)
      into v_un_base
    from public.estoque_de_produtos e
    where e.user_id = v_user_id
      and coalesce(e.quantidade_em_estoque,0) > 0
      and e.tipo_de_movimentacao = 'entrada'
      and (
        (rec_item.produto_catalogo_id is not null and e.produto_id = rec_item.produto_catalogo_id)
        or (rec_item.produto_catalogo_id is null and e.nome_do_produto = rec_item.nome_produto)
      )
    order by e.validade nulls last, e.created_at asc, e.id asc
    limit 1;

    if v_un_base is null then
      raise exception 'Sem estoque para produto "%" (atividade %)', rec_item.nome_produto, p_atividade_id;
    end if;

    -- Converte unidade do item -> unidade base do lote
    v_factor := public.converter_quantidade(
      1,
      public.normalizar_unidade(rec_item.unidade_item),
      v_un_base
    );

    if v_factor is null or v_factor = 0 then
      raise exception 'Conversão falhou: "%" -> "%" (produto "%")',
        rec_item.unidade_item, v_un_base, rec_item.nome_produto;
    end if;

    v_needed_base := rec_item.quantidade_val * v_factor;

    -- FIFO: consome lotes por validade/created_at
    for rec_lote in
      select
        e.id,
        e.produto_id,
        e.user_id,
        e.propriedade_id,
        e.nome_do_produto,
        e.marca_ou_fabricante,
        e.categoria,
        e.unidade_de_medida,
        e.unidade_valor_original,
        e.valor_unitario,
        e.lote,
        e.validade,
        e.anexo_url,
        e.esperando_por_anexo,
        e.fornecedor,
        e.registro_mapa,
        e.observacoes_das_movimentacoes,
        coalesce(e.quantidade_em_estoque,0) as qtd_disp
      from public.estoque_de_produtos e
      where e.user_id = v_user_id
        and coalesce(e.quantidade_em_estoque,0) > 0
        and e.tipo_de_movimentacao = 'entrada'
        and (
          (rec_item.produto_catalogo_id is not null and e.produto_id = rec_item.produto_catalogo_id)
          or (rec_item.produto_catalogo_id is null and e.nome_do_produto = rec_item.nome_produto)
        )
      order by e.validade nulls last, e.created_at asc, e.id asc
      for update
    loop
      exit when v_needed_base <= 0;

      v_take := least(v_needed_base, rec_lote.qtd_disp);

      -- 1) baixa do lote (estoque disponível)
      update public.estoque_de_produtos
      set quantidade_em_estoque = coalesce(quantidade_em_estoque,0) - v_take
      where id = rec_lote.id;

      -- 2) registra alocação
      insert into public.lancamento_produtos_fifo (
        atividade_id, lancamento_produto_id, estoque_lote_id, qtd_base, unidade_base
      ) values (
        p_atividade_id, rec_item.lanc_prod_id, rec_lote.id, v_take, v_un_base
      );

      -- 3) registra movimentação "aplicacao" (auditável)
      v_qtd_original := public.converter_de_unidade_padrao(
        v_take,
        rec_lote.unidade_de_medida,
        coalesce(rec_lote.unidade_valor_original, rec_lote.unidade_de_medida)
      );

      insert into public.estoque_de_produtos (
        user_id,
        propriedade_id,
        nome_do_produto,
        marca_ou_fabricante,
        categoria,
        unidade_de_medida,
        quantidade_em_estoque,
        valor_unitario,
        lote,
        validade,
        anexo_url,
        esperando_por_anexo,
        fornecedor,
        registro_mapa,
        observacoes_das_movimentacoes,
        unidade_valor_original,
        valor_total,
        quantidade_inicial,
        valor_medio,
        tipo_de_movimentacao,
        produto_id,
        entrada_referencia_id
      ) values (
        rec_lote.user_id,
        rec_lote.propriedade_id,
        rec_lote.nome_do_produto,
        rec_lote.marca_ou_fabricante,
        rec_lote.categoria,
        rec_lote.unidade_de_medida,
        v_take, -- FIX: quantidade utilizada convertida na unidade base (antes era 0)
        rec_lote.valor_unitario,
        rec_lote.lote,
        rec_lote.validade,
        rec_lote.anexo_url,
        rec_lote.esperando_por_anexo,
        rec_lote.fornecedor,
        rec_lote.registro_mapa,
        rec_lote.observacoes_das_movimentacoes,
        rec_lote.unidade_valor_original,
        v_qtd_original * rec_lote.valor_unitario,
        v_take, -- quantidade movimentada (base)
        null,
        'aplicacao',
        rec_lote.produto_id,
        rec_lote.id
      );

      v_needed_base := v_needed_base - v_take;
    end loop;

    if v_needed_base > 0 then
      raise exception 'Estoque insuficiente para "%". Faltou na unidade base "%": %',
        rec_item.nome_produto, v_un_base, v_needed_base;
    end if;

  end loop;
end;
$function$;
