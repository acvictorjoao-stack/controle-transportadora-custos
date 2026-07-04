-- FleetControl Sprint 19 — trips and related tables

-- ---------------------------------------------------------------------------
-- trips — core operational entity
-- ---------------------------------------------------------------------------

create table public.trips (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies (id) on delete restrict,
  branch_id            uuid references public.branches (id) on delete set null,
  trip_number          text not null,
  trip_status          public.trip_status not null default 'planned',
  driver_id            uuid references public.drivers (id) on delete set null,
  vehicle_id           uuid references public.vehicles (id) on delete set null,
  client_name          text,
  contract_reference   text,
  origin               text,
  destination          text,
  route                text,
  initial_odometer_km  numeric(12, 2),
  final_odometer_km    numeric(12, 2),
  initial_hour_meter   numeric(12, 2),
  final_hour_meter     numeric(12, 2),
  departed_at          timestamptz,
  arrived_at           timestamptz,
  weight_kg            numeric(12, 2),
  volume_m3            numeric(12, 4),
  cargo_type           text,
  notes                text,
  responsible          text,
  metadata             jsonb not null default '{}'::jsonb,
  status               public.entity_status not null default 'active',
  external_id          text,
  integration_source   text,
  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now()),
  deleted_at           timestamptz,
  created_by           uuid references public.profiles (id) on delete set null,
  updated_by           uuid references public.profiles (id) on delete set null,

  constraint trips_trip_number_not_empty check (length(trim(trip_number)) > 0),
  constraint trips_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint trips_odometer_range check (
    final_odometer_km is null
    or initial_odometer_km is null
    or final_odometer_km >= initial_odometer_km
  ),
  constraint trips_hour_meter_range check (
    final_hour_meter is null
    or initial_hour_meter is null
    or final_hour_meter >= initial_hour_meter
  )
);

create unique index idx_trips_company_trip_number_active
  on public.trips (company_id, trip_number)
  where deleted_at is null;

create index idx_trips_company_id_active
  on public.trips (company_id)
  where deleted_at is null;

create index idx_trips_company_branch_active
  on public.trips (company_id, branch_id)
  where deleted_at is null;

create index idx_trips_company_status
  on public.trips (company_id, trip_status)
  where deleted_at is null;

create index idx_trips_company_driver
  on public.trips (company_id, driver_id)
  where deleted_at is null and driver_id is not null;

create index idx_trips_company_vehicle
  on public.trips (company_id, vehicle_id)
  where deleted_at is null and vehicle_id is not null;

create index idx_trips_company_client
  on public.trips (company_id, client_name)
  where deleted_at is null and client_name is not null;

create index idx_trips_company_contract
  on public.trips (company_id, contract_reference)
  where deleted_at is null and contract_reference is not null;

create index idx_trips_company_departed_at
  on public.trips (company_id, departed_at desc)
  where deleted_at is null and departed_at is not null;

create index idx_trips_company_created_at
  on public.trips (company_id, created_at desc)
  where deleted_at is null;

create index idx_trips_company_external_id
  on public.trips (company_id, integration_source, external_id)
  where deleted_at is null and external_id is not null;

create trigger trips_set_updated_at
  before update on public.trips
  for each row
  execute function public.set_updated_at();

alter table public.trips enable row level security;

comment on table public.trips is 'Fleet trips — core operational records';

-- ---------------------------------------------------------------------------
-- trip_history — audit trail
-- ---------------------------------------------------------------------------

create table public.trip_history (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  trip_id               uuid not null references public.trips (id) on delete cascade,
  action                text not null,
  changes               jsonb not null default '{}'::jsonb,
  previous_trip_status  public.trip_status,
  new_trip_status       public.trip_status,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint trip_history_action_not_empty check (length(trim(action)) > 0),
  constraint trip_history_changes_is_object check (jsonb_typeof(changes) = 'object')
);

create index idx_trip_history_trip_created
  on public.trip_history (trip_id, created_at desc);

create index idx_trip_history_company_trip
  on public.trip_history (company_id, trip_id);

alter table public.trip_history enable row level security;

comment on table public.trip_history is 'Change history for fleet trips';

-- ---------------------------------------------------------------------------
-- trip_documents
-- ---------------------------------------------------------------------------

create table public.trip_documents (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete restrict,
  branch_id      uuid references public.branches (id) on delete set null,
  trip_id        uuid not null references public.trips (id) on delete cascade,
  name           text not null,
  file_url       text not null,
  storage_path   text,
  document_type  public.trip_document_type not null default 'other',
  mime_type      text,
  file_size      integer,
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now()),
  deleted_at     timestamptz,
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,

  constraint trip_documents_name_not_empty check (length(trim(name)) > 0),
  constraint trip_documents_file_url_not_empty check (length(trim(file_url)) > 0)
);

