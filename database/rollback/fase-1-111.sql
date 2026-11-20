-- FleetControl — Reversão da migration 111 (Fase 1, Etapa 2)
-- NÃO é migration: fica fora de supabase/migrations e só roda por decisão explícita.
--
-- Antes de executar:
--   1. Reverta o código publicado que preenche paid_by (Etapa 2.2/2.3).
--   2. Avalie os lançamentos já criados pela sincronização (origem trip_expense).
--      Eles NÃO são apagados aqui: continuam como custo da viagem e da DRE.
--      Se for preciso tirá-los, faça um estorno controlado, um a um, e só nos
--      que não tiverem pagamento ou movimento posterior.
--
-- O que esta reversão faz:
--   - remove a sincronização despesa -> lançamento e a proteção do lançamento;
--   - devolve trip_financial_summary à versão da 110 (sem trip_expense_costs);
--   - devolve get_financial_stats à versão da 110 (o caixa volta a contar o
--     gasto pago com adiantamento como saída).
--
-- O que ela mantém, de propósito:
--   - as colunas paid_by, payment_method e due_date de trip_expenses e suas
--     restrições: apagá-las perderia o que os usuários informaram. Para
--     removê-las, use o bloco comentado no fim, depois de exportar os valores.

begin;

drop trigger if exists trip_expenses_sync_financial_entry on public.trip_expenses;
drop trigger if exists trip_expenses_close_financial_entry on public.trip_expenses;
drop trigger if exists financial_entries_guard_trip_expense on public.financial_entries;

drop function if exists public.sync_trip_expense_entry();
drop function if exists public.close_trip_expense_entry_on_delete();
drop function if exists public.guard_trip_expense_entry();
drop function if exists public.close_trip_expense_entry(uuid, uuid);
drop function if exists public.request_is_hml_company_reset();
drop function if exists public.trip_expense_financial_treatment(text, text);
drop function if exists public.trip_expense_category_slug(public.trip_expense_type);
drop function if exists public.trip_expense_type_label(public.trip_expense_type);

-- create or replace não remove coluna: a view volta à 110 por drop + create.
drop view if exists public.trip_financial_summary;

create view public.trip_financial_summary
with (security_invoker = true)
as
select
  t.id as trip_id,
  t.company_id,
  t.trip_number,
  t.trip_status,
  t.completed_at,
  round(coalesce(t.actual_freight_value, t.contracted_freight_value, 0)::numeric, 2)
    as freight_amount,
  case when vis.visible then costs.direct_costs end as direct_costs,
  case when vis.visible then costs.fuel_costs end as fuel_costs,
  case when vis.visible then costs.maintenance_costs end as maintenance_costs,
  case when vis.visible then costs.tire_costs end as tire_costs,
  case when vis.visible then
    costs.direct_costs - costs.fuel_costs - costs.maintenance_costs - costs.tire_costs
  end as other_costs,
  case when vis.visible then costs.direct_cost_entries end as direct_cost_entries,
  case when vis.visible then
    round(coalesce(t.actual_freight_value, t.contracted_freight_value, 0)::numeric, 2)
      - costs.direct_costs
  end as result,
  case
    when vis.visible
      and coalesce(t.actual_freight_value, t.contracted_freight_value, 0) > 0 then round(
      (
        (coalesce(t.actual_freight_value, t.contracted_freight_value, 0) - costs.direct_costs)
        / coalesce(t.actual_freight_value, t.contracted_freight_value, 0)
      ) * 100,
      2
    )
  end as margin_percent,
  case when vis.visible then costs.advances_total end as advances_total,
  case when vis.visible then costs.reimbursements_total end as reimbursements_total,
  case when vis.visible then aba.unposted_trip_expenses_amount end
    as unposted_trip_expenses_amount,
  case when vis.visible then aba.unposted_trip_expenses_count end
    as unposted_trip_expenses_count,
  aba.legacy_advance_expenses_amount,
  aba.legacy_advance_expenses_count,
  case when vis.visible then charge.receivable_entry_id end as receivable_entry_id,
  case when vis.visible then charge.receivable_status end as receivable_status,
  case when vis.visible then charge.receivable_amount end as receivable_amount,
  case when vis.visible then charge.receivable_received end as receivable_received,
  case
    when vis.visible and charge.receivable_entry_id is not null
      then charge.receivable_amount - charge.receivable_received
  end as receivable_balance,
  vis.visible as financial_visible
