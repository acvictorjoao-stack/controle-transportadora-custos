-- FleetControl — Reversão da migration 114 (Fase 2.1, desempenho da reconciliação)
-- NÃO é migration: só roda por decisão explícita.
--
-- Devolve financial_reconciliation_findings à versão da 113 (texto idêntico).
-- Não toca dados. Depois de rodar, marque a versão como revertida:
--   supabase migration repair --status reverted 114 --remote

begin;

create or replace function public.financial_reconciliation_findings(
  p_company_id uuid,
  p_from date default null,
  p_to date default null,
  p_limit integer default 200
)
returns table (
  check_id text,
  severity text,
  entity_type text,
  entity_id uuid,
  reference text,
  expected numeric,
  actual numeric,
  details jsonb,
  legacy boolean
)
language plpgsql
stable
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  -- Limite por verificação; nulo = sem limite (usado pelo resumo).
  v_limit integer := case when p_limit is null then null else least(greatest(p_limit, 1), 1000) end;
begin
  if p_company_id is null then
    raise exception 'Informe a empresa da reconciliação.' using errcode = '22023';
  end if;

  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'Período inválido: início depois do fim.' using errcode = '22023';
  end if;

  -- coalesce em cada termo: um NULL faria o "if not (...)" valer NULL e deixar passar.
  if not (
    coalesce(public.has_company_permission(p_company_id, 'financeiro:read'), false)
    or coalesce(public.is_company_super_admin(p_company_id), false)
    or coalesce((select r.rolbypassrls from pg_catalog.pg_roles r where r.rolname = current_user), false)
  ) then
    raise exception 'Sem permissão para a reconciliação financeira.' using errcode = '42501';
  end if;

  -- R01a — mais de um lançamento ativo por origem e parcela (a 109 recusa; fica como guarda)
  return query
  select
    'R01'::text, 'critical'::text, 'financial_entry'::text,
    (array_agg(fe.id order by fe.created_at, fe.id))[1],
    format('%s %s, parcela %s', fe.source_module, fe.source_id, coalesce(fe.installment_number, 1)),
    null::numeric,
    count(*)::numeric,
    jsonb_build_object(
      'reason', 'duplicate_source',
      'source_module', fe.source_module,
      'source_id', fe.source_id,
      'installment_number', coalesce(fe.installment_number, 1),
      'entry_ids', jsonb_agg(fe.id order by fe.created_at, fe.id)
    ),
    false
  from public.financial_entries fe
  where fe.company_id = p_company_id
    and fe.source_id is not null
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
    and fe.entry_type <> 'reversal'
  group by fe.source_module, fe.source_id, coalesce(fe.installment_number, 1)
  having count(*) > 1
    and public.financial_reconciliation_in_period(min(fe.entry_date), p_from, p_to)
  limit v_limit;

  -- R01b — possível duplicidade manual: mesmo tipo, valor, data e contraparte
  return query
  select
    'R01'::text, 'warning'::text, 'financial_entry'::text,
    (array_agg(fe.id order by fe.created_at, fe.id))[1],
    format('%s de %s em %s', fe.entry_type, fe.amount, fe.entry_date),
    null::numeric,
    count(*)::numeric,
    jsonb_build_object(
      'reason', 'possible_manual_duplicate',
      'entry_ids', jsonb_agg(fe.id order by fe.created_at, fe.id)
    ),
    false
  from public.financial_entries fe
  where fe.company_id = p_company_id
    and (fe.source_id is null
         or fe.source_module in ('manual', 'financeiro', 'accounts_payable', 'accounts_receivable'))
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
    and fe.entry_type <> 'reversal'
    and public.financial_reconciliation_in_period(fe.entry_date, p_from, p_to)
  group by
    fe.entry_type,
    fe.amount,
    fe.entry_date,
    coalesce(
      fe.supplier_id::text,
      fe.customer_id::text,
      nullif(lower(btrim(coalesce(fe.supplier, fe.client))), ''),
      ''
    )
  having count(*) > 1
  limit v_limit;

  -- R02 — vínculo inexistente ou de outra empresa (crítico) ou viagem excluída (alto).
  -- A situação vem de financial_reconciliation_ref_state, e não de um join com
  -- a RLS de quem consulta: sem ler veículos, por exemplo, todo vínculo pareceria inexistente.
  return query
  with links as (
    select fe.id, fe.description, fe.reference_number, v.link, v.linked_id
    from public.financial_entries fe
    cross join lateral (
      values
        ('trip'::text, fe.trip_id),
        ('vehicle', fe.vehicle_id),
        ('driver', fe.driver_id),
        ('category', fe.category_id),
        ('cost_center', fe.cost_center_id),
        ('supplier', fe.supplier_id),
        ('customer', fe.customer_id)
    ) as v(link, linked_id)
    where fe.company_id = p_company_id
      and fe.deleted_at is null
      and fe.entry_status not in ('cancelled', 'reversed')
      and fe.entry_type <> 'reversal'
      and public.financial_reconciliation_in_period(fe.entry_date, p_from, p_to)
      and v.linked_id is not null
  ),
  states as (
    select l.*, public.financial_reconciliation_ref_state(p_company_id, l.link, l.linked_id) as state
    from links l
  )
  select
    'R02'::text,
    case when s.state = 'deleted' then 'high' else 'critical' end,
    'financial_entry'::text,
    s.id,
    coalesce(nullif(btrim(s.description), ''), s.reference_number, s.id::text),
    null::numeric,
    null::numeric,
    jsonb_build_object(
      'reason', case when s.state = 'deleted' then 'trip_deleted' else 'missing' end,
      'link', s.link,
      'linked_id', s.linked_id
    ),
    false
  from states s
  where s.state = 'missing'
     or (s.state = 'deleted' and s.link = 'trip')
  limit v_limit;

  -- R03 — origem sem lançamento ativo.
  -- A sincronização de pneu reaproveita o lançamento da manutenção (e regrava
  -- source_module), então a origem conta como lançada pela coluna de vínculo
  -- OU pelo par (source_module, source_id).
  return query
  select * from (
    select
      'R03'::text, 'critical'::text, 'fuel_record'::text, fr.id,
      coalesce(nullif(btrim(fr.station_name), ''), 'Abastecimento'),
      round(fr.total_amount, 2), 0::numeric,
      jsonb_build_object('reason', 'missing_entry', 'source', 'fuel'),
      false
    from public.fuel_records fr
    where fr.company_id = p_company_id
      and fr.deleted_at is null
      and fr.total_amount > 0
      and public.financial_reconciliation_in_period(timezone('America/Sao_Paulo', fr.fueled_at)::date, p_from, p_to)
      and not exists (
        select 1 from public.financial_entries fe
        where fe.company_id = fr.company_id
          and (fe.fuel_record_id = fr.id or (fe.source_module = 'fuel' and fe.source_id = fr.id))
          and fe.deleted_at is null
          and fe.entry_status not in ('cancelled', 'reversed')
          and fe.entry_type <> 'reversal'
      )
    union all
    select
      'R03', 'critical', 'maintenance_record', mr.id,
      coalesce(nullif(btrim(mr.description), ''), 'Manutenção'),
      round(coalesce(mr.final_amount, mr.total_cost, mr.estimated_amount, 0), 2), 0::numeric,
      jsonb_build_object('reason', 'missing_entry', 'source', 'maintenance'),
      false
    from public.maintenance_records mr
    where mr.company_id = p_company_id
      and mr.deleted_at is null
      and coalesce(mr.final_amount, mr.total_cost, mr.estimated_amount, 0) > 0
      and public.financial_reconciliation_in_period(
        timezone('America/Sao_Paulo', coalesce(mr.completed_at, mr.opened_at))::date, p_from, p_to)
      and not exists (
        select 1 from public.financial_entries fe
        where fe.company_id = mr.company_id
          and (fe.maintenance_record_id = mr.id or (fe.source_module = 'maintenance' and fe.source_id = mr.id))
          and fe.deleted_at is null
          and fe.entry_status not in ('cancelled', 'reversed')
          and fe.entry_type <> 'reversal'
      )
    union all
    select
      'R03', 'critical', 'tire', ti.id,
      coalesce(nullif(btrim(concat_ws(' ', ti.brand, ti.model, ti.serial_number)), ''), 'Pneu'),
      round(coalesce(ti.purchase_value, 0) + coalesce(ti.total_recap_cost, 0), 2), 0::numeric,
      jsonb_build_object('reason', 'missing_entry', 'source', 'tires'),
      false
    from public.tires ti
    where ti.company_id = p_company_id
      and ti.deleted_at is null
      and coalesce(ti.purchase_value, 0) + coalesce(ti.total_recap_cost, 0) > 0
      and public.financial_reconciliation_in_period(coalesce(ti.purchase_date, ti.created_at::date), p_from, p_to)
      and not exists (
        select 1 from public.financial_entries fe
        where fe.company_id = ti.company_id
          and (fe.tire_id = ti.id
               or (fe.source_module = 'tires' and fe.source_id = ti.id)
               or (ti.maintenance_record_id is not null and fe.maintenance_record_id = ti.maintenance_record_id))
          and fe.deleted_at is null
          and fe.entry_status not in ('cancelled', 'reversed')
          and fe.entry_type <> 'reversal'
      )
    union all
    select
      'R03', 'critical', 'payroll_expense', pe.id,
      format('Folha %s', to_char(pe.competence, 'MM/YYYY')),
      round(pe.amount, 2), 0::numeric,
      jsonb_build_object('reason', 'missing_entry', 'source', 'payroll'),
      false
    from public.payroll_expenses pe
    where pe.company_id = p_company_id
      and pe.deleted_at is null
      and pe.expense_status <> 'cancelled'
      and pe.amount > 0
      and public.financial_reconciliation_in_period(pe.competence, p_from, p_to)
      and not exists (
        select 1 from public.financial_entries fe
        where fe.company_id = pe.company_id
          and fe.source_module = 'payroll'
          and fe.source_id = pe.id
          and fe.deleted_at is null
          and fe.entry_status not in ('cancelled', 'reversed')
          and fe.entry_type <> 'reversal'
      )
    union all
    -- Despesa de viagem: exige lançamento com "quem pagou" informado (111).
    -- Sem "quem pagou", fica fora do financeiro por desenho: aviso, não crítico.
    select
      'R03',
      case when te.paid_by is null then 'warning' else 'critical' end,
      'trip_expense', te.id,
      coalesce(nullif(btrim(te.description), ''), te.expense_type::text),
      round(te.amount, 2), 0::numeric,
      jsonb_build_object(
        'reason', case when te.paid_by is null then 'paid_by_missing' else 'missing_entry' end,
        'source', 'trip_expense',
        'trip_id', te.trip_id
      ),
      false
    from public.trip_expenses te
    where te.company_id = p_company_id
      and te.deleted_at is null
      and te.expense_type <> 'advance'
      and (te.paid_by is null or te.paid_by in ('company', 'driver', 'aggregate'))
      and public.financial_reconciliation_in_period(te.expense_date, p_from, p_to)
      and not exists (
        select 1 from public.financial_entries fe
        where fe.company_id = te.company_id
          and fe.source_module = 'trip_expense'
          and fe.source_id = te.id
          and fe.deleted_at is null
          and fe.entry_status not in ('cancelled', 'reversed')
          and fe.entry_type <> 'reversal'
      )
    union all
    -- Viagem com condição de pagamento e frete, sem título de frete (107).
    select
      'R03', 'critical', 'trip', t.id,
      t.trip_number,
      round(coalesce(t.actual_freight_value, t.contracted_freight_value, 0), 2), 0::numeric,
      jsonb_build_object('reason', 'missing_freight_charge', 'source', 'trips'),
      false
    from public.trips t
    where t.company_id = p_company_id
      and t.deleted_at is null
      and t.trip_status <> 'cancelled'
      and t.payment_condition is not null
      and coalesce(t.actual_freight_value, t.contracted_freight_value, 0) > 0
      and public.financial_reconciliation_in_period(
        timezone('America/Sao_Paulo', coalesce(t.completed_at, t.created_at))::date, p_from, p_to)
      and not exists (
        select 1 from public.financial_entries fe
        where fe.company_id = t.company_id
          and fe.trip_id = t.id
          and fe.trip_charge_key = 'freight'
          and fe.deleted_at is null
          and fe.entry_status not in ('cancelled', 'reversed')
      )
  ) r03
  limit v_limit;

  -- R04 — lançamento ativo cuja origem foi excluída ou não exige mais lançamento
  return query
  select
    'R04'::text, 'critical'::text, 'financial_entry'::text, fe.id,
    coalesce(nullif(btrim(fe.description), ''), fe.reference_number, fe.id::text),
    null::numeric,
    round(fe.amount, 2),
    jsonb_build_object(
      'reason', 'orphan_entry',
      'source_state', st.state,
      'source_module', fe.source_module,
      'source_id', fe.source_id,
      'trip_id', fe.trip_id
    ),
    false
  from public.financial_entries fe
  -- Situação da origem sem depender de o usuário ler o módulo (ver ref_state).
  cross join lateral (
    select public.financial_reconciliation_ref_state(p_company_id, fe.source_module, fe.source_id) as state
  ) st
  where fe.company_id = p_company_id
    and fe.source_id is not null
    and fe.source_module in ('fuel', 'maintenance', 'tires', 'payroll', 'trip_expense')
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
    and fe.entry_type <> 'reversal'
    and public.financial_reconciliation_in_period(fe.entry_date, p_from, p_to)
    and st.state <> 'ok'
  limit v_limit;

  -- R05 — origem e lançamento divergentes (valor, viagem ou título de frete)
  return query
  select * from (
    select
      'R05'::text, 'high'::text, 'fuel_record'::text, fr.id,
      coalesce(nullif(btrim(fr.station_name), ''), 'Abastecimento'),
      round(fr.total_amount, 2), s.total,
      jsonb_build_object('reason', 'amount', 'entries', s.entries),
      false
    from public.fuel_records fr
    cross join lateral (
      select round(sum(fe.amount), 2) as total, count(*) as entries
      from public.financial_entries fe
      where fe.company_id = fr.company_id
        and (fe.fuel_record_id = fr.id or (fe.source_module = 'fuel' and fe.source_id = fr.id))
        and fe.deleted_at is null
        and fe.entry_status not in ('cancelled', 'reversed')
        and fe.entry_type <> 'reversal'
    ) s
    where fr.company_id = p_company_id
      and fr.deleted_at is null
      and s.entries > 0
      and s.total <> round(fr.total_amount, 2)
      and public.financial_reconciliation_in_period(timezone('America/Sao_Paulo', fr.fueled_at)::date, p_from, p_to)
    union all
    -- Manutenção: só pelo par de origem (o lançamento regravado pelo pneu tem outro valor por desenho).
    select
      'R05', 'high', 'maintenance_record', mr.id,
      coalesce(nullif(btrim(mr.description), ''), 'Manutenção'),
      round(coalesce(mr.final_amount, mr.total_cost, mr.estimated_amount, 0), 2), s.total,
      jsonb_build_object('reason', 'amount', 'entries', s.entries),
      false
    from public.maintenance_records mr
    cross join lateral (
      select round(sum(fe.amount), 2) as total, count(*) as entries
      from public.financial_entries fe
      where fe.company_id = mr.company_id
        and fe.source_module = 'maintenance'
        and fe.source_id = mr.id
        and fe.deleted_at is null
        and fe.entry_status not in ('cancelled', 'reversed')
        and fe.entry_type <> 'reversal'
    ) s
    where mr.company_id = p_company_id
      and mr.deleted_at is null
      and s.entries > 0
      and s.total <> round(coalesce(mr.final_amount, mr.total_cost, mr.estimated_amount, 0), 2)
      and public.financial_reconciliation_in_period(
        timezone('America/Sao_Paulo', coalesce(mr.completed_at, mr.opened_at))::date, p_from, p_to)
    union all
    select
      'R05', 'high', 'tire', ti.id,
      coalesce(nullif(btrim(concat_ws(' ', ti.brand, ti.model, ti.serial_number)), ''), 'Pneu'),
      round(coalesce(ti.purchase_value, 0) + coalesce(ti.total_recap_cost, 0), 2), s.total,
      jsonb_build_object('reason', 'amount', 'entries', s.entries),
      false
    from public.tires ti
    cross join lateral (
      select round(sum(fe.amount), 2) as total, count(*) as entries
      from public.financial_entries fe
      where fe.company_id = ti.company_id
        and fe.source_module = 'tires'
        and fe.source_id = ti.id
        and fe.deleted_at is null
        and fe.entry_status not in ('cancelled', 'reversed')
        and fe.entry_type <> 'reversal'
    ) s
    where ti.company_id = p_company_id
      and ti.deleted_at is null
      and s.entries > 0
      and s.total <> round(coalesce(ti.purchase_value, 0) + coalesce(ti.total_recap_cost, 0), 2)
      and public.financial_reconciliation_in_period(coalesce(ti.purchase_date, ti.created_at::date), p_from, p_to)
    union all
    select
      'R05', 'high', 'payroll_expense', pe.id,
      format('Folha %s', to_char(pe.competence, 'MM/YYYY')),
      round(pe.amount, 2), s.total,
      jsonb_build_object('reason', 'amount', 'entries', s.entries),
      false
    from public.payroll_expenses pe
    cross join lateral (
      select round(sum(fe.amount), 2) as total, count(*) as entries
      from public.financial_entries fe
      where fe.company_id = pe.company_id
        and fe.source_module = 'payroll'
        and fe.source_id = pe.id
        and fe.deleted_at is null
        and fe.entry_status not in ('cancelled', 'reversed')
        and fe.entry_type <> 'reversal'
    ) s
    where pe.company_id = p_company_id
      and pe.deleted_at is null
      and pe.expense_status <> 'cancelled'
      and s.entries > 0
      and s.total <> round(pe.amount, 2)
      and public.financial_reconciliation_in_period(pe.competence, p_from, p_to)
    union all
    select
      'R05', 'high', 'trip_expense', te.id,
      coalesce(nullif(btrim(te.description), ''), te.expense_type::text),
      round(te.amount, 2), round(fe.amount, 2),
      jsonb_build_object(
        'reason', case when fe.trip_id is distinct from te.trip_id then 'trip' else 'amount' end,
        'trip_id', te.trip_id,
        'entry_id', fe.id,
        'entry_trip_id', fe.trip_id
      ),
      false
    from public.trip_expenses te
    join public.financial_entries fe
      on fe.company_id = te.company_id
     and fe.source_module = 'trip_expense'
     and fe.source_id = te.id
     and fe.entry_type = 'expense'
     and fe.deleted_at is null
     and fe.entry_status not in ('cancelled', 'reversed')
    where te.company_id = p_company_id
      and te.deleted_at is null
      and (round(fe.amount, 2) <> round(te.amount, 2) or fe.trip_id is distinct from te.trip_id)
      and public.financial_reconciliation_in_period(te.expense_date, p_from, p_to)
    union all
    -- Título de frete: frete da viagem = amount + adjustment_total (107 e adjust_receivable_amount).
    select
      'R05', 'high', 'trip', t.id,
      t.trip_number,
      round(coalesce(t.actual_freight_value, t.contracted_freight_value, 0), 2),
      round(fe.amount + coalesce(fe.adjustment_total, 0), 2),
      jsonb_build_object('reason', 'freight_charge', 'entry_id', fe.id),
      false
    from public.trips t
    join public.financial_entries fe
      on fe.company_id = t.company_id
     and fe.trip_id = t.id
     and fe.trip_charge_key = 'freight'
     and fe.deleted_at is null
     and fe.entry_status not in ('cancelled', 'reversed')
    where t.company_id = p_company_id
      and t.deleted_at is null
      and t.trip_status <> 'cancelled'
      and round(coalesce(t.actual_freight_value, t.contracted_freight_value, 0), 2)
          <> round(fe.amount + coalesce(fe.adjustment_total, 0), 2)
      and public.financial_reconciliation_in_period(
        timezone('America/Sao_Paulo', coalesce(t.completed_at, t.created_at))::date, p_from, p_to)
  ) r05
  limit v_limit;

  -- R06 — estorno incoerente
  return query
  select * from (
    -- Estorno sem original: linhas anteriores à constraint da 091 (NOT VALID).
    select
      'R06'::text, 'warning'::text, 'financial_entry'::text, r.id,
      coalesce(nullif(btrim(r.description), ''), r.reference_number, r.id::text),
      null::numeric, round(r.amount, 2),
      jsonb_build_object('reason', 'reversal_without_original'),
      true
    from public.financial_entries r
    where r.company_id = p_company_id
      and r.entry_type = 'reversal'
      and r.reversed_entry_id is null
      and r.deleted_at is null
      and public.financial_reconciliation_in_period(r.entry_date, p_from, p_to)
    union all
    -- Original ainda ativo com estorno gravado, ou valor do estorno diferente.
    select
      'R06', 'high', 'financial_entry', o.id,
      coalesce(nullif(btrim(o.description), ''), o.reference_number, o.id::text),
      round(o.amount, 2), round(abs(r.amount), 2),
      jsonb_build_object(
        'reason', case when o.entry_status <> 'reversed' then 'original_still_active' else 'amount_mismatch' end,
        'reversal_id', r.id
      ),
      false
    from public.financial_entries r
    join public.financial_entries o
      on o.id = r.reversed_entry_id
     and o.company_id = r.company_id
    where r.company_id = p_company_id
      and r.entry_type = 'reversal'
      and r.deleted_at is null
      and o.deleted_at is null
      and (o.entry_status <> 'reversed' or round(abs(r.amount), 2) <> round(o.amount, 2))
      and public.financial_reconciliation_in_period(o.entry_date, p_from, p_to)
    union all
    -- Original marcado como estornado sem lançamento de estorno.
    select
      'R06', 'high', 'financial_entry', o.id,
      coalesce(nullif(btrim(o.description), ''), o.reference_number, o.id::text),
      round(o.amount, 2), null::numeric,
      jsonb_build_object('reason', 'reversed_without_reversal'),
      false
    from public.financial_entries o
    where o.company_id = p_company_id
      and o.entry_status = 'reversed'
      and o.entry_type <> 'reversal'
      and o.deleted_at is null
      and public.financial_reconciliation_in_period(o.entry_date, p_from, p_to)
      and not exists (
        select 1 from public.financial_entries r
        where r.company_id = o.company_id
          and r.reversed_entry_id = o.id
          and r.entry_type = 'reversal'
          and r.deleted_at is null
      )
  ) r06
  limit v_limit;

  -- R07 — conta a receber com movimentos: paid_amount, ajustes e status (recompute_receivable_entry, 107)
  return query
  with mv as (
    select
      m.financial_entry_id,
      round(sum(case m.kind when 'receipt' then m.amount when 'receipt_reversal' then -m.amount else 0 end), 2) as received,
      round(sum(case when m.kind = 'adjustment' then m.amount else 0 end), 2) as adjustment
    from public.financial_entry_movements m
    where m.company_id = p_company_id
    group by m.financial_entry_id
  )
  select
    'R07'::text, 'high'::text, 'financial_entry'::text, fe.id,
    coalesce(nullif(btrim(fe.description), ''), fe.reference_number, fe.id::text),
    mv.received,
    round(coalesce(fe.paid_amount, 0), 2),
    jsonb_build_object(
      'reason', case
        when round(coalesce(fe.paid_amount, 0), 2) <> mv.received then 'paid_amount'
        when round(coalesce(fe.adjustment_total, 0), 2) <> mv.adjustment then 'adjustment_total'
        else 'status'
      end,
      'entry_status', fe.entry_status,
      'adjustment_total', round(coalesce(fe.adjustment_total, 0), 2),
      'movements_adjustment', mv.adjustment
    ),
    false
  from public.financial_entries fe
  join mv on mv.financial_entry_id = fe.id
  where fe.company_id = p_company_id
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
    and public.financial_reconciliation_in_period(fe.entry_date, p_from, p_to)
    and (
      round(coalesce(fe.paid_amount, 0), 2) <> mv.received
      or round(coalesce(fe.adjustment_total, 0), 2) <> mv.adjustment
      or (case when fe.entry_status = 'paid' then 'paid' else 'pending' end)
         <> (case when mv.received > 0 and mv.received >= fe.amount + mv.adjustment then 'paid' else 'pending' end)
    )
  limit v_limit;

  -- R08 — baixa incompleta
  return query
  select
    'R08'::text, 'high'::text, 'financial_entry'::text, fe.id,
    coalesce(nullif(btrim(fe.description), ''), fe.reference_number, fe.id::text),
    case when fe.paid_amount > fe.amount + coalesce(fe.adjustment_total, 0)
      then round(fe.amount + coalesce(fe.adjustment_total, 0), 2) end,
    case when fe.paid_amount > fe.amount + coalesce(fe.adjustment_total, 0)
      then round(fe.paid_amount, 2) end,
    jsonb_build_object('reason', case
      when fe.entry_status = 'paid' and fe.paid_at is null then 'paid_without_date'
      when fe.paid_amount > fe.amount + coalesce(fe.adjustment_total, 0) then 'overpaid'
      else 'open_without_due_date'
    end),
    false
  from public.financial_entries fe
  where fe.company_id = p_company_id
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
    and fe.entry_type <> 'reversal'
    and public.financial_reconciliation_in_period(fe.entry_date, p_from, p_to)
    and (
      (fe.entry_status = 'paid' and fe.paid_at is null)
      or fe.paid_amount > fe.amount + coalesce(fe.adjustment_total, 0)
      -- Contas a Pagar só lista título com vencimento: sem ele, a despesa em aberto some da tela.
      or (fe.entry_type = 'expense' and fe.entry_status in ('pending', 'overdue') and fe.due_date is null)
    )
  limit v_limit;

  -- R09 — conta a receber paga sem movimento (anterior aos movimentos da 106, ou receita antiga da conclusão)
  return query
  select
    'R09'::text, 'warning'::text, 'financial_entry'::text, fe.id,
    coalesce(nullif(btrim(fe.description), ''), fe.reference_number, fe.id::text),
    round(fe.amount, 2),
    round(coalesce(fe.paid_amount, fe.amount), 2),
    jsonb_build_object('reason', 'paid_without_movement', 'source_module', fe.source_module),
    true
  from public.financial_entries fe
  where fe.company_id = p_company_id
    and fe.entry_type = 'revenue'
    and fe.entry_status = 'paid'
    and fe.deleted_at is null
    and public.financial_reconciliation_in_period(fe.entry_date, p_from, p_to)
    and not exists (
      select 1 from public.financial_entry_movements m
      where m.financial_entry_id = fe.id
    )
  limit v_limit;

  -- R10 — mais de uma receita ativa para a mesma viagem
  return query
  select
    'R10'::text, 'high'::text, 'trip'::text, t.id,
    t.trip_number,
    round(coalesce(t.actual_freight_value, t.contracted_freight_value, 0), 2),
    r.total,
    jsonb_build_object('reason', 'duplicate_revenue', 'entries', r.entries, 'entry_ids', r.entry_ids),
    false
  from public.trips t
  cross join lateral (
    select
      count(*) as entries,
      round(sum(fe.amount), 2) as total,
      jsonb_agg(fe.id order by fe.created_at, fe.id) as entry_ids
    from public.financial_entries fe
    where fe.company_id = t.company_id
      and fe.trip_id = t.id
      and fe.entry_type = 'revenue'
      and fe.deleted_at is null
      and fe.entry_status not in ('cancelled', 'reversed')
  ) r
  where t.company_id = p_company_id
    and t.deleted_at is null
    and r.entries > 1
    and public.financial_reconciliation_in_period(
      timezone('America/Sao_Paulo', coalesce(t.completed_at, t.created_at))::date, p_from, p_to)
  limit v_limit;

  -- R14 — data do lançamento diferente da origem no dia de Brasília
  return query
  select
    'R14'::text, 'warning'::text, 'financial_entry'::text, fe.id,
    coalesce(nullif(btrim(fe.description), ''), fe.reference_number, fe.id::text),
    null::numeric,
    null::numeric,
    jsonb_build_object(
      'reason', 'date_mismatch',
      'source_module', fe.source_module,
      'entry_date', fe.entry_date,
      'source_date', src.source_date
    ),
    false
  from public.financial_entries fe
  cross join lateral (
    select timezone('America/Sao_Paulo', fr.fueled_at)::date as source_date
    from public.fuel_records fr
    where fe.source_module = 'fuel' and fr.id = fe.source_id and fr.company_id = fe.company_id
    union all
    select timezone('America/Sao_Paulo', coalesce(mr.completed_at, mr.opened_at))::date
    from public.maintenance_records mr
    where fe.source_module = 'maintenance' and mr.id = fe.source_id and mr.company_id = fe.company_id
    union all
    select te.expense_date
    from public.trip_expenses te
    where fe.source_module = 'trip_expense' and te.id = fe.source_id and te.company_id = fe.company_id
  ) src
  where fe.company_id = p_company_id
    and fe.source_module in ('fuel', 'maintenance', 'trip_expense')
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
    and fe.entry_type <> 'reversal'
    and fe.entry_date <> src.source_date
    and public.financial_reconciliation_in_period(fe.entry_date, p_from, p_to)
  limit v_limit;
end;
$$;

comment on function public.financial_reconciliation_findings(uuid, date, date, integer) is
  'Fase 2.1: achados da reconciliação financeira (R01–R10, R14), somente leitura, com a RLS de quem consulta. Limite por verificação (1–1000; nulo = sem limite).';

commit;