create index idx_trip_documents_trip_active
  on public.trip_documents (trip_id)
  where deleted_at is null;

create index idx_trip_documents_company_trip
  on public.trip_documents (company_id, trip_id)
  where deleted_at is null;

alter table public.trip_documents enable row level security;

-- ---------------------------------------------------------------------------
-- trip_occurrences
-- ---------------------------------------------------------------------------

create table public.trip_occurrences (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete restrict,
  branch_id        uuid references public.branches (id) on delete set null,
  trip_id          uuid not null references public.trips (id) on delete cascade,
  occurrence_type  public.trip_occurrence_type not null,
  description      text,
  occurred_at      timestamptz not null default timezone('utc', now()),
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now()),
  deleted_at       timestamptz,
  created_by       uuid references public.profiles (id) on delete set null,
  updated_by       uuid references public.profiles (id) on delete set null
);

create index idx_trip_occurrences_trip_active
  on public.trip_occurrences (trip_id)
  where deleted_at is null;

create index idx_trip_occurrences_company_trip
  on public.trip_occurrences (company_id, trip_id)
  where deleted_at is null;

alter table public.trip_occurrences enable row level security;

-- ---------------------------------------------------------------------------
-- trip_checklists — configurable pre/post trip checklist
-- ---------------------------------------------------------------------------

create table public.trip_checklists (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies (id) on delete restrict,
  branch_id           uuid references public.branches (id) on delete set null,
  trip_id             uuid not null references public.trips (id) on delete cascade,
  tires_ok            boolean,
  headlights_ok       boolean,
  brakes_ok           boolean,
  documentation_ok    boolean,
  fuel_ok             boolean,
  odometer_reading    numeric(12, 2),
  hour_meter_reading  numeric(12, 2),
  photo_urls          jsonb not null default '[]'::jsonb,
  signature_url       text,
  notes               text,
  completed_at        timestamptz,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now()),
  deleted_at          timestamptz,
  created_by          uuid references public.profiles (id) on delete set null,
  updated_by          uuid references public.profiles (id) on delete set null,

  constraint trip_checklists_photo_urls_is_array check (jsonb_typeof(photo_urls) = 'array')
);

create unique index idx_trip_checklists_trip_active
  on public.trip_checklists (trip_id)
  where deleted_at is null;

create index idx_trip_checklists_company_trip
  on public.trip_checklists (company_id, trip_id)
  where deleted_at is null;

create trigger trip_checklists_set_updated_at
  before update on public.trip_checklists
  for each row
  execute function public.set_updated_at();

alter table public.trip_checklists enable row level security;

-- ---------------------------------------------------------------------------
-- trip_expenses — structure only (no finance integration)
-- ---------------------------------------------------------------------------

create table public.trip_expenses (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete restrict,
  branch_id     uuid references public.branches (id) on delete set null,
  trip_id       uuid not null references public.trips (id) on delete cascade,
  expense_type  public.trip_expense_type not null,
  amount        numeric(14, 2) not null default 0,
  currency      text not null default 'BRL',
  description   text,
  expense_date  date not null default current_date,
  receipt_url   text,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  deleted_at    timestamptz,
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null,

  constraint trip_expenses_amount_non_negative check (amount >= 0)
);

create index idx_trip_expenses_trip_active
  on public.trip_expenses (trip_id)
  where deleted_at is null;

create index idx_trip_expenses_company_trip
  on public.trip_expenses (company_id, trip_id)
  where deleted_at is null;

create trigger trip_expenses_set_updated_at
  before update on public.trip_expenses
  for each row
  execute function public.set_updated_at();

alter table public.trip_expenses enable row level security;

-- ---------------------------------------------------------------------------
-- trip_stops — delivery / pickup stops
-- ---------------------------------------------------------------------------

create table public.trip_stops (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete restrict,
  branch_id       uuid references public.branches (id) on delete set null,
  trip_id         uuid not null references public.trips (id) on delete cascade,
  client_name     text,
  stop_date       date,
  stop_time       time,
  latitude        numeric(10, 7),
  longitude       numeric(10, 7),
  stopped_minutes integer,
  notes           text,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  deleted_at      timestamptz,
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null
);

create index idx_trip_stops_trip_active
  on public.trip_stops (trip_id)
  where deleted_at is null;

create index idx_trip_stops_company_trip
  on public.trip_stops (company_id, trip_id)
  where deleted_at is null;

create trigger trip_stops_set_updated_at
  before update on public.trip_stops
  for each row
  execute function public.set_updated_at();

alter table public.trip_stops enable row level security;

-- ---------------------------------------------------------------------------
-- trip_locations — GPS tracking points
-- ---------------------------------------------------------------------------

