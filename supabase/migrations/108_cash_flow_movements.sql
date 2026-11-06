-- FleetControl — Fluxo de caixa por movimento e estatísticas sem receita antecipada
-- Não altera dados. A view respeita a RLS de quem consulta (security_invoker).

-- ---------------------------------------------------------------------------
-- financial_cash_flow_lines
-- ---------------------------------------------------------------------------
-- Lançamento sem movimentos: uma linha, como sempre foi.
-- Título com movimentos: uma linha por recebimento ou estorno, na data do
-- movimento, mais uma linha com o saldo em aberto. Ajuste não é caixa.

create or replace view public.financial_cash_flow_lines
with (security_invoker = true)
as
with moved as (
  select distinct m.financial_entry_id
  from public.financial_entry_movements m
)
select
  fe.id::text as line_id,
  fe.id as financial_entry_id,
  null::uuid as movement_id,
  fe.company_id,
  fe.entry_type,
  fe.entry_status as line_status,
  fe.source_module,
  fe.description,
  fe.supplier,
  fe.client,
  fe.due_date,
  fe.deleted_at,
  case
    when fe.entry_status = 'paid' and fe.paid_at is not null then (fe.paid_at)::date
    else coalesce(fe.due_date, fe.entry_date)
  end as movement_date,
  case
    when fe.entry_status = 'paid' and fe.paid_amount is not null then fe.paid_amount
    else fe.amount
  end as line_amount
from public.financial_entries fe
where not exists (select 1 from moved where moved.financial_entry_id = fe.id)

union all

select
  m.id::text,
  fe.id,
  m.id,
  fe.company_id,
  fe.entry_type,
  'paid'::public.financial_entry_status,
  fe.source_module,
  fe.description,
  fe.supplier,
  fe.client,
  fe.due_date,
  fe.deleted_at,
  m.movement_date,
  case when m.kind = 'receipt' then m.amount else -m.amount end
from public.financial_entry_movements m
inner join public.financial_entries fe
  on fe.id = m.financial_entry_id
  and fe.company_id = m.company_id
where m.kind in ('receipt', 'receipt_reversal')

union all

select
  fe.id::text || ':open',
  fe.id,
  null::uuid,
  fe.company_id,
  fe.entry_type,
  fe.entry_status,
  fe.source_module,
  fe.description,
  fe.supplier,
  fe.client,
  fe.due_date,
  fe.deleted_at,
  coalesce(fe.due_date, fe.entry_date),
  fe.amount + fe.adjustment_total - coalesce(fe.paid_amount, 0)
from public.financial_entries fe
where exists (select 1 from moved where moved.financial_entry_id = fe.id)
  and fe.entry_status in ('pending', 'overdue')
  and fe.amount + fe.adjustment_total - coalesce(fe.paid_amount, 0) > 0;

comment on view public.financial_cash_flow_lines is
  'Linhas do fluxo de caixa: entrada só na data do recebimento; saldo em aberto à parte';

grant select on public.financial_cash_flow_lines to authenticated;
grant select on public.financial_cash_flow_lines to service_role;

-- ---------------------------------------------------------------------------
-- get_financial_stats
-- ---------------------------------------------------------------------------
-- Título de frete só conta como receita depois da conclusão da viagem, a mesma
-- competência da DRE. Antes disso é só contas a receber.

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
           round(sum(abs(signed_amount))::numeric, 2) as total_cost
    from signed
    where vehicle_id is not null
    group by vehicle_id
    order by total_cost desc
    limit 5
  ),
  top_drivers as (
    select driver_id, max(driver_name) as driver_name,
           round(sum(abs(signed_amount))::numeric, 2) as total_cost
    from signed
    where driver_id is not null
    group by driver_id
    order by total_cost desc
    limit 5
  ),
  top_categories as (
    select category_id, max(category_name) as category_name,
           round(sum(abs(signed_amount))::numeric, 2) as total_amount
    from signed
    where category_id is not null
    group by category_id
    order by total_amount desc
    limit 5
  ),
  top_cost_centers as (
    select cost_center_id, max(cost_center_name) as cost_center_name,
           round(sum(abs(signed_amount))::numeric, 2) as total_amount
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
    'balance', coalesce((select round(sum(signed_amount)::numeric, 2) from signed), 0),
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
