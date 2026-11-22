-- FleetControl — Fase 2.1: reconciliação financeira, desempenho (somente leitura)
--
-- Recria financial_reconciliation_findings com a mesma assinatura, as mesmas
-- regras e o mesmo formato de achados da 113, mudando duas coisas:
--
-- 1. Security definer (decisão da Fase 2.1.4). Com a RLS de quem consulta, as
--    funções das políticas (is_company_member → is_portal_owner…) rodavam por
--    linha em cada leitura e respondiam por ~90% do tempo: a função estourou o
--    limite de 8 s do papel authenticated no Preview (log do Postgres,
--    2026-11-22) e levou 14,3 s com 10x o volume da primeira-empresa, contra
--    1,6 s sem RLS. Agora:
--      * a única porta é a verificação inicial: financeiro:read ou super admin
--        da empresa, ou contexto de serviço (request_is_service_context, 107).
--        Sem rolbypassrls/current_user, que dentro de definer é o dono;
--      * toda consulta filtra pela empresa pedida, e todo join exige a mesma
--        empresa: id de outra empresa aparece como inexistente, sem vazar;
--      * quem tem financeiro:read passa a ver nos achados dados de origem de
--        módulos que talvez não leia (posto, manutenção, viagem, folha), o
--        mesmo nível do que já vê nos lançamentos. A cobertura fica completa.
-- 2. R03, R05 e R10 leem os lançamentos uma vez por verificação (CTE
--    materialized) e cruzam por chave; R02 e R04 voltam a join direto
--    (financial_reconciliation_ref_state continua existindo, sem uso aqui).
--
-- Resumo e período continuam security invoker; o resumo chama esta função.
-- Não grava dados. Reversão: database/rollback/fase-2-1-114.sql (volta à 113).

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
security definer
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

  -- A função ignora a RLS (security definer): esta verificação é a única porta.
  -- coalesce em cada termo: um NULL faria o "if not (...)" valer NULL e deixar passar.
  -- Não usar rolbypassrls/current_user aqui: dentro de security definer o
  -- current_user é o dono da função e a regra deixaria qualquer um passar.
  if not (
    coalesce(public.has_company_permission(p_company_id, 'financeiro:read'), false)
    or coalesce(public.is_company_super_admin(p_company_id), false)
    or coalesce(public.request_is_service_context(), false)
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
  -- Join direto e sempre com a mesma empresa: um id de outra empresa aparece como
  -- inexistente, sem revelar que ele existe.
  return query
  with active_entries as materialized (
    select fe.id, fe.company_id, fe.description, fe.reference_number, fe.trip_id, fe.vehicle_id,
           fe.driver_id, fe.category_id, fe.cost_center_id, fe.supplier_id, fe.customer_id
    from public.financial_entries fe
    where fe.company_id = p_company_id
      and fe.deleted_at is null
      and fe.entry_status not in ('cancelled', 'reversed')
      and fe.entry_type <> 'reversal'
      and public.financial_reconciliation_in_period(fe.entry_date, p_from, p_to)
  ),
  links as (
    select a.id, a.description, a.reference_number, 'trip'::text as link, a.trip_id as linked_id,
      case when x.id is null then 'missing' when x.deleted_at is not null then 'trip_deleted' end as reason
    from active_entries a
    left join public.trips x on x.id = a.trip_id and x.company_id = a.company_id
    where a.trip_id is not null
    union all
    select a.id, a.description, a.reference_number, 'vehicle', a.vehicle_id,
      case when x.id is null then 'missing' end
    from active_entries a
    left join public.vehicles x on x.id = a.vehicle_id and x.company_id = a.company_id
    where a.vehicle_id is not null
    union all
    select a.id, a.description, a.reference_number, 'driver', a.driver_id,
      case when x.id is null then 'missing' end
    from active_entries a
    left join public.drivers x on x.id = a.driver_id and x.company_id = a.company_id
    where a.driver_id is not null
    union all
    select a.id, a.description, a.reference_number, 'category', a.category_id,
      case when x.id is null then 'missing' end
    from active_entries a
    left join public.financial_categories x on x.id = a.category_id and x.company_id = a.company_id
    where a.category_id is not null
    union all
    select a.id, a.description, a.reference_number, 'cost_center', a.cost_center_id,
      case when x.id is null then 'missing' end
    from active_entries a
    left join public.cost_centers x on x.id = a.cost_center_id and x.company_id = a.company_id
    where a.cost_center_id is not null
    union all
    select a.id, a.description, a.reference_number, 'supplier', a.supplier_id,
      case when x.id is null then 'missing' end
    from active_entries a
    left join public.suppliers x on x.id = a.supplier_id and x.company_id = a.company_id
    where a.supplier_id is not null
    union all
    select a.id, a.description, a.reference_number, 'customer', a.customer_id,
      case when x.id is null then 'missing' end
    from active_entries a
    left join public.customers x on x.id = a.customer_id and x.company_id = a.company_id
    where a.customer_id is not null
  )
  select
    'R02'::text,
    case when l.reason = 'trip_deleted' then 'high' else 'critical' end,
    'financial_entry'::text,
    l.id,
    coalesce(nullif(btrim(l.description), ''), l.reference_number, l.id::text),
    null::numeric,
    null::numeric,
    jsonb_build_object('reason', l.reason, 'link', l.link, 'linked_id', l.linked_id),
    false
  from links l
  where l.reason is not null
  limit v_limit;

  -- R03 — origem sem lançamento ativo.
  -- Os vínculos dos lançamentos ativos são lidos uma vez (materialized): com a
  -- RLS de quem consulta, uma subconsulta por origem repetia a política por linha.
  -- A sincronização de pneu reaproveita o lançamento da manutenção (e regrava
  -- source_module), então a origem conta como lançada pela coluna de vínculo
  -- OU pelo par (source_module, source_id).
  return query
  with posted as materialized (
    select distinct k.kind, k.ref_id
    from public.financial_entries fe
    cross join lateral (
      values
        ('fuel'::text, fe.fuel_record_id),
        ('fuel', case when fe.source_module = 'fuel' then fe.source_id end),
        ('maintenance', fe.maintenance_record_id),
        ('maintenance', case when fe.source_module = 'maintenance' then fe.source_id end),
        ('tires', fe.tire_id),
        ('tires', case when fe.source_module = 'tires' then fe.source_id end),
        ('payroll', case when fe.source_module = 'payroll' then fe.source_id end),
        ('trip_expense', case when fe.source_module = 'trip_expense' then fe.source_id end)
    ) as k(kind, ref_id)
    where fe.company_id = p_company_id
      and fe.deleted_at is null
      and fe.entry_status not in ('cancelled', 'reversed')
      and fe.entry_type <> 'reversal'
      and k.ref_id is not null
  ),
  freight_charged as materialized (
    select distinct fe.trip_id
    from public.financial_entries fe
    where fe.company_id = p_company_id
      and fe.trip_id is not null
      and fe.trip_charge_key = 'freight'
      and fe.deleted_at is null
      and fe.entry_status not in ('cancelled', 'reversed')
  )
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
      and not exists (select 1 from posted p where p.kind = 'fuel' and p.ref_id = fr.id)
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
      and not exists (select 1 from posted p where p.kind = 'maintenance' and p.ref_id = mr.id)
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
      and not exists (select 1 from posted p where p.kind = 'tires' and p.ref_id = ti.id)
      and not exists (
        select 1 from posted p
        where ti.maintenance_record_id is not null
          and p.kind = 'maintenance'
          and p.ref_id = ti.maintenance_record_id
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
      and not exists (select 1 from posted p where p.kind = 'payroll' and p.ref_id = pe.id)
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
      and not exists (select 1 from posted p where p.kind = 'trip_expense' and p.ref_id = te.id)
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
      and not exists (select 1 from freight_charged c where c.trip_id = t.id)
  ) r03
  limit v_limit;

  -- R04 — lançamento ativo cuja origem foi excluída, não existe ou não exige mais lançamento
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
  cross join lateral (
    select coalesce(
      case fe.source_module
        when 'fuel' then (
          select case when x.deleted_at is null then 'ok' else 'deleted' end
          from public.fuel_records x where x.id = fe.source_id and x.company_id = fe.company_id)
        when 'maintenance' then (
          select case when x.deleted_at is null then 'ok' else 'deleted' end
          from public.maintenance_records x where x.id = fe.source_id and x.company_id = fe.company_id)
        when 'tires' then (
          select case when x.deleted_at is null then 'ok' else 'deleted' end
          from public.tires x where x.id = fe.source_id and x.company_id = fe.company_id)
        when 'payroll' then (
          select case
            when x.deleted_at is not null then 'deleted'
            when x.expense_status = 'cancelled' then 'inactive'
            else 'ok'
          end
          from public.payroll_expenses x where x.id = fe.source_id and x.company_id = fe.company_id)
        when 'trip_expense' then (
          -- Mesmos casos em que a 111 exige lançamento.
          select case
            when x.deleted_at is not null then 'deleted'
            when x.expense_type = 'advance' or x.paid_by is null
                 or x.paid_by not in ('company', 'driver', 'aggregate') then 'inactive'
            else 'ok'
          end
          from public.trip_expenses x where x.id = fe.source_id and x.company_id = fe.company_id)
      end,
      'missing'
    ) as state
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

  -- R05 — origem e lançamento divergentes (valor, viagem ou título de frete).
  -- Os lançamentos ativos são lidos uma vez e somados por origem (materialized),
  -- em vez de uma soma correlacionada por abastecimento, manutenção, pneu e folha.
  return query
  with fe_active as materialized (
    select
      fe.id, fe.amount, fe.adjustment_total, fe.entry_type, fe.trip_id, fe.trip_charge_key,
      fe.fuel_record_id, fe.source_module, fe.source_id
    from public.financial_entries fe
    where fe.company_id = p_company_id
      and fe.deleted_at is null
      and fe.entry_status not in ('cancelled', 'reversed')
      and fe.entry_type <> 'reversal'
  ),
  by_fuel as (
    -- Mesmo critério de antes: vínculo direto OU par de origem, sem contar duas vezes.
    select k.fuel_id, round(sum(a.amount), 2) as total, count(*) as entries
    from fe_active a
    cross join lateral (
      select distinct v.fuel_id
      from (values (a.fuel_record_id), (case when a.source_module = 'fuel' then a.source_id end)) as v(fuel_id)
      where v.fuel_id is not null
    ) k
    group by k.fuel_id
  ),
  by_source as (
    select a.source_module, a.source_id, round(sum(a.amount), 2) as total, count(*) as entries
    from fe_active a
    where a.source_module in ('maintenance', 'tires', 'payroll')
      and a.source_id is not null
    group by a.source_module, a.source_id
  )
  select * from (
    select
      'R05'::text, 'high'::text, 'fuel_record'::text, fr.id,
      coalesce(nullif(btrim(fr.station_name), ''), 'Abastecimento'),
      round(fr.total_amount, 2), s.total,
      jsonb_build_object('reason', 'amount', 'entries', s.entries),
      false
    from public.fuel_records fr
    join by_fuel s on s.fuel_id = fr.id
    where fr.company_id = p_company_id
      and fr.deleted_at is null
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
    join by_source s on s.source_module = 'maintenance' and s.source_id = mr.id
    where mr.company_id = p_company_id
      and mr.deleted_at is null
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
    join by_source s on s.source_module = 'tires' and s.source_id = ti.id
    where ti.company_id = p_company_id
      and ti.deleted_at is null
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
    join by_source s on s.source_module = 'payroll' and s.source_id = pe.id
    where pe.company_id = p_company_id
      and pe.deleted_at is null
      and pe.expense_status <> 'cancelled'
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
    join fe_active fe
      on fe.source_module = 'trip_expense'
     and fe.source_id = te.id
     and fe.entry_type = 'expense'
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
    join fe_active fe
      on fe.trip_id = t.id
     and fe.trip_charge_key = 'freight'
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

  -- R10 — mais de uma receita ativa para a mesma viagem (uma leitura, agrupada por viagem)
  return query
  with revenue_by_trip as (
    select
      fe.trip_id,
      count(*) as entries,
      round(sum(fe.amount), 2) as total,
      jsonb_agg(fe.id order by fe.created_at, fe.id) as entry_ids
    from public.financial_entries fe
    where fe.company_id = p_company_id
      and fe.trip_id is not null
      and fe.entry_type = 'revenue'
      and fe.deleted_at is null
      and fe.entry_status not in ('cancelled', 'reversed')
    group by fe.trip_id
    having count(*) > 1
  )
  select
    'R10'::text, 'high'::text, 'trip'::text, t.id,
    t.trip_number,
    round(coalesce(t.actual_freight_value, t.contracted_freight_value, 0), 2),
    r.total,
    jsonb_build_object('reason', 'duplicate_revenue', 'entries', r.entries, 'entry_ids', r.entry_ids),
    false
  from public.trips t
  join revenue_by_trip r on r.trip_id = t.id
  where t.company_id = p_company_id
    and t.deleted_at is null
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
  'Fase 2.1: achados da reconciliação financeira (R01–R10, R14), somente leitura. Security definer: exige financeiro:read (ou super admin/serviço) e filtra pela empresa em toda consulta. Limite por verificação (1–1000; nulo = sem limite).';

revoke all on function public.financial_reconciliation_findings(uuid, date, date, integer) from public, anon;
grant execute on function public.financial_reconciliation_findings(uuid, date, date, integer) to authenticated, service_role;
