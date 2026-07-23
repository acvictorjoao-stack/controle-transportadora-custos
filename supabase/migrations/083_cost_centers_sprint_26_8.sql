-- Sprint 26.8 — Organizational Cost Centers (Centro de Custos)
-- Retrocompatible: preserves financial_entries; migrates cost_center_id to
-- organizational centers; keeps financial_cost_centers as analytical/entity dims.
-- No RBAC / existing RLS policy changes.

-- ---------------------------------------------------------------------------
-- cost_centers — organizational centers (OPERACIONAL, ADMINISTRATIVO, …)
-- ---------------------------------------------------------------------------

create table public.cost_centers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete restrict,
  code        text not null,
  name        text not null,
  description text,
  is_system   boolean not null default false,
  status      public.entity_status not null default 'active',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,
  constraint cost_centers_code_not_empty check (length(trim(code)) > 0),
  constraint cost_centers_name_not_empty check (length(trim(name)) > 0),
  constraint cost_centers_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create unique index idx_cost_centers_company_code_active
  on public.cost_centers (company_id, upper(code))
  where deleted_at is null;

create index idx_cost_centers_company_active
  on public.cost_centers (company_id)
  where deleted_at is null;

create index idx_cost_centers_company_status
  on public.cost_centers (company_id, status)
  where deleted_at is null;

create trigger cost_centers_set_updated_at
  before update on public.cost_centers
  for each row
  execute function public.set_updated_at();

alter table public.cost_centers enable row level security;

comment on table public.cost_centers is
  'Organizational cost centers (OPERACIONAL, ADMINISTRATIVO, COMERCIAL, RH, TI, custom)';

comment on column public.cost_centers.code is
  'Stable uppercase code used by resolveCostCenter()';

comment on column public.cost_centers.is_system is
  'System-seeded centers cannot be hard-deleted; soft-delete blocked when linked';

-- ---------------------------------------------------------------------------
-- RLS — reuse financeiro:* permissions (no RBAC changes)
-- ---------------------------------------------------------------------------

create policy cost_centers_select_authorized
  on public.cost_centers
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'financeiro:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy cost_centers_insert_authorized
  on public.cost_centers
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'financeiro:create')
    or public.is_company_super_admin(company_id)
  );

create policy cost_centers_update_authorized
  on public.cost_centers
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  );

create policy cost_centers_delete_authorized
  on public.cost_centers
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:delete')
    or public.is_company_super_admin(company_id)
  );

grant select, insert, update, delete on public.cost_centers to authenticated;

-- ---------------------------------------------------------------------------
-- Seed defaults per company
-- ---------------------------------------------------------------------------

