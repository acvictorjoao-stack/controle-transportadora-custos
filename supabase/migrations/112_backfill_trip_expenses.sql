-- FleetControl — Fase 1, Etapa 2B: backfill das despesas de viagem antigas
-- DADOS. Só roda com autorização específica, depois da prévia.
--
-- Escopo fixo: empresa de teste primeira-empresa
-- (451a7940-a56b-425f-ae5f-e493d536591f). Nenhuma outra empresa é tocada.
--
-- O que faz (decisão D12): nas despesas antigas ainda sem "quem pagou", grava
-- paid_by = 'company' e payment_method = 'not_informed'. O gatilho da
-- migration 111 cria, na mesma transação, um lançamento por despesa (pago na
-- data da despesa), marcado em metadata.backfill com o lote abaixo.
--
-- Travas (a migration PARA sem gravar nada se qualquer uma falhar):
--   - a 111 precisa estar aplicada;
--   - exatamente 10 despesas elegíveis, somando R$ 1.175,00;
--   - nenhuma delas pode ter lançamento ativo (sem duplicidade);
--   - depois: exatamente 10 lançamentos do lote, R$ 1.175,00, um por despesa.
-- Idempotente: numa segunda execução não há despesa elegível e ela para na
-- trava de contagem, sem gravar.
-- Reversão: database/rollback/fase-1-112.sql.

do $$
declare
  c_company constant uuid := '451a7940-a56b-425f-ae5f-e493d536591f';
  c_batch constant text := 'fase1-2b-2026-11';
  c_expected_count constant integer := 10;
  c_expected_total constant numeric(14, 2) := 1175.00;
  v_count integer;
  v_total numeric(14, 2);
  v_updated integer;
  v_entries integer;
  v_entries_total numeric(14, 2);
  v_orphans integer;
begin
  if to_regprocedure('public.sync_trip_expense_entry()') is null then
    raise exception 'Backfill 2B interrompido: a migration 111 não está aplicada.';
  end if;

  select count(*), coalesce(sum(te.amount), 0)
    into v_count, v_total
  from public.trip_expenses te
  where te.company_id = c_company
    and te.deleted_at is null
    and te.expense_type <> 'advance'
    and te.paid_by is null;

  if v_count <> c_expected_count or v_total <> c_expected_total then
    raise exception 'Backfill 2B interrompido: esperadas % despesas e R$ %, encontradas % e R$ %.',
      c_expected_count, c_expected_total, v_count, v_total;
  end if;

  if exists (
    select 1
    from public.trip_expenses te
    join public.financial_entries fe
      on fe.company_id = te.company_id
     and fe.source_module = 'trip_expense'
     and fe.source_id = te.id
     and fe.deleted_at is null
     and fe.entry_status not in ('cancelled', 'reversed')
    where te.company_id = c_company
      and te.deleted_at is null
      and te.paid_by is null
  ) then
    raise exception 'Backfill 2B interrompido: há despesa elegível com lançamento ativo.';
  end if;

  -- O gatilho grava o lote em metadata.backfill (GUC local à transação).
  perform set_config('fleetcontrol.trip_expense_batch', c_batch, true);

  update public.trip_expenses te
  set paid_by = 'company',
      payment_method = 'not_informed'
  where te.company_id = c_company
    and te.deleted_at is null
    and te.expense_type <> 'advance'
    and te.paid_by is null;

  get diagnostics v_updated = row_count;
  perform set_config('fleetcontrol.trip_expense_batch', '', true);

  if v_updated <> c_expected_count then
    raise exception 'Backfill 2B interrompido: % despesas atualizadas (esperadas %).', v_updated, c_expected_count;
  end if;

  select count(*), coalesce(sum(fe.amount), 0)
    into v_entries, v_entries_total
  from public.financial_entries fe
  where fe.company_id = c_company
    and fe.source_module = 'trip_expense'
    and fe.entry_type = 'expense'
    and fe.metadata ->> 'backfill' = c_batch
    and fe.deleted_at is null
    and fe.entry_status = 'paid';

  select count(*)
    into v_orphans
  from public.trip_expenses te
  where te.company_id = c_company
    and te.deleted_at is null
    and te.expense_type <> 'advance'
    and te.paid_by is distinct from 'third_party'
    and (
      select count(*)
      from public.financial_entries fe
      where fe.company_id = te.company_id
        and fe.source_module = 'trip_expense'
        and fe.source_id = te.id
        and fe.entry_type = 'expense'
        and fe.deleted_at is null
        and fe.entry_status not in ('cancelled', 'reversed')
    ) <> 1;

  if v_entries <> c_expected_count or v_entries_total <> c_expected_total or v_orphans <> 0 then
    raise exception 'Backfill 2B interrompido na conferência: % lançamentos, R$ %, % despesas sem exatamente um lançamento.',
      v_entries, v_entries_total, v_orphans;
  end if;
end $$;