from public.trips t
cross join lateral (
  select coalesce(
    public.has_company_permission(t.company_id, 'financeiro:read')
    or public.is_company_super_admin(t.company_id)
    or (select r.rolbypassrls from pg_catalog.pg_roles r where r.rolname = current_user),
    false
  ) as visible
) vis
cross join lateral (
  select
    coalesce(round(sum(fe.amount) filter (where fe.entry_type = 'expense'), 2), 0)
      as direct_costs,
    coalesce(round(sum(fe.amount) filter (
      where fe.entry_type = 'expense'
        and (fc.slug = 'combustivel' or fe.fuel_record_id is not null)
    ), 2), 0) as fuel_costs,
    coalesce(round(sum(fe.amount) filter (
      where fe.entry_type = 'expense'
        and not (fc.slug is not distinct from 'combustivel' or fe.fuel_record_id is not null)
        and (fc.slug = 'manutencao' or fe.maintenance_record_id is not null)
    ), 2), 0) as maintenance_costs,
    coalesce(round(sum(fe.amount) filter (
      where fe.entry_type = 'expense'
        and not (fc.slug is not distinct from 'combustivel' or fe.fuel_record_id is not null)
        and not (fc.slug is not distinct from 'manutencao' or fe.maintenance_record_id is not null)
        and (fc.slug = 'pneus' or fe.tire_id is not null)
    ), 2), 0) as tire_costs,
    count(*) filter (where fe.entry_type = 'expense')::integer as direct_cost_entries,
    coalesce(round(sum(fe.amount) filter (where fe.entry_type = 'advance'), 2), 0)
      as advances_total,
    coalesce(round(sum(fe.amount) filter (where fe.entry_type = 'reimbursement'), 2), 0)
      as reimbursements_total
  from public.financial_entries fe
  left join public.financial_categories fc on fc.id = fe.category_id
  where fe.company_id = t.company_id
    and fe.trip_id = t.id
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
    and fe.entry_type in ('expense', 'advance', 'reimbursement')
) costs
cross join lateral (
  select
    coalesce(round(sum(te.amount) filter (
      where te.expense_type <> 'advance'
        and not exists (
          select 1
          from public.financial_entries posted
          where posted.company_id = te.company_id
            and posted.source_module = 'trip_expense'
            and posted.source_id = te.id
            and posted.deleted_at is null
            and posted.entry_status not in ('cancelled', 'reversed')
            and posted.entry_type <> 'reversal'
        )
    ), 2), 0) as unposted_trip_expenses_amount,
    count(*) filter (
      where te.expense_type <> 'advance'
        and not exists (
          select 1
          from public.financial_entries posted
          where posted.company_id = te.company_id
            and posted.source_module = 'trip_expense'
            and posted.source_id = te.id
            and posted.deleted_at is null
            and posted.entry_status not in ('cancelled', 'reversed')
            and posted.entry_type <> 'reversal'
        )
    )::integer as unposted_trip_expenses_count,
    coalesce(round(sum(te.amount) filter (where te.expense_type = 'advance'), 2), 0)
      as legacy_advance_expenses_amount,
    count(*) filter (where te.expense_type = 'advance')::integer
      as legacy_advance_expenses_count
  from public.trip_expenses te
  where te.company_id = t.company_id
    and te.trip_id = t.id
    and te.deleted_at is null
) aba
left join lateral (
  select
    fe.id as receivable_entry_id,
    fe.entry_status as receivable_status,
    round((fe.amount + coalesce(fe.adjustment_total, 0))::numeric, 2) as receivable_amount,
    round(coalesce(fe.paid_amount, 0)::numeric, 2) as receivable_received
  from public.financial_entries fe
  where fe.company_id = t.company_id
    and fe.trip_id = t.id
    and fe.trip_charge_key = 'freight'
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
  order by fe.created_at
  limit 1
) charge on true
where t.deleted_at is null;

comment on view public.trip_financial_summary is
  'Fase 1: resultado da viagem = frete − custo direto em financial_entries (mesma regra da DRE). Adiantamento fica fora do custo.';

revoke all on table public.trip_financial_summary
  from public, anon, authenticated, service_role;

