-- FleetControl Sprint 17 — vehicles, history and documents

create table public.vehicles (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies (id) on delete restrict,
  branch_id            uuid references public.branches (id) on delete set null,
  plate                text not null,
  fleet_number         text,
  vehicle_type         text not null,
  brand                text,
  model                text,
  year                 integer,
  renavam              text,
  chassis              text,
  color                text,
  fuel_type            public.vehicle_fuel_type,
  load_capacity_kg     numeric(12, 2),
  gross_weight_kg      numeric(12, 2),
  tare_kg              numeric(12, 2),
  axles                integer,
  initial_odometer_km  numeric(12, 1) not null default 0,
  current_odometer_km  numeric(12, 1) not null default 0,
  hour_meter           numeric(12, 1),
  asset_status         public.vehicle_asset_status not null default 'active',
  photo_url            text,
  crlv_url             text,
  metadata             jsonb not null default '{}'::jsonb,
  status               public.entity_status not null default 'active',
  notes                text,
  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now()),
  deleted_at           timestamptz,
  created_by           uuid references public.profiles (id) on delete set null,
  updated_by           uuid references public.profiles (id) on delete set null,

  constraint vehicles_plate_not_empty check (length(trim(plate)) > 0),
  constraint vehicles_type_not_empty check (length(trim(vehicle_type)) > 0),
  constraint vehicles_year_valid check (year is null or (year >= 1900 and year <= 2100)),
  constraint vehicles_axles_positive check (axles is null or axles > 0),
  constraint vehicles_odometer_non_negative check (
    initial_odometer_km >= 0 and current_odometer_km >= 0
  ),
  constraint vehicles_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create unique index idx_vehicles_company_plate_active
  on public.vehicles (company_id, upper(trim(plate)))
  where deleted_at is null;

create index idx_vehicles_company_id_active
  on public.vehicles (company_id)
  where deleted_at is null;

create index idx_vehicles_company_branch_active
  on public.vehicles (company_id, branch_id)
  where deleted_at is null;

create index idx_vehicles_company_asset_status
  on public.vehicles (company_id, asset_status)
  where deleted_at is null;

create index idx_vehicles_company_fleet_number
  on public.vehicles (company_id, fleet_number)
  where deleted_at is null and fleet_number is not null;

create index idx_vehicles_company_brand
  on public.vehicles (company_id, brand)
  where deleted_at is null and brand is not null;

create index idx_vehicles_company_type
  on public.vehicles (company_id, vehicle_type)
  where deleted_at is null;

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row
  execute function public.set_updated_at();

alter table public.vehicles enable row level security;

comment on table public.vehicles is 'Fleet vehicles belonging to a transport company';

-- ---------------------------------------------------------------------------
-- vehicle_history — audit trail for all vehicle changes
-- ---------------------------------------------------------------------------

create table public.vehicle_history (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  vehicle_id            uuid not null references public.vehicles (id) on delete cascade,
  action                text not null,
  changes               jsonb not null default '{}'::jsonb,
  previous_asset_status public.vehicle_asset_status,
  new_asset_status      public.vehicle_asset_status,
  created_at            timestamptz not null default timezone('utc', now()),
  created_by            uuid references public.profiles (id) on delete set null,

  constraint vehicle_history_action_not_empty check (length(trim(action)) > 0),
  constraint vehicle_history_changes_is_object check (jsonb_typeof(changes) = 'object')
);

create index idx_vehicle_history_vehicle_created
  on public.vehicle_history (vehicle_id, created_at desc);

create index idx_vehicle_history_company_vehicle
  on public.vehicle_history (company_id, vehicle_id);

alter table public.vehicle_history enable row level security;

comment on table public.vehicle_history is 'Change history for fleet vehicles';

-- ---------------------------------------------------------------------------
-- vehicle_documents — uploaded files (CRLV, photos, attachments)
-- ---------------------------------------------------------------------------

create table public.vehicle_documents (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete restrict,
  vehicle_id     uuid not null references public.vehicles (id) on delete cascade,
  name           text not null,
  file_url       text not null,
  document_type  text not null default 'document',
  mime_type      text,
  file_size      integer,
  created_at     timestamptz not null default timezone('utc', now()),
  deleted_at     timestamptz,
  created_by     uuid references public.profiles (id) on delete set null,

  constraint vehicle_documents_name_not_empty check (length(trim(name)) > 0),
  constraint vehicle_documents_file_url_not_empty check (length(trim(file_url)) > 0)
);

