-- FleetControl Sprint 20 — fuel records, history and documents

-- ---------------------------------------------------------------------------
-- fuel_records — core operational entity
-- ---------------------------------------------------------------------------

create table public.fuel_records (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid not null references public.vehicles (id) on delete restrict,
  driver_id             uuid not null references public.drivers (id) on delete restrict,
  trip_id               uuid references public.trips (id) on delete set null,
  station_name          text,
  station_brand         text,
  city                  text,
  state                 text,
  fueled_at             timestamptz not null default timezone('utc', now()),
  fuel_type             public.vehicle_fuel_type not null,
  quantity_liters       numeric(12, 3) not null,
  price_per_liter       numeric(12, 4) not null,
  total_amount          numeric(14, 2) not null,
  odometer_km           numeric(12, 2),
  hour_meter            numeric(12, 2),
  km_traveled           numeric(12, 2),
  consumption_l_per_100km numeric(12, 4),
  km_per_liter          numeric(12, 4),
  cost_per_km           numeric(12, 4),
  autonomy_km           numeric(12, 2),
  notes                 text,
  responsible           text,
  is_inconsistent       boolean not null default false,
  inconsistency_flags   public.fuel_inconsistency_flag[] not null default '{}',
  metadata              jsonb not null default '{}'::jsonb,
  status                public.entity_status not null default 'active',
  external_id           text,
  integration_source    text,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint fuel_records_quantity_positive check (quantity_liters > 0),
  constraint fuel_records_price_positive check (price_per_liter >= 0),
  constraint fuel_records_total_positive check (total_amount >= 0),
  constraint fuel_records_odometer_non_negative check (odometer_km is null or odometer_km >= 0),
  constraint fuel_records_hour_meter_non_negative check (hour_meter is null or hour_meter >= 0),
  constraint fuel_records_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index idx_fuel_records_company_id_active
  on public.fuel_records (company_id)
  where deleted_at is null;

create index idx_fuel_records_company_branch_active
  on public.fuel_records (company_id, branch_id)
  where deleted_at is null;

create index idx_fuel_records_company_vehicle_active
  on public.fuel_records (company_id, vehicle_id, fueled_at desc)
  where deleted_at is null;

create index idx_fuel_records_company_driver_active
  on public.fuel_records (company_id, driver_id, fueled_at desc)
  where deleted_at is null;

create index idx_fuel_records_company_trip_active
  on public.fuel_records (company_id, trip_id)
  where deleted_at is null and trip_id is not null;

create index idx_fuel_records_company_fueled_at
  on public.fuel_records (company_id, fueled_at desc)
  where deleted_at is null;

create index idx_fuel_records_company_fuel_type
  on public.fuel_records (company_id, fuel_type)
  where deleted_at is null;

create index idx_fuel_records_company_city
  on public.fuel_records (company_id, city)
  where deleted_at is null and city is not null;

create index idx_fuel_records_company_station
  on public.fuel_records (company_id, station_name)
  where deleted_at is null and station_name is not null;

create index idx_fuel_records_company_inconsistent
  on public.fuel_records (company_id, is_inconsistent)
  where deleted_at is null and is_inconsistent = true;

create index idx_fuel_records_company_external_id
  on public.fuel_records (company_id, integration_source, external_id)
  where deleted_at is null and external_id is not null;

create trigger fuel_records_set_updated_at
  before update on public.fuel_records
  for each row
  execute function public.set_updated_at();

alter table public.fuel_records enable row level security;

comment on table public.fuel_records is 'Fleet fuel refueling records';

-- ---------------------------------------------------------------------------
-- fuel_history — audit trail
-- ---------------------------------------------------------------------------

create table public.fuel_history (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete restrict,
  branch_id       uuid references public.branches (id) on delete set null,
  vehicle_id      uuid references public.vehicles (id) on delete set null,
  driver_id       uuid references public.drivers (id) on delete set null,
  trip_id         uuid references public.trips (id) on delete set null,
  fuel_record_id  uuid not null references public.fuel_records (id) on delete cascade,
  action          text not null,
  changes         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  deleted_at      timestamptz,
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,

  constraint fuel_history_action_not_empty check (length(trim(action)) > 0),
  constraint fuel_history_changes_is_object check (jsonb_typeof(changes) = 'object')
);

create index idx_fuel_history_record_created
  on public.fuel_history (fuel_record_id, created_at desc);

create index idx_fuel_history_company_record
  on public.fuel_history (company_id, fuel_record_id);

create index idx_fuel_history_company_vehicle
  on public.fuel_history (company_id, vehicle_id)
  where vehicle_id is not null;

create trigger fuel_history_set_updated_at
  before update on public.fuel_history
  for each row
  execute function public.set_updated_at();

alter table public.fuel_history enable row level security;

comment on table public.fuel_history is 'Change history for fuel records';

-- ---------------------------------------------------------------------------
-- fuel_documents
-- ---------------------------------------------------------------------------

create table public.fuel_documents (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete restrict,
  branch_id       uuid references public.branches (id) on delete set null,
  vehicle_id      uuid references public.vehicles (id) on delete set null,
  driver_id       uuid references public.drivers (id) on delete set null,
  trip_id         uuid references public.trips (id) on delete set null,
  fuel_record_id  uuid not null references public.fuel_records (id) on delete cascade,
  name            text not null,
  file_url        text not null,
  storage_path    text,
  document_type   public.fuel_document_type not null default 'other',
  mime_type       text,
  file_size       integer,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  deleted_at      timestamptz,
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,

  constraint fuel_documents_name_not_empty check (length(trim(name)) > 0),
  constraint fuel_documents_file_url_not_empty check (length(trim(file_url)) > 0)
);

create index idx_fuel_documents_record_active
  on public.fuel_documents (fuel_record_id)
  where deleted_at is null;

create index idx_fuel_documents_company_record
  on public.fuel_documents (company_id, fuel_record_id)
  where deleted_at is null;

alter table public.fuel_documents enable row level security;

comment on table public.fuel_documents is 'Documents attached to fuel records';

-- ---------------------------------------------------------------------------
-- History triggers
-- ---------------------------------------------------------------------------

create or replace function public.log_fuel_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_action text := 'update';
  v_actor uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.fuel_history (
      company_id, branch_id, vehicle_id, driver_id, trip_id,
      fuel_record_id, action, changes, created_by
    )
    values (
      new.company_id, new.branch_id, new.vehicle_id, new.driver_id, new.trip_id,
      new.id, 'create',
      jsonb_build_object(
        'vehicle_id', new.vehicle_id,
        'driver_id', new.driver_id,
        'fuel_type', new.fuel_type,
        'quantity_liters', new.quantity_liters,
        'total_amount', new.total_amount,
        'fueled_at', new.fueled_at
      ),
      new.created_by
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_actor := new.updated_by;

    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.fuel_history (
        company_id, branch_id, vehicle_id, driver_id, trip_id,
        fuel_record_id, action, changes, created_by
      )
      values (
        new.company_id, new.branch_id, new.vehicle_id, new.driver_id, new.trip_id,
        new.id, 'delete',
        jsonb_build_object('deleted_at', new.deleted_at),
        v_actor
      );
      return new;
    end if;

    if old.vehicle_id is distinct from new.vehicle_id then
      v_action := 'vehicle_change';
      v_changes := v_changes || jsonb_build_object(
        'vehicle_id', jsonb_build_object('from', old.vehicle_id, 'to', new.vehicle_id)
      );
    end if;

    if old.driver_id is distinct from new.driver_id then
      if v_action = 'update' then v_action := 'driver_change'; end if;
      v_changes := v_changes || jsonb_build_object(
        'driver_id', jsonb_build_object('from', old.driver_id, 'to', new.driver_id)
      );
    end if;

    if old.trip_id is distinct from new.trip_id then
      v_changes := v_changes || jsonb_build_object(
        'trip_id', jsonb_build_object('from', old.trip_id, 'to', new.trip_id)
      );
    end if;

    if old.branch_id is distinct from new.branch_id then
      v_changes := v_changes || jsonb_build_object(
        'branch_id', jsonb_build_object('from', old.branch_id, 'to', new.branch_id)
      );
    end if;

    if old.fuel_type is distinct from new.fuel_type then
      v_changes := v_changes || jsonb_build_object(
        'fuel_type', jsonb_build_object('from', old.fuel_type, 'to', new.fuel_type)
      );
    end if;

    if old.quantity_liters is distinct from new.quantity_liters then
      v_changes := v_changes || jsonb_build_object(
        'quantity_liters', jsonb_build_object('from', old.quantity_liters, 'to', new.quantity_liters)
      );
    end if;

    if old.price_per_liter is distinct from new.price_per_liter then
      v_changes := v_changes || jsonb_build_object(
        'price_per_liter', jsonb_build_object('from', old.price_per_liter, 'to', new.price_per_liter)
      );
    end if;

    if old.total_amount is distinct from new.total_amount then
      v_changes := v_changes || jsonb_build_object(
        'total_amount', jsonb_build_object('from', old.total_amount, 'to', new.total_amount)
      );
    end if;

    if old.odometer_km is distinct from new.odometer_km then
      v_changes := v_changes || jsonb_build_object(
        'odometer_km', jsonb_build_object('from', old.odometer_km, 'to', new.odometer_km)
      );
    end if;

    if old.hour_meter is distinct from new.hour_meter then
      v_changes := v_changes || jsonb_build_object(
        'hour_meter', jsonb_build_object('from', old.hour_meter, 'to', new.hour_meter)
      );
    end if;

    if old.fueled_at is distinct from new.fueled_at then
      v_changes := v_changes || jsonb_build_object(
        'fueled_at', jsonb_build_object('from', old.fueled_at, 'to', new.fueled_at)
      );
    end if;

    if old.station_name is distinct from new.station_name then
      v_changes := v_changes || jsonb_build_object(
        'station_name', jsonb_build_object('from', old.station_name, 'to', new.station_name)
      );
    end if;

    if old.is_inconsistent is distinct from new.is_inconsistent
       or old.inconsistency_flags is distinct from new.inconsistency_flags then
      v_action := 'correction';
      v_changes := v_changes || jsonb_build_object(
        'is_inconsistent', jsonb_build_object('from', old.is_inconsistent, 'to', new.is_inconsistent),
        'inconsistency_flags', jsonb_build_object('from', old.inconsistency_flags, 'to', new.inconsistency_flags)
      );
    end if;

    if old.km_traveled is distinct from new.km_traveled
       or old.km_per_liter is distinct from new.km_per_liter
       or old.consumption_l_per_100km is distinct from new.consumption_l_per_100km
       or old.cost_per_km is distinct from new.cost_per_km
       or old.autonomy_km is distinct from new.autonomy_km then
      if v_action = 'update' then v_action := 'metrics_recalculated'; end if;
    end if;

    if v_changes = '{}'::jsonb and v_action = 'update' then
      return new;
    end if;

    insert into public.fuel_history (
      company_id, branch_id, vehicle_id, driver_id, trip_id,
      fuel_record_id, action, changes, created_by
    )
    values (
      new.company_id, new.branch_id, new.vehicle_id, new.driver_id, new.trip_id,
      new.id, v_action, v_changes, v_actor
    );
    return new;
  end if;

  return new;
end;
$$;

create trigger fuel_records_log_history
  after insert or update on public.fuel_records
  for each row
  execute function public.log_fuel_history();

create or replace function public.log_fuel_document_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.fuel_history (
    company_id, branch_id, vehicle_id, driver_id, trip_id,
    fuel_record_id, action, changes, created_by
  )
  values (
    new.company_id, new.branch_id, new.vehicle_id, new.driver_id, new.trip_id,
    new.fuel_record_id, 'document_upload',
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

create trigger fuel_documents_log_history
  after insert on public.fuel_documents
  for each row
  execute function public.log_fuel_document_history();

-- ---------------------------------------------------------------------------
-- Aggregated fuel stats (RLS enforced via security invoker)
-- ---------------------------------------------------------------------------

create or replace function public.get_fuel_stats(p_company_id uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      fr.id,
      fr.vehicle_id,
      fr.driver_id,
      fr.quantity_liters,
      fr.total_amount,
      fr.price_per_liter,
      fr.km_per_liter,
      fr.consumption_l_per_100km,
      fr.station_name,
      fr.station_brand,
      v.plate as vehicle_plate,
      d.name as driver_name
    from public.fuel_records fr
    left join public.vehicles v
      on v.id = fr.vehicle_id and v.deleted_at is null
    left join public.drivers d
      on d.id = fr.driver_id and d.deleted_at is null
    where fr.company_id = p_company_id
      and fr.deleted_at is null
  ),
  vehicle_efficiency as (
    select
      vehicle_id,
      max(vehicle_plate) as vehicle_plate,
      avg(km_per_liter) filter (where km_per_liter is not null and km_per_liter > 0) as avg_km_per_liter
    from base
    group by vehicle_id
  ),
  driver_efficiency as (
    select
      driver_id,
      max(driver_name) as driver_name,
      avg(km_per_liter) filter (where km_per_liter is not null and km_per_liter > 0) as avg_km_per_liter
    from base
    group by driver_id
  ),
  top_stations as (
    select
      station_name,
      count(*)::int as refuel_count,
      round(sum(total_amount)::numeric, 2) as total_spent
    from base
    where station_name is not null and length(trim(station_name)) > 0
    group by station_name
    order by refuel_count desc
    limit 5
  ),
  top_brands as (
    select
      station_brand,
      count(*)::int as refuel_count,
      round(sum(total_amount)::numeric, 2) as total_spent
    from base
    where station_brand is not null and length(trim(station_brand)) > 0
    group by station_brand
    order by refuel_count desc
    limit 5
  ),
  best_vehicle as (
    select vehicle_id, vehicle_plate, avg_km_per_liter
    from vehicle_efficiency
    where avg_km_per_liter is not null
    order by avg_km_per_liter desc
    limit 1
  ),
  worst_vehicle as (
    select vehicle_id, vehicle_plate, avg_km_per_liter
    from vehicle_efficiency
    where avg_km_per_liter is not null
    order by avg_km_per_liter asc
    limit 1
  ),
  best_driver as (
    select driver_id, driver_name, avg_km_per_liter
    from driver_efficiency
    where avg_km_per_liter is not null
    order by avg_km_per_liter desc
    limit 1
  ),
  worst_driver as (
    select driver_id, driver_name, avg_km_per_liter
    from driver_efficiency
    where avg_km_per_liter is not null
    order by avg_km_per_liter asc
    limit 1
  )
  select json_build_object(
    'total', (select count(*)::int from base),
    'total_liters', coalesce((select round(sum(quantity_liters)::numeric, 3) from base), 0),
    'total_amount', coalesce((select round(sum(total_amount)::numeric, 2) from base), 0),
    'average_price_per_liter', coalesce((
      select round(
        case when sum(quantity_liters) > 0
          then sum(total_amount) / sum(quantity_liters)
          else 0
        end::numeric, 4
      ) from base
    ), 0),
    'average_consumption_l_per_100km', coalesce((
      select round(avg(consumption_l_per_100km)::numeric, 4)
      from base
      where consumption_l_per_100km is not null and consumption_l_per_100km > 0
    ), 0),
    'average_km_per_liter', coalesce((
      select round(avg(km_per_liter)::numeric, 4)
      from base
      where km_per_liter is not null and km_per_liter > 0
    ), 0),
    'most_economical_vehicle', (
      select json_build_object(
        'vehicle_id', vehicle_id,
        'vehicle_plate', vehicle_plate,
        'km_per_liter', round(avg_km_per_liter::numeric, 4)
      ) from best_vehicle
    ),
    'least_economical_vehicle', (
      select json_build_object(
        'vehicle_id', vehicle_id,
        'vehicle_plate', vehicle_plate,
        'km_per_liter', round(avg_km_per_liter::numeric, 4)
      ) from worst_vehicle
    ),
    'most_economical_driver', (
      select json_build_object(
        'driver_id', driver_id,
        'driver_name', driver_name,
        'km_per_liter', round(avg_km_per_liter::numeric, 4)
      ) from best_driver
    ),
    'least_economical_driver', (
      select json_build_object(
        'driver_id', driver_id,
        'driver_name', driver_name,
        'km_per_liter', round(avg_km_per_liter::numeric, 4)
      ) from worst_driver
    ),
    'top_stations', coalesce((
      select json_agg(
        json_build_object(
          'station_name', station_name,
          'refuel_count', refuel_count,
          'total_spent', total_spent
        )
        order by refuel_count desc
      ) from top_stations
    ), '[]'::json),
    'top_brands', coalesce((
      select json_agg(
        json_build_object(
          'station_brand', station_brand,
          'refuel_count', refuel_count,
          'total_spent', total_spent
        )
        order by refuel_count desc
      ) from top_brands
    ), '[]'::json),
    'inconsistent_count', (
      select count(*)::int
      from public.fuel_records fr
      where fr.company_id = p_company_id
        and fr.deleted_at is null
        and fr.is_inconsistent = true
    )
  );
$$;

comment on function public.get_fuel_stats(uuid) is
  'Aggregated fuel statistics for dashboard KPIs';

grant select, insert, update, delete on public.fuel_records to authenticated;
grant select, insert on public.fuel_history to authenticated;
grant select, insert, update, delete on public.fuel_documents to authenticated;
grant execute on function public.get_fuel_stats(uuid) to authenticated;