create or replace function public.seed_cost_centers_for_company(
  p_company_id uuid,
  p_created_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cost_centers (
    company_id, code, name, description, is_system, created_by, updated_by
  )
  select
    p_company_id,
    v.code,
    v.name,
    v.description,
    true,
    p_created_by,
    p_created_by
  from (
    values
      ('OPERACIONAL', 'Operacional', 'Custos da operação: combustível, manutenção, pneus, pedágio, multas'),
      ('ADMINISTRATIVO', 'Administrativo', 'Despesas administrativas: energia, internet, aluguel, licenças'),
      ('COMERCIAL', 'Comercial', 'Custos comerciais e de relacionamento com clientes'),
      ('RH', 'RH', 'Pessoas: salários administrativos, benefícios, treinamentos'),
      ('TI', 'TI', 'Tecnologia: softwares, infraestrutura, suporte')
  ) as v(code, name, description)
  where not exists (
    select 1
    from public.cost_centers cc
    where cc.company_id = p_company_id
      and upper(cc.code) = v.code
      and cc.deleted_at is null
  );
end;
$$;

comment on function public.seed_cost_centers_for_company(uuid, uuid) is
  'Seeds default organizational cost centers for a company';

grant execute on function public.seed_cost_centers_for_company(uuid, uuid) to authenticated;

-- Hook into existing financial defaults seeder
create or replace function public.seed_financial_defaults_for_company(
  p_company_id uuid,
  p_created_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.financial_categories (
    company_id, slug, name, is_system, created_by, updated_by
  )
  select p_company_id, v.slug::public.financial_category_slug, v.name, true, p_created_by, p_created_by
  from (
    values
      ('combustivel', 'Combustível'),
      ('pedagio', 'Pedágio'),
      ('manutencao', 'Manutenção'),
      ('pneus', 'Pneus'),
      ('salarios', 'Salários'),
      ('diarias', 'Diárias'),
      ('hospedagem', 'Hospedagem'),
      ('alimentacao', 'Alimentação'),
      ('impostos', 'Impostos'),
      ('seguros', 'Seguros'),
      ('multas', 'Multas'),
      ('fretes', 'Fretes'),
      ('receitas', 'Receitas'),
      ('outros', 'Outros')
  ) as v(slug, name)
  where not exists (
    select 1
    from public.financial_categories fc
    where fc.company_id = p_company_id
      and fc.slug = v.slug::public.financial_category_slug
      and fc.deleted_at is null
  );

  insert into public.financial_cost_centers (
    company_id, center_type, name, is_system, created_by, updated_by
  )
  select p_company_id, 'company'::public.financial_cost_center_type, 'Empresa', true, p_created_by, p_created_by
  where not exists (
    select 1
    from public.financial_cost_centers fcc
    where fcc.company_id = p_company_id
      and fcc.center_type = 'company'
      and fcc.is_system = true
      and fcc.deleted_at is null
  );

  perform public.seed_cost_centers_for_company(p_company_id, p_created_by);
end;
$$;

comment on function public.seed_financial_defaults_for_company(uuid, uuid) is
  'Seeds default financial categories, legacy analytical centers, and organizational cost centers';

-- Seed for all existing companies
do $$
declare
  v_company record;
begin
  for v_company in
    select id from public.companies where deleted_at is null
  loop
    perform public.seed_cost_centers_for_company(v_company.id, null);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- financial_entries: preserve legacy analytical center, retarget cost_center_id
-- ---------------------------------------------------------------------------

alter table public.financial_entries
  add column if not exists analytical_center_id uuid
    references public.financial_cost_centers (id) on delete set null;

comment on column public.financial_entries.analytical_center_id is
  'Legacy/entity analytical center (vehicle/driver/branch/…). Prefer direct FKs + cost_centers for new analyses.';

comment on table public.financial_cost_centers is
  'Entity-linked analytical centers (vehicle, driver, trip, …). Organizational allocation uses cost_centers.';

-- Preserve existing cost_center_id values that pointed to financial_cost_centers
update public.financial_entries
set analytical_center_id = cost_center_id
where cost_center_id is not null
  and analytical_center_id is null;

create index if not exists idx_financial_entries_company_analytical_center
  on public.financial_entries (company_id, analytical_center_id)
  where deleted_at is null and analytical_center_id is not null;

-- Clear organizational FK before retargeting constraint
update public.financial_entries
set cost_center_id = null
where cost_center_id is not null;

alter table public.financial_entries
  drop constraint if exists financial_entries_cost_center_id_fkey;

alter table public.financial_entries
  add constraint financial_entries_cost_center_id_fkey
  foreign key (cost_center_id)
  references public.cost_centers (id)
  on delete set null;

comment on column public.financial_entries.cost_center_id is
  'Organizational cost center (cost_centers)';

-- Backfill OPERACIONAL for operational / linked expenses
update public.financial_entries fe
set cost_center_id = cc.id
from public.cost_centers cc
where cc.company_id = fe.company_id
  and upper(cc.code) = 'OPERACIONAL'
  and cc.deleted_at is null
  and fe.deleted_at is null
  and fe.cost_center_id is null
  and fe.entry_type = 'expense'
  and (
    fe.source_module in ('fuel', 'maintenance', 'tires', 'fines', 'tolls')
    or fe.fuel_record_id is not null
    or fe.maintenance_record_id is not null
    or fe.tire_id is not null
  );

-- ---------------------------------------------------------------------------
-- get_financial_stats — join organizational cost_centers (same JSON contract)
-- ---------------------------------------------------------------------------

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

comment on function public.get_financial_stats(uuid) is
  'Aggregated financial statistics for dashboard KPIs and reports';