create index idx_vehicle_documents_vehicle_active
  on public.vehicle_documents (vehicle_id)
  where deleted_at is null;

create index idx_vehicle_documents_company_vehicle
  on public.vehicle_documents (company_id, vehicle_id)
  where deleted_at is null;

alter table public.vehicle_documents enable row level security;

comment on table public.vehicle_documents is 'Documents and files attached to vehicles';

-- ---------------------------------------------------------------------------
-- Trigger: log vehicle changes to vehicle_history
-- ---------------------------------------------------------------------------

create or replace function public.log_vehicle_history()
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
    insert into public.vehicle_history (
      company_id,
      vehicle_id,
      action,
      changes,
      new_asset_status,
      created_by
    )
    values (
      new.company_id,
      new.id,
      'create',
      jsonb_build_object(
        'plate', new.plate,
        'fleet_number', new.fleet_number,
        'vehicle_type', new.vehicle_type,
        'asset_status', new.asset_status
      ),
      new.asset_status,
      new.created_by
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_actor := new.updated_by;

    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.vehicle_history (
        company_id,
        vehicle_id,
        action,
        changes,
        previous_asset_status,
        new_asset_status,
        created_by
      )
      values (
        new.company_id,
        new.id,
        'delete',
        jsonb_build_object('deleted_at', new.deleted_at),
        old.asset_status,
        new.asset_status,
        v_actor
      );
      return new;
    end if;

    if old.asset_status is distinct from new.asset_status then
      v_action := 'status_change';
    end if;

    if old.plate is distinct from new.plate then
      v_changes := v_changes || jsonb_build_object('plate', jsonb_build_object('from', old.plate, 'to', new.plate));
    end if;
    if old.fleet_number is distinct from new.fleet_number then
      v_changes := v_changes || jsonb_build_object('fleet_number', jsonb_build_object('from', old.fleet_number, 'to', new.fleet_number));
    end if;
    if old.vehicle_type is distinct from new.vehicle_type then
      v_changes := v_changes || jsonb_build_object('vehicle_type', jsonb_build_object('from', old.vehicle_type, 'to', new.vehicle_type));
    end if;
    if old.brand is distinct from new.brand then
      v_changes := v_changes || jsonb_build_object('brand', jsonb_build_object('from', old.brand, 'to', new.brand));
    end if;
    if old.model is distinct from new.model then
      v_changes := v_changes || jsonb_build_object('model', jsonb_build_object('from', old.model, 'to', new.model));
    end if;
    if old.branch_id is distinct from new.branch_id then
      v_changes := v_changes || jsonb_build_object('branch_id', jsonb_build_object('from', old.branch_id, 'to', new.branch_id));
    end if;
    if old.asset_status is distinct from new.asset_status then
      v_changes := v_changes || jsonb_build_object('asset_status', jsonb_build_object('from', old.asset_status, 'to', new.asset_status));
    end if;
    if old.current_odometer_km is distinct from new.current_odometer_km then
      v_changes := v_changes || jsonb_build_object('current_odometer_km', jsonb_build_object('from', old.current_odometer_km, 'to', new.current_odometer_km));
    end if;
    if old.photo_url is distinct from new.photo_url then
      v_changes := v_changes || jsonb_build_object('photo_url', jsonb_build_object('from', old.photo_url, 'to', new.photo_url));
    end if;
    if old.crlv_url is distinct from new.crlv_url then
      v_changes := v_changes || jsonb_build_object('crlv_url', jsonb_build_object('from', old.crlv_url, 'to', new.crlv_url));
    end if;

    if v_changes = '{}'::jsonb and v_action = 'update' then
      return new;
    end if;

    insert into public.vehicle_history (
      company_id,
      vehicle_id,
      action,
      changes,
      previous_asset_status,
      new_asset_status,
      created_by
    )
    values (
      new.company_id,
      new.id,
      v_action,
      v_changes,
      old.asset_status,
      new.asset_status,
      v_actor
    );
    return new;
  end if;

  return new;
end;
$$;

create trigger vehicles_log_history
  after insert or update on public.vehicles
  for each row
  execute function public.log_vehicle_history();

grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert on public.vehicle_history to authenticated;
grant select, insert, update, delete on public.vehicle_documents to authenticated;
