-- Migration: adicionar coluna id_transacao_pai, índice e backfill
-- Data: 2026-02-20

-- 1) Adicionar coluna na tabela de histórico
alter table if exists public.historico_transacoes_financeiras
add column if not exists id_transacao_pai uuid null;

-- 2) Criar índice para consultas por parent + ordenação
create index if not exists idx_hist_transacoes_pai
on public.historico_transacoes_financeiras (id_transacao_pai, editado_em desc);

-- 3) Backfill: preencher id_transacao_pai a partir da tabela de transações
update public.historico_transacoes_financeiras h
set id_transacao_pai = tf.id_transacao_pai
from public.transacoes_financeiras tf
where tf.id_transacao = h.id_transacao
  and h.id_transacao_pai is null;

-- 4) Atualizar função de trigger que registra log ao completar transação
-- Substitui o corpo por versão que já insere o id_transacao_pai
create or replace function public.tf_log_on_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_campos text[];
  v_nome_editor text;
begin
  if coalesce(old.is_completed,false) = false and new.is_completed = true then
    v_campos := public.fn_jsonb_changed_keys(v_old, v_new);

    v_nome_editor :=
      coalesce(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'name'),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'email'),
        'Dashboard'
      );

    insert into public.historico_transacoes_financeiras (
      id_transacao,
      id_transacao_pai,
      user_id,
      nome_editor,
      dados_anteriores,
      dados_novos,
      campos_alterados,
      editado_em
    ) values (
      new.id_transacao,
      -- insere explicitamente o parent id quando existir
      case when coalesce(new.id_transacao_pai::text,'') = '' then null else new.id_transacao_pai end,
      new.user_id,
      v_nome_editor,
      v_old,
      v_new,
      v_campos,
      now()
    );
  end if;

  return new;
end;
$$;

-- Nota: aplique esta migration no Supabase (psql/CLI ou dashboard). Não altera nomes de triggers.