grant select on public.trip_financial_summary to authenticated;
grant select on public.trip_financial_summary to service_role;


-- get_financial_stats como na migration 110.
create or replace function public.get_financial_stats(p_company_id uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      fe.id,
      fe.entry_type,
      fe.entry_status,
      fe.amount,
      fe.entry_date,
      fe.vehicle_id,
      fe.driver_id,
      fe.trip_id,
      fe.category_id,
      fe.cost_center_id,
      fe.fuel_record_id,
      fe.maintenance_record_id,
      fe.tire_id,
      fc.slug as category_slug,
      fc.name as category_name,
      cc.name as cost_center_name,
      v.plate as vehicle_plate,
      d.name as driver_name,
      t.trip_number
    from public.financial_entries fe
    left join public.financial_categories fc
      on fc.id = fe.category_id and fc.deleted_at is null
    left join public.cost_centers cc
      on cc.id = fe.cost_center_id and cc.deleted_at is null
    left join public.vehicles v
      on v.id = fe.vehicle_id and v.deleted_at is null
    left join public.drivers d
      on d.id = fe.driver_id and d.deleted_at is null
    left join public.trips t
      on t.id = fe.trip_id and t.deleted_at is null
    where fe.company_id = p_company_id
      and fe.deleted_at is null
      and fe.entry_status not in ('cancelled', 'reversed')
      and fe.entry_type not in ('reversal')
      and (
        fe.trip_charge_key is null
        or (t.trip_status = 'completed' and t.id is not null)
      )
  ),
  signed as (
    select
      *,
      case
        when entry_type in ('revenue', 'reimbursement') then amount
        when entry_type in ('expense', 'advance') then -amount
        else 0
      end as signed_amount,
      -- Resultado: adiantamento é caixa, não custo (Fase 1, D6).
      case
        when entry_type in ('revenue', 'reimbursement') then amount
        when entry_type = 'expense' then -amount
        else 0
      end as result_amount,
      case when entry_type = 'revenue' then amount else 0 end as revenue_amount,
      case when entry_type = 'expense' then amount else 0 end as expense_amount
    from base
  ),
  trip_km as (
    select coalesce(
      sum(coalesce(final_odometer_km - initial_odometer_km, 0)),
      0
    ) as total_km
    from public.trips
    where company_id = p_company_id
      and deleted_at is null
      and trip_status = 'completed'
  ),
  top_vehicles as (
    select vehicle_id, max(vehicle_plate) as vehicle_plate,
           round(sum(abs(result_amount))::numeric, 2) as total_cost
    from signed
    where vehicle_id is not null
    group by vehicle_id
    order by total_cost desc
    limit 5
  ),
  top_drivers as (
    select driver_id, max(driver_name) as driver_name,
           round(sum(abs(result_amount))::numeric, 2) as total_cost
    from signed
    where driver_id is not null
    group by driver_id
    order by total_cost desc
    limit 5
  ),
  top_categories as (
    select category_id, max(category_name) as category_name,
           round(sum(abs(result_amount))::numeric, 2) as total_amount
    from signed
    where category_id is not null
    group by category_id
    order by total_amount desc
    limit 5
  ),
  top_cost_centers as (
    select cost_center_id, max(cost_center_name) as cost_center_name,
           round(sum(abs(result_amount))::numeric, 2) as total_amount
    from signed
    where cost_center_id is not null
    group by cost_center_id
    order by total_amount desc
    limit 5
  ),
  top_trips as (
    select trip_id, max(trip_number) as trip_number,
           round(sum(revenue_amount)::numeric, 2) as total_revenue,
           round(sum(expense_amount)::numeric, 2) as total_expense
    from signed
    where trip_id is not null
    group by trip_id
    order by (sum(revenue_amount) - sum(expense_amount)) desc
    limit 5
  )
  select json_build_object(
    'total', (select count(*)::int from base),
    'revenue', coalesce((select round(sum(revenue_amount)::numeric, 2) from signed), 0),
    'expenses', coalesce((select round(sum(expense_amount)::numeric, 2) from signed), 0),
    'balance', coalesce((select round(sum(result_amount)::numeric, 2) from signed), 0),
    'cash_flow', coalesce((
      select round(sum(signed_amount)::numeric, 2)
      from signed
      where entry_status = 'paid'
    ), 0),
    'operating_profit', coalesce((
      select round((sum(revenue_amount) - sum(expense_amount))::numeric, 2)
      from signed
    ), 0),
    'margin_percent', coalesce((
      select round(
        case when sum(revenue_amount) > 0
          then ((sum(revenue_amount) - sum(expense_amount)) / sum(revenue_amount)) * 100
          else 0
        end::numeric, 2
      )
      from signed
    ), 0),
    'ebitda', coalesce((
      select round((sum(revenue_amount) - sum(expense_amount))::numeric, 2)
      from signed
    ), 0),
    'fuel_cost', coalesce((
      select round(sum(amount)::numeric, 2)
      from signed
      where category_slug = 'combustivel' or fuel_record_id is not null
    ), 0),
    'maintenance_cost', coalesce((
      select round(sum(amount)::numeric, 2)
      from signed
      where category_slug = 'manutencao' or maintenance_record_id is not null
    ), 0),
    'tire_cost', coalesce((
      select round(sum(amount)::numeric, 2)
      from signed
      where category_slug = 'pneus' or tire_id is not null
    ), 0),
    'cost_per_km', coalesce((
      select round(
        case when (select total_km from trip_km) > 0
          then sum(expense_amount) / (select total_km from trip_km)
          else 0
        end::numeric, 4
      )
      from signed
    ), 0),
    'cost_per_vehicle', coalesce((
      select round(avg(vehicle_cost)::numeric, 2)
      from (
        select sum(expense_amount) as vehicle_cost
        from signed
        where vehicle_id is not null
        group by vehicle_id
      ) vc
    ), 0),
    'cost_per_driver', coalesce((
      select round(avg(driver_cost)::numeric, 2)
      from (
        select sum(expense_amount) as driver_cost
        from signed
        where driver_id is not null
        group by driver_id
      ) dc
    ), 0),
    'cost_per_trip', coalesce((
      select round(avg(trip_cost)::numeric, 2)
      from (
        select sum(expense_amount) as trip_cost
        from signed
        where trip_id is not null
        group by trip_id
      ) tc
    ), 0),
    'top_vehicles', coalesce((
      select json_agg(
        json_build_object(
          'vehicle_id', vehicle_id,
          'vehicle_plate', vehicle_plate,
          'total_cost', total_cost
        )
        order by total_cost desc
      ) from top_vehicles
    ), '[]'::json),
    'top_drivers', coalesce((
      select json_agg(
        json_build_object(
          'driver_id', driver_id,
          'driver_name', driver_name,
          'total_cost', total_cost
        )
        order by total_cost desc
      ) from top_drivers
    ), '[]'::json),
    'top_categories', coalesce((
      select json_agg(
        json_build_object(
          'category_id', category_id,
          'category_name', category_name,
          'total_amount', total_amount
        )
        order by total_amount desc
      ) from top_categories
    ), '[]'::json),
    'top_cost_centers', coalesce((
      select json_agg(
        json_build_object(
          'cost_center_id', cost_center_id,
          'cost_center_name', cost_center_name,
          'total_amount', total_amount
        )
        order by total_amount desc
      ) from top_cost_centers
    ), '[]'::json),
    'top_trips', coalesce((
      select json_agg(
        json_build_object(
          'trip_id', trip_id,
          'trip_number', trip_number,
          'total_revenue', total_revenue,
          'total_expense', total_expense,
          'profit', round((total_revenue - total_expense)::numeric, 2)
        )
        order by (total_revenue - total_expense) desc
      ) from top_trips
    ), '[]'::json)
  );
$$;

comment on function public.get_financial_stats(uuid) is
  'Estatísticas financeiras da empresa. Fase 1: adiantamento sai no caixa (cash_flow), mas não é custo (balance e rankings).';

commit;

-- Remoção opcional das colunas (perde o que foi informado):
-- alter table public.trip_expenses
--   drop constraint if exists trip_expenses_supplier_credit_requires_due_date,
--   drop constraint if exists trip_expenses_payment_combination_check,
--   drop constraint if exists trip_expenses_payment_method_check,
--   drop constraint if exists trip_expenses_paid_by_check,
--   drop column if exists due_date,
--   drop column if exists payment_method,
--   drop column if exists paid_by;
