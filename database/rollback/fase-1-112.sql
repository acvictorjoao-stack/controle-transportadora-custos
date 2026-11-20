-- FleetControl — Reversão do backfill 2B (migration 112)
-- NÃO é migration: só roda por decisão explícita.
--
-- Desfaz o lote 'fase1-2b-2026-11' da empresa de teste, preservando histórico:
--   1. estorna cada lançamento do lote pela mesma função da migration 111
--      (o original fica "reversed" e o estorno é gravado);
--   2. devolve as despesas a "quem pagou" não informado.
-- Para sem alterar nada se algum lançamento do lote tiver movimento de caixa
-- ou tiver sido alterado pelo Financeiro (não estiver mais "paid" na origem).

begin;

do $$
declare
  c_company constant uuid := '451a7940-a56b-425f-ae5f-e493d536591f';
  c_batch constant text := 'fase1-2b-2026-11';
  v_entry record;
  v_count integer := 0;
begin
  if exists (
    select 1
    from public.financial_entries fe
    join public.financial_entry_movements m on m.financial_entry_id = fe.id
    where fe.company_id = c_company
      and fe.metadata ->> 'backfill' = c_batch
  ) then
    raise exception 'Reversão 2B interrompida: há lançamento do lote com movimento de caixa.';
  end if;

  if exists (
    select 1
    from public.financial_entries fe
    where fe.company_id = c_company
      and fe.metadata ->> 'backfill' = c_batch
      and fe.entry_type = 'expense'
      and fe.deleted_at is null
      and fe.entry_status not in ('paid', 'reversed', 'cancelled')
  ) then
    raise exception 'Reversão 2B interrompida: lançamento do lote foi alterado depois do backfill.';
  end if;

  for v_entry in
    select fe.id, fe.source_id
    from public.financial_entries fe
    where fe.company_id = c_company
      and fe.metadata ->> 'backfill' = c_batch
      and fe.entry_type = 'expense'
      and fe.deleted_at is null
      and fe.entry_status = 'paid'
  loop
    perform public.close_trip_expense_entry(v_entry.id, null);
    v_count := v_count + 1;
  end loop;

  raise notice 'Reversão 2B: % lançamento(s) estornado(s).', v_count;
end $$;

-- "Quem pagou" volta a não informado só nas despesas do lote. A sincronização
-- recusa apagar paid_by de despesa integrada; aqui ela é desligada só nesta
-- transação, depois de os lançamentos já estarem estornados acima.
alter table public.trip_expenses disable trigger trip_expenses_sync_financial_entry;

update public.trip_expenses te
set paid_by = null,
    payment_method = null
where te.company_id = '451a7940-a56b-425f-ae5f-e493d536591f'
  and exists (
    select 1
    from public.financial_entries fe
    where fe.company_id = te.company_id
      and fe.source_module = 'trip_expense'
      and fe.source_id = te.id
      and fe.metadata ->> 'backfill' = 'fase1-2b-2026-11'
  );

alter table public.trip_expenses enable trigger trip_expenses_sync_financial_entry;

commit;