create table public.trip_locations (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete restrict,
  branch_id    uuid references public.branches (id) on delete set null,
  trip_id      uuid not null references public.trips (id) on delete cascade,
  latitude     numeric(10, 7) not null,
  longitude    numeric(10, 7) not null,
  recorded_at  timestamptz not null default timezone('utc', now()),
  speed_kmh    numeric(8, 2),
  accuracy_m   numeric(8, 2),
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now()),
  deleted_at   timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  updated_by   uuid references public.profiles (id) on delete set null
);

create index idx_trip_locations_trip_recorded
  on public.trip_locations (trip_id, recorded_at desc)
  where deleted_at is null;

create index idx_trip_locations_company_trip
  on public.trip_locations (company_id, trip_id)
  where deleted_at is null;

create trigger trip_locations_set_updated_at
  before update on public.trip_locations
  for each row
  execute function public.set_updated_at();

alter table public.trip_locations enable row level security;

-- ---------------------------------------------------------------------------
-- Generate trip number
-- ---------------------------------------------------------------------------

create or replace function public.generate_trip_number(p_company_id uuid)
returns text
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_seq int;
  v_year text := to_char(timezone('utc', now()), 'YYYY');
begin
  select count(*)::int + 1
  into v_seq
  from public.trips
  where company_id = p_company_id
    and deleted_at is null
    and extract(year from created_at at time zone 'utc') = extract(year from timezone('utc', now()));

  return 'V' || v_year || lpad(v_seq::text, 5, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: log trip changes to trip_history
-- ---------------------------------------------------------------------------

create or replace function public.log_trip_history()
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
    insert into public.trip_history (
      company_id, branch_id, trip_id, action, changes,
      new_trip_status, created_by
    )
    values (
      new.company_id, new.branch_id, new.id, 'create',
      jsonb_build_object(
        'trip_number', new.trip_number,
        'trip_status', new.trip_status,
        'driver_id', new.driver_id,
        'vehicle_id', new.vehicle_id
      ),
      new.trip_status,
      new.created_by
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_actor := new.updated_by;

    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.trip_history (
        company_id, branch_id, trip_id, action, changes,
        previous_trip_status, new_trip_status, created_by
      )
      values (
        new.company_id, new.branch_id, new.id, 'delete',
        jsonb_build_object('deleted_at', new.deleted_at),
        old.trip_status, new.trip_status, v_actor
      );
      return new;
    end if;

    if old.trip_status is distinct from new.trip_status then
      v_action := 'status_change';
    end if;

    if old.driver_id is distinct from new.driver_id then
      if v_action = 'update' then v_action := 'driver_change'; end if;
      v_changes := v_changes || jsonb_build_object(
        'driver_id', jsonb_build_object('from', old.driver_id, 'to', new.driver_id)
      );
    end if;

    if old.vehicle_id is distinct from new.vehicle_id then
      if v_action = 'update' then v_action := 'vehicle_change'; end if;
      v_changes := v_changes || jsonb_build_object(
        'vehicle_id', jsonb_build_object('from', old.vehicle_id, 'to', new.vehicle_id)
      );
    end if;

    if old.trip_status is distinct from new.trip_status then
      v_changes := v_changes || jsonb_build_object(
        'trip_status', jsonb_build_object('from', old.trip_status, 'to', new.trip_status)
      );
    end if;

    if old.branch_id is distinct from new.branch_id then
      v_changes := v_changes || jsonb_build_object(
        'branch_id', jsonb_build_object('from', old.branch_id, 'to', new.branch_id)
      );
    end if;

    if old.client_name is distinct from new.client_name then
      v_changes := v_changes || jsonb_build_object(
        'client_name', jsonb_build_object('from', old.client_name, 'to', new.client_name)
      );
    end if;

    if old.origin is distinct from new.origin then
      v_changes := v_changes || jsonb_build_object(
        'origin', jsonb_build_object('from', old.origin, 'to', new.origin)
      );
    end if;

    if old.destination is distinct from new.destination then
      v_changes := v_changes || jsonb_build_object(
        'destination', jsonb_build_object('from', old.destination, 'to', new.destination)
      );
    end if;

    if old.arrived_at is null and new.arrived_at is not null then
      if v_action = 'update' then v_action := 'completed'; end if;
    end if;

    if v_changes = '{}'::jsonb and v_action = 'update' then
      return new;
    end if;

    insert into public.trip_history (
      company_id, branch_id, trip_id, action, changes,
      previous_trip_status, new_trip_status, created_by
    )
    values (
      new.company_id, new.branch_id, new.id, v_action, v_changes,
      old.trip_status, new.trip_status, v_actor
    );
    return new;
  end if;

  return new;
end;
$$;

create trigger trips_log_history
  after insert or update on public.trips
  for each row
  execute function public.log_trip_history();

-- ---------------------------------------------------------------------------
-- Child table history triggers
-- ---------------------------------------------------------------------------

create or replace function public.log_trip_document_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_history (
    company_id, branch_id, trip_id, action, changes, created_by
  )
  values (
    new.company_id, new.branch_id, new.trip_id, 'document_upload',
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

create trigger trip_documents_log_history
  after insert on public.trip_documents
  for each row
  execute function public.log_trip_document_history();

create or replace function public.log_trip_occurrence_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_history (
    company_id, branch_id, trip_id, action, changes, created_by
  )
  values (
    new.company_id, new.branch_id, new.trip_id, 'occurrence',
    jsonb_build_object(
      'occurrence_type', new.occurrence_type,
      'description', new.description,
      'occurred_at', new.occurred_at
    ),
    new.created_by
  );
  return new;
end;
$$;

create trigger trip_occurrences_log_history
  after insert on public.trip_occurrences
  for each row
  execute function public.log_trip_occurrence_history();

create or replace function public.log_trip_checklist_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_history (
    company_id, branch_id, trip_id, action, changes, created_by
  )
  values (
    new.company_id, new.branch_id, new.trip_id,
    case when tg_op = 'INSERT' then 'checklist_create' else 'checklist_update' end,
    jsonb_build_object(
      'tires_ok', new.tires_ok,
      'headlights_ok', new.headlights_ok,
      'brakes_ok', new.brakes_ok,
      'documentation_ok', new.documentation_ok,
      'fuel_ok', new.fuel_ok,
      'completed_at', new.completed_at
    ),
    coalesce(new.updated_by, new.created_by)
  );
  return new;
end;
$$;

create trigger trip_checklists_log_history
  after insert or update on public.trip_checklists
  for each row
  execute function public.log_trip_checklist_history();

-- ---------------------------------------------------------------------------
-- Aggregated trip stats (RLS enforced via security invoker)
-- ---------------------------------------------------------------------------

create or replace function public.get_trip_stats(p_company_id uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      t.id,
      t.trip_status,
      t.driver_id,
      t.vehicle_id,
      t.departed_at,
      t.arrived_at,
      t.initial_odometer_km,
      t.final_odometer_km
    from public.trips t
    where t.company_id = p_company_id
      and t.deleted_at is null
  ),
  in_progress_statuses as (
    select unnest(array[
      'loading'::public.trip_status,
      'in_progress'::public.trip_status,
      'delivering'::public.trip_status,
      'waiting'::public.trip_status
    ]) as status
  ),
  duration_stats as (
    select
      extract(epoch from (arrived_at - departed_at)) / 3600.0 as hours,
      coalesce(final_odometer_km - initial_odometer_km, 0) as km
    from base
    where arrived_at is not null
      and departed_at is not null
      and arrived_at > departed_at
  )
  select json_build_object(
    'total', (select count(*)::int from base),
    'in_progress', (
      select count(*)::int from base b
      where b.trip_status in (select status from in_progress_statuses)
    ),
    'completed', (select count(*)::int from base where trip_status = 'completed'),
    'cancelled', (select count(*)::int from base where trip_status = 'cancelled'),
    'average_duration_hours', coalesce((select round(avg(hours)::numeric, 2) from duration_stats), 0),
    'total_km', coalesce((select round(sum(km)::numeric, 2) from duration_stats), 0),
    'drivers_on_trip', (
      select count(distinct driver_id)::int from base b
      where b.driver_id is not null
        and b.trip_status in (select status from in_progress_statuses)
    ),
    'vehicles_on_trip', (
      select count(distinct vehicle_id)::int from base b
      where b.vehicle_id is not null
        and b.trip_status in (select status from in_progress_statuses)
    ),
    'occurrences', (
      select count(*)::int
      from public.trip_occurrences o
      where o.company_id = p_company_id
        and o.deleted_at is null
    ),
    'deliveries_completed', (
      select count(*)::int from base
      where trip_status in ('completed', 'returned')
    )
  );
$$;

comment on function public.get_trip_stats(uuid) is
  'Aggregated trip statistics for dashboard KPIs';

grant select, insert, update, delete on public.trips to authenticated;
grant select, insert on public.trip_history to authenticated;
grant select, insert, update, delete on public.trip_documents to authenticated;
grant select, insert, update, delete on public.trip_occurrences to authenticated;
grant select, insert, update, delete on public.trip_checklists to authenticated;
grant select, insert, update, delete on public.trip_expenses to authenticated;
grant select, insert, update, delete on public.trip_stops to authenticated;
grant select, insert, update, delete on public.trip_locations to authenticated;
grant execute on function public.generate_trip_number(uuid) to authenticated;
grant execute on function public.get_trip_stats(uuid) to authenticated;
