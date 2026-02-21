-- Migration: criar função + trigger para registrar histórico quando uma parcela (filha) for criada
-- Data: 2026-02-20

-- 1) Função que insere um registro de histórico sempre que uma parcela é criada
create or replace function public.tf_log_on_insert_parcela()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new jsonb := to_jsonb(new);
  v_nome_editor text;
  v_campos text[];
begin
  -- Só registra se a nova transação for uma parcela (tem parent)
  if new.id_transacao_pai is not null then
    v_campos := array['parcela_criada'];

    v_nome_editor :=
      coalesce(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'name'),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'email'),
        'Sistema'
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
      new.id_transacao_pai,
      new.user_id,
      v_nome_editor,
      '{}'::jsonb,
      v_new,
      v_campos,
      now()
    );
  end if;

  return new;
end;
$$;

-- 2) Trigger que chama a função após INSERT em transacoes_financeiras
drop trigger if exists trg_tf_log_on_insert_parcela on public.transacoes_financeiras;
create trigger trg_tf_log_on_insert_parcela
after insert on public.transacoes_financeiras
for each row
when (new.id_transacao_pai is not null)
execute procedure public.tf_log_on_insert_parcela();

-- Nota: aplicar esta migration no Supabase (psql/CLI ou editor SQL).
