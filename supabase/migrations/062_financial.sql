-- FleetControl Sprint 23 — financial tables, history, documents, ledger and stats

-- ---------------------------------------------------------------------------
-- financial_categories
-- ---------------------------------------------------------------------------

create table public.financial_categories (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  driver_id             uuid references public.drivers (id) on delete set null,
  trip_id               uuid references public.trips (id) on delete set null,
  fuel_record_id        uuid references public.fuel_records (id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  tire_id               uuid references public.tires (id) on delete set null,
  slug                  public.financial_category_slug,
  name                  text not null,
  description           text,
  is_system             boolean not null default false,
  metadata              jsonb not null default '{}'::jsonb,
  status                public.entity_status not null default 'active',
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint financial_categories_name_not_empty check (length(trim(name)) > 0),
  constraint financial_categories_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create unique index idx_financial_categories_company_slug_active
  on public.financial_categories (company_id, slug)
  where deleted_at is null and slug is not null;

create index idx_financial_categories_company_active
  on public.financial_categories (company_id)
  where deleted_at is null;

create trigger financial_categories_set_updated_at
  before update on public.financial_categories
  for each row
  execute function public.set_updated_at();

alter table public.financial_categories enable row level security;

comment on table public.financial_categories is 'Financial categories per company with system defaults';

-- ---------------------------------------------------------------------------
-- financial_cost_centers
-- ---------------------------------------------------------------------------

create table public.financial_cost_centers (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  driver_id             uuid references public.drivers (id) on delete set null,
  trip_id               uuid references public.trips (id) on delete set null,
  fuel_record_id        uuid references public.fuel_records (id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  tire_id               uuid references public.tires (id) on delete set null,
  center_type           public.financial_cost_center_type not null,
  name                  text not null,
  reference_id          uuid,
  description           text,
  is_system             boolean not null default false,
  metadata              jsonb not null default '{}'::jsonb,
  status                public.entity_status not null default 'active',
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint financial_cost_centers_name_not_empty check (length(trim(name)) > 0),
  constraint financial_cost_centers_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index idx_financial_cost_centers_company_active
  on public.financial_cost_centers (company_id)
  where deleted_at is null;

create index idx_financial_cost_centers_company_type
  on public.financial_cost_centers (company_id, center_type)
  where deleted_at is null;

create index idx_financial_cost_centers_company_vehicle
  on public.financial_cost_centers (company_id, vehicle_id)
  where deleted_at is null and vehicle_id is not null;

create trigger financial_cost_centers_set_updated_at
  before update on public.financial_cost_centers
  for each row
  execute function public.set_updated_at();

alter table public.financial_cost_centers enable row level security;

comment on table public.financial_cost_centers is 'Cost centers for financial allocation';

-- ---------------------------------------------------------------------------
-- financial_entries — operational ledger (never hard-deleted)
-- ---------------------------------------------------------------------------

create table public.financial_entries (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  driver_id             uuid references public.drivers (id) on delete set null,
  trip_id               uuid references public.trips (id) on delete set null,
  fuel_record_id        uuid references public.fuel_records (id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  tire_id               uuid references public.tires (id) on delete set null,
  category_id           uuid references public.financial_categories (id) on delete set null,
  cost_center_id        uuid references public.financial_cost_centers (id) on delete set null,
  entry_type            public.financial_entry_type not null,
  entry_status          public.financial_entry_status not null default 'pending',
  description           text,
  reference_number      text,
  amount                numeric(14, 2) not null,
  currency              text not null default 'BRL',
  entry_date            date not null default (timezone('utc', now()))::date,
  due_date              date,
  paid_at               timestamptz,
  reversed_entry_id     uuid references public.financial_entries (id) on delete set null,
  source_module         text,
  is_system_generated   boolean not null default false,
  notes                 text,
  metadata              jsonb not null default '{}'::jsonb,
  status                public.entity_status not null default 'active',
  external_id           text,
  integration_source    text,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint financial_entries_amount_non_negative check (amount >= 0),
  constraint financial_entries_currency_not_empty check (length(trim(currency)) > 0),
  constraint financial_entries_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create unique index idx_financial_entries_fuel_record_active
  on public.financial_entries (company_id, fuel_record_id)
  where deleted_at is null and fuel_record_id is not null;

create unique index idx_financial_entries_maintenance_record_active
  on public.financial_entries (company_id, maintenance_record_id)
  where deleted_at is null and maintenance_record_id is not null;

create index idx_financial_entries_company_active
  on public.financial_entries (company_id)
  where deleted_at is null;

create index idx_financial_entries_company_entry_date
  on public.financial_entries (company_id, entry_date desc)
  where deleted_at is null;

create index idx_financial_entries_company_type
  on public.financial_entries (company_id, entry_type)
  where deleted_at is null;

create index idx_financial_entries_company_status
  on public.financial_entries (company_id, entry_status)
  where deleted_at is null;

create index idx_financial_entries_company_category
  on public.financial_entries (company_id, category_id)
  where deleted_at is null;

create index idx_financial_entries_company_cost_center
  on public.financial_entries (company_id, cost_center_id)
  where deleted_at is null;

create index idx_financial_entries_company_vehicle
  on public.financial_entries (company_id, vehicle_id, entry_date desc)
  where deleted_at is null and vehicle_id is not null;

create index idx_financial_entries_company_driver
  on public.financial_entries (company_id, driver_id, entry_date desc)
  where deleted_at is null and driver_id is not null;

create index idx_financial_entries_company_trip
  on public.financial_entries (company_id, trip_id)
  where deleted_at is null and trip_id is not null;

create trigger financial_entries_set_updated_at
  before update on public.financial_entries
  for each row
  execute function public.set_updated_at();

alter table public.financial_entries enable row level security;

comment on table public.financial_entries is 'Financial ledger entries — soft delete only, reversals via estorno';

-- ---------------------------------------------------------------------------
-- financial_history
-- ---------------------------------------------------------------------------

create table public.financial_history (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  driver_id             uuid references public.drivers (id) on delete set null,
  trip_id               uuid references public.trips (id) on delete set null,
  fuel_record_id        uuid references public.fuel_records (id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  tire_id               uuid references public.tires (id) on delete set null,
  financial_entry_id    uuid not null references public.financial_entries (id) on delete cascade,
  action                text not null,
  changes               jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint financial_history_action_not_empty check (length(trim(action)) > 0),
  constraint financial_history_changes_is_object check (jsonb_typeof(changes) = 'object')
);

create index idx_financial_history_entry_created
  on public.financial_history (financial_entry_id, created_at desc);

create index idx_financial_history_company_entry
  on public.financial_history (company_id, financial_entry_id);

create trigger financial_history_set_updated_at
  before update on public.financial_history
  for each row
  execute function public.set_updated_at();

alter table public.financial_history enable row level security;

comment on table public.financial_history is 'Audit trail for financial entries';

-- ---------------------------------------------------------------------------
-- financial_documents
-- ---------------------------------------------------------------------------

create table public.financial_documents (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  driver_id             uuid references public.drivers (id) on delete set null,
  trip_id               uuid references public.trips (id) on delete set null,
  fuel_record_id        uuid references public.fuel_records (id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  tire_id               uuid references public.tires (id) on delete set null,
  financial_entry_id    uuid not null references public.financial_entries (id) on delete cascade,
  name                  text not null,
  file_url              text not null,
  storage_path          text,
  document_type         public.financial_document_type not null default 'other',
  mime_type             text,
  file_size             integer,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint financial_documents_name_not_empty check (length(trim(name)) > 0),
  constraint financial_documents_file_url_not_empty check (length(trim(file_url)) > 0),
  constraint financial_documents_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index idx_financial_documents_entry_active
  on public.financial_documents (financial_entry_id)
  where deleted_at is null;

create index idx_financial_documents_company_entry
  on public.financial_documents (company_id, financial_entry_id)
  where deleted_at is null;

create trigger financial_documents_set_updated_at
  before update on public.financial_documents
  for each row
  execute function public.set_updated_at();

alter table public.financial_documents enable row level security;

comment on table public.financial_documents is 'Documents attached to financial entries';

-- ---------------------------------------------------------------------------
-- Seed default categories and cost centers per company
-- ---------------------------------------------------------------------------

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
end;
$$;

comment on function public.seed_financial_defaults_for_company(uuid, uuid) is
  'Seeds default financial categories and company cost center';

-- Backfill defaults for existing companies
do $$
declare
  v_company record;
begin
  for v_company in
    select id from public.companies where deleted_at is null
  loop
    perform public.seed_financial_defaults_for_company(v_company.id, null);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- History triggers
-- ---------------------------------------------------------------------------

create or replace function public.log_financial_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_action text := 'update';
begin
  if tg_op = 'INSERT' then
    v_action := 'create';
    v_changes := jsonb_build_object(
      'entry_type', new.entry_type,
      'entry_status', new.entry_status,
      'amount', new.amount,
      'description', new.description
    );
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      v_action := 'soft_delete';
      v_changes := jsonb_build_object('deleted_at', new.deleted_at);
    elsif old.entry_status is distinct from new.entry_status then
      if new.entry_status = 'paid' then
        v_action := 'payment';
      elsif new.entry_status = 'cancelled' then
        v_action := 'cancellation';
      elsif new.entry_status = 'reversed' then
        v_action := 'reversal';
      else
        v_action := 'status_change';
      end if;
      v_changes := jsonb_build_object(
        'from', old.entry_status,
        'to', new.entry_status
      );
    else
      v_action := 'correction';
      v_changes := jsonb_strip_nulls(jsonb_build_object(
        'amount', case when old.amount is distinct from new.amount then jsonb_build_object('from', old.amount, 'to', new.amount) end,
        'description', case when old.description is distinct from new.description then jsonb_build_object('from', old.description, 'to', new.description) end,
        'entry_date', case when old.entry_date is distinct from new.entry_date then jsonb_build_object('from', old.entry_date, 'to', new.entry_date) end,
        'category_id', case when old.category_id is distinct from new.category_id then jsonb_build_object('from', old.category_id, 'to', new.category_id) end,
        'cost_center_id', case when old.cost_center_id is distinct from new.cost_center_id then jsonb_build_object('from', old.cost_center_id, 'to', new.cost_center_id) end
      ));
    end if;
  end if;

  insert into public.financial_history (
    company_id, branch_id, vehicle_id, driver_id, trip_id,
    fuel_record_id, maintenance_record_id, tire_id,
    financial_entry_id, action, changes, created_by
  )
  values (
    new.company_id, new.branch_id, new.vehicle_id, new.driver_id, new.trip_id,
    new.fuel_record_id, new.maintenance_record_id, new.tire_id,
    new.id, v_action, v_changes, coalesce(new.updated_by, new.created_by)
  );

  return new;
end;
$$;

create trigger financial_entries_log_history
  after insert or update on public.financial_entries
  for each row
  execute function public.log_financial_history();

create or replace function public.log_financial_document_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.financial_history (
    company_id, branch_id, vehicle_id, driver_id, trip_id,
    fuel_record_id, maintenance_record_id, tire_id,
    financial_entry_id, action, changes, created_by
  )
  values (
    new.company_id, new.branch_id, new.vehicle_id, new.driver_id, new.trip_id,
    new.fuel_record_id, new.maintenance_record_id, new.tire_id,
    new.financial_entry_id, 'document_upload',
    jsonb_build_object(
      'document_type', new.document_type,
      'name', new.name,
      'file_url', new.file_url
    ),
    new.created_by
  );
  return new;
end;
$$;

create trigger financial_documents_log_history
  after insert on public.financial_documents
  for each row
  execute function public.log_financial_document_history();

-- ---------------------------------------------------------------------------
-- Aggregated financial stats (RLS enforced via security invoker)
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
      fcc.name as cost_center_name,
      fcc.center_type as cost_center_type,
      v.plate as vehicle_plate,
      d.name as driver_name,
      t.trip_number
    from public.financial_entries fe
    left join public.financial_categories fc
      on fc.id = fe.category_id and fc.deleted_at is null
    left join public.financial_cost_centers fcc
      on fcc.id = fe.cost_center_id and fcc.deleted_at is null
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

grant select, insert, update, delete on public.financial_categories to authenticated;
grant select, insert, update, delete on public.financial_cost_centers to authenticated;
grant select, insert, update, delete on public.financial_entries to authenticated;
grant select, insert on public.financial_history to authenticated;
grant select, insert, update, delete on public.financial_documents to authenticated;
grant execute on function public.seed_financial_defaults_for_company(uuid, uuid) to authenticated;
grant execute on function public.get_financial_stats(uuid) to authenticated;
