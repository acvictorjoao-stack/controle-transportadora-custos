-- FleetControl Sprint 22 — tires, history, movements, inspections, recaps, documents

-- ---------------------------------------------------------------------------
-- tires — core entity
-- ---------------------------------------------------------------------------

create table public.tires (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  asset_number          text,
  internal_code         text,
  brand                 text,
  model                 text,
  tire_size             text,
  manufacturer          text,
  dot_number            text,
  fire_number           text,
  serial_number         text,
  expected_life_km      numeric(12, 2),
  current_km            numeric(12, 2) not null default 0,
  accumulated_km        numeric(12, 2) not null default 0,
  purchase_date         date,
  purchase_value        numeric(14, 2),
  supplier              text,
  warranty              text,
  tire_status           public.tire_status not null default 'in_stock',
  current_position      public.tire_position,
  notes                 text,
  recap_count           integer not null default 0,
  total_recap_cost      numeric(14, 2) not null default 0,
  remaining_life_km     numeric(12, 2),
  cost_per_km           numeric(12, 4),
  last_tread_depth_mm   numeric(6, 2),
  metadata              jsonb not null default '{}'::jsonb,
  status                public.entity_status not null default 'active',
  external_id           text,
  integration_source    text,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint tires_current_km_non_negative check (current_km >= 0),
  constraint tires_accumulated_km_non_negative check (accumulated_km >= 0),
  constraint tires_expected_life_non_negative check (expected_life_km is null or expected_life_km >= 0),
  constraint tires_purchase_value_non_negative check (purchase_value is null or purchase_value >= 0),
  constraint tires_recap_count_non_negative check (recap_count >= 0),
  constraint tires_total_recap_cost_non_negative check (total_recap_cost >= 0),
  constraint tires_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index idx_tires_company_id_active
  on public.tires (company_id)
  where deleted_at is null;

create index idx_tires_company_branch_active
  on public.tires (company_id, branch_id)
  where deleted_at is null;

create index idx_tires_company_vehicle_active
  on public.tires (company_id, vehicle_id)
  where deleted_at is null and vehicle_id is not null;

create index idx_tires_company_status
  on public.tires (company_id, tire_status)
  where deleted_at is null;

create index idx_tires_company_brand
  on public.tires (company_id, brand)
  where deleted_at is null and brand is not null;

create index idx_tires_company_supplier
  on public.tires (company_id, supplier)
  where deleted_at is null and supplier is not null;

create index idx_tires_company_position
  on public.tires (company_id, current_position)
  where deleted_at is null and current_position is not null;

create index idx_tires_company_asset_number
  on public.tires (company_id, asset_number)
  where deleted_at is null and asset_number is not null;

create index idx_tires_company_internal_code
  on public.tires (company_id, internal_code)
  where deleted_at is null and internal_code is not null;

create index idx_tires_company_external_id
  on public.tires (company_id, integration_source, external_id)
  where deleted_at is null and external_id is not null;

create index idx_tires_company_created_at
  on public.tires (company_id, created_at desc)
  where deleted_at is null;

create trigger tires_set_updated_at
  before update on public.tires
  for each row
  execute function public.set_updated_at();

alter table public.tires enable row level security;

comment on table public.tires is 'Fleet tire inventory and lifecycle tracking';

-- ---------------------------------------------------------------------------
-- tire_history — audit trail
-- ---------------------------------------------------------------------------

create table public.tire_history (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  tire_id               uuid not null references public.tires (id) on delete cascade,
  action                text not null,
  changes               jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint tire_history_action_not_empty check (length(trim(action)) > 0),
  constraint tire_history_changes_is_object check (jsonb_typeof(changes) = 'object')
);

create index idx_tire_history_tire_created
  on public.tire_history (tire_id, created_at desc);

create index idx_tire_history_company_tire
  on public.tire_history (company_id, tire_id);

create index idx_tire_history_company_vehicle
  on public.tire_history (company_id, vehicle_id)
  where vehicle_id is not null;

create trigger tire_history_set_updated_at
  before update on public.tire_history
  for each row
  execute function public.set_updated_at();

alter table public.tire_history enable row level security;

comment on table public.tire_history is 'Change history for tires';

-- ---------------------------------------------------------------------------
-- tire_movements — position and installation history
-- ---------------------------------------------------------------------------

create table public.tire_movements (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  tire_id               uuid not null references public.tires (id) on delete cascade,
  movement_type         public.tire_movement_type not null,
  position              public.tire_position,
  installed_at          timestamptz,
  removed_at            timestamptz,
  reason                text,
  responsible           text,
  odometer_km           numeric(12, 2),
  notes                 text,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint tire_movements_odometer_non_negative check (odometer_km is null or odometer_km >= 0)
);

create index idx_tire_movements_tire_active
  on public.tire_movements (tire_id, installed_at desc)
  where deleted_at is null;

create index idx_tire_movements_company_tire
  on public.tire_movements (company_id, tire_id)
  where deleted_at is null;

create index idx_tire_movements_company_vehicle
  on public.tire_movements (company_id, vehicle_id)
  where deleted_at is null and vehicle_id is not null;

create trigger tire_movements_set_updated_at
  before update on public.tire_movements
  for each row
  execute function public.set_updated_at();

alter table public.tire_movements enable row level security;

comment on table public.tire_movements is 'Tire installation, removal and position change history';

-- ---------------------------------------------------------------------------
-- tire_inspections
-- ---------------------------------------------------------------------------

create table public.tire_inspections (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  tire_id               uuid not null references public.tires (id) on delete cascade,
  tread_depth_mm        numeric(6, 2),
  pressure_psi          numeric(6, 2),
  wear_level            public.tire_wear_level,
  inspected_at          timestamptz not null default timezone('utc', now()),
  responsible           text,
  notes                 text,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint tire_inspections_tread_non_negative check (tread_depth_mm is null or tread_depth_mm >= 0),
  constraint tire_inspections_pressure_non_negative check (pressure_psi is null or pressure_psi >= 0)
);

create index idx_tire_inspections_tire_active
  on public.tire_inspections (tire_id, inspected_at desc)
  where deleted_at is null;

create index idx_tire_inspections_company_tire
  on public.tire_inspections (company_id, tire_id)
  where deleted_at is null;

create trigger tire_inspections_set_updated_at
  before update on public.tire_inspections
  for each row
  execute function public.set_updated_at();

alter table public.tire_inspections enable row level security;

comment on table public.tire_inspections is 'Tire tread, pressure and wear inspections';

-- ---------------------------------------------------------------------------
-- tire_recaps
-- ---------------------------------------------------------------------------

create table public.tire_recaps (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  tire_id               uuid not null references public.tires (id) on delete cascade,
  supplier              text,
  recap_number          text,
  amount                numeric(14, 2),
  odometer_km           numeric(12, 2),
  recapped_at           timestamptz not null default timezone('utc', now()),
  warranty              text,
  notes                 text,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint tire_recaps_amount_non_negative check (amount is null or amount >= 0),
  constraint tire_recaps_odometer_non_negative check (odometer_km is null or odometer_km >= 0)
);

create index idx_tire_recaps_tire_active
  on public.tire_recaps (tire_id, recapped_at desc)
  where deleted_at is null;

create index idx_tire_recaps_company_tire
  on public.tire_recaps (company_id, tire_id)
  where deleted_at is null;

create trigger tire_recaps_set_updated_at
  before update on public.tire_recaps
  for each row
  execute function public.set_updated_at();

alter table public.tire_recaps enable row level security;

comment on table public.tire_recaps is 'Tire recap/retread records';

-- ---------------------------------------------------------------------------
-- tire_documents
-- ---------------------------------------------------------------------------

create table public.tire_documents (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  tire_id               uuid not null references public.tires (id) on delete cascade,
  name                  text not null,
  file_url              text not null,
  storage_path          text,
  document_type         public.tire_document_type not null default 'other',
  mime_type             text,
  file_size             integer,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint tire_documents_name_not_empty check (length(trim(name)) > 0),
  constraint tire_documents_file_url_not_empty check (length(trim(file_url)) > 0)
);

create index idx_tire_documents_tire_active
  on public.tire_documents (tire_id)
  where deleted_at is null;

create index idx_tire_documents_company_tire
  on public.tire_documents (company_id, tire_id)
  where deleted_at is null;

create trigger tire_documents_set_updated_at
  before update on public.tire_documents
  for each row
  execute function public.set_updated_at();

alter table public.tire_documents enable row level security;

comment on table public.tire_documents is 'Documents attached to tires';

-- ---------------------------------------------------------------------------
-- Refresh computed tire metrics
-- ---------------------------------------------------------------------------

create or replace function public.refresh_tire_metrics(p_tire_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recap_count integer;
  v_total_recap_cost numeric;
  v_purchase_value numeric;
  v_accumulated_km numeric;
  v_expected_life_km numeric;
  v_remaining_life_km numeric;
  v_cost_per_km numeric;
  v_last_tread numeric;
begin
  select count(*)::int, coalesce(sum(amount), 0)
  into v_recap_count, v_total_recap_cost
  from public.tire_recaps
  where tire_id = p_tire_id and deleted_at is null;

  select purchase_value, accumulated_km, expected_life_km
  into v_purchase_value, v_accumulated_km, v_expected_life_km
  from public.tires
  where id = p_tire_id;

  if v_expected_life_km is not null then
    v_remaining_life_km := greatest(v_expected_life_km - coalesce(v_accumulated_km, 0), 0);
  else
    v_remaining_life_km := null;
  end if;

  if coalesce(v_accumulated_km, 0) > 0 then
    v_cost_per_km := round(
      (coalesce(v_purchase_value, 0) + coalesce(v_total_recap_cost, 0)) / v_accumulated_km,
      4
    );
  else
    v_cost_per_km := null;
  end if;

  select tread_depth_mm
  into v_last_tread
  from public.tire_inspections
  where tire_id = p_tire_id and deleted_at is null
  order by inspected_at desc
  limit 1;

  update public.tires
  set
    recap_count = v_recap_count,
    total_recap_cost = v_total_recap_cost,
    remaining_life_km = v_remaining_life_km,
    cost_per_km = v_cost_per_km,
    last_tread_depth_mm = v_last_tread,
    tire_status = case
      when v_recap_count > 0 and tire_status = 'in_stock' then 'in_retread'::public.tire_status
      else tire_status
    end
  where id = p_tire_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- History triggers — tires
-- ---------------------------------------------------------------------------

create or replace function public.log_tire_history()
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
    insert into public.tire_history (
      company_id, branch_id, vehicle_id, maintenance_record_id,
      tire_id, action, changes, created_by
    )
    values (
      new.company_id, new.branch_id, new.vehicle_id, new.maintenance_record_id,
      new.id, 'create',
      jsonb_build_object(
        'asset_number', new.asset_number,
        'internal_code', new.internal_code,
        'brand', new.brand,
        'tire_status', new.tire_status
      ),
      new.created_by
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_actor := new.updated_by;

    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.tire_history (
        company_id, branch_id, vehicle_id, maintenance_record_id,
        tire_id, action, changes, created_by
      )
      values (
        new.company_id, new.branch_id, new.vehicle_id, new.maintenance_record_id,
        new.id, 'delete',
        jsonb_build_object('deleted_at', new.deleted_at),
        v_actor
      );
      return new;
    end if;

    if old.tire_status is distinct from new.tire_status then
      v_changes := v_changes || jsonb_build_object(
        'tire_status', jsonb_build_object('from', old.tire_status, 'to', new.tire_status)
      );
    end if;

    if old.vehicle_id is distinct from new.vehicle_id then
      v_action := 'vehicle_change';
      v_changes := v_changes || jsonb_build_object(
        'vehicle_id', jsonb_build_object('from', old.vehicle_id, 'to', new.vehicle_id)
      );
    end if;

    if old.current_position is distinct from new.current_position then
      if v_action = 'update' then v_action := 'position_change'; end if;
      v_changes := v_changes || jsonb_build_object(
        'current_position', jsonb_build_object('from', old.current_position, 'to', new.current_position)
      );
    end if;

    if v_changes <> '{}'::jsonb then
      insert into public.tire_history (
        company_id, branch_id, vehicle_id, maintenance_record_id,
        tire_id, action, changes, created_by
      )
      values (
        new.company_id, new.branch_id, new.vehicle_id, new.maintenance_record_id,
        new.id, v_action, v_changes, v_actor
      );
    end if;

    return new;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger tires_log_history
  after insert or update on public.tires
  for each row
  execute function public.log_tire_history();

-- ---------------------------------------------------------------------------
-- History triggers — movements
-- ---------------------------------------------------------------------------

create or replace function public.log_tire_movement_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_tire public.tires%rowtype;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  select * into v_tire from public.tires where id = new.tire_id;

  v_action := case new.movement_type
    when 'install' then 'install'
    when 'remove' then 'remove'
    when 'position_change' then 'position_change'
    when 'rotation' then 'rotation'
    else 'movement'
  end;

  insert into public.tire_history (
    company_id, branch_id, vehicle_id, maintenance_record_id,
    tire_id, action, changes, created_by
  )
  values (
    new.company_id, new.branch_id, new.vehicle_id, new.maintenance_record_id,
    new.tire_id, v_action,
    jsonb_build_object(
      'movement_type', new.movement_type,
      'position', new.position,
      'vehicle_id', new.vehicle_id,
      'installed_at', new.installed_at,
      'removed_at', new.removed_at,
      'reason', new.reason,
      'responsible', new.responsible
    ),
    coalesce(new.created_by, new.updated_by)
  );

  if new.movement_type = 'install' and new.deleted_at is null then
    update public.tires
    set
      vehicle_id = new.vehicle_id,
      current_position = new.position,
      tire_status = 'installed',
      branch_id = coalesce(new.branch_id, v_tire.branch_id),
      maintenance_record_id = coalesce(new.maintenance_record_id, v_tire.maintenance_record_id),
      updated_by = new.created_by
    where id = new.tire_id;
  elsif new.movement_type = 'remove' and new.deleted_at is null then
    update public.tires
    set
      vehicle_id = null,
      current_position = null,
      tire_status = 'in_stock',
      updated_by = new.created_by
    where id = new.tire_id;
  elsif new.movement_type in ('position_change', 'rotation') and new.deleted_at is null then
    update public.tires
    set
      vehicle_id = coalesce(new.vehicle_id, v_tire.vehicle_id),
      current_position = new.position,
      updated_by = new.created_by
    where id = new.tire_id;
  end if;

  return new;
end;
$$;

create trigger tire_movements_log_history
  after insert or update on public.tire_movements
  for each row
  execute function public.log_tire_movement_history();

-- ---------------------------------------------------------------------------
-- History triggers — inspections, recaps, documents
-- ---------------------------------------------------------------------------

create or replace function public.log_tire_inspection_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.tire_history (
      company_id, branch_id, vehicle_id, maintenance_record_id,
      tire_id, action, changes, created_by
    )
    values (
      new.company_id, new.branch_id, new.vehicle_id, new.maintenance_record_id,
      new.tire_id, 'inspection',
      jsonb_build_object(
        'tread_depth_mm', new.tread_depth_mm,
        'pressure_psi', new.pressure_psi,
        'wear_level', new.wear_level,
        'inspected_at', new.inspected_at
      ),
      new.created_by
    );
    perform public.refresh_tire_metrics(new.tire_id);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger tire_inspections_log_history
  after insert on public.tire_inspections
  for each row
  execute function public.log_tire_inspection_history();

create or replace function public.log_tire_recap_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.tire_history (
      company_id, branch_id, vehicle_id, maintenance_record_id,
      tire_id, action, changes, created_by
    )
    values (
      new.company_id, new.branch_id, new.vehicle_id, new.maintenance_record_id,
      new.tire_id, 'recap',
      jsonb_build_object(
        'supplier', new.supplier,
        'recap_number', new.recap_number,
        'amount', new.amount,
        'recapped_at', new.recapped_at
      ),
      new.created_by
    );
    perform public.refresh_tire_metrics(new.tire_id);
    update public.tires
    set tire_status = 'in_retread', updated_by = new.created_by
    where id = new.tire_id and tire_status not in ('discarded', 'installed');
  end if;
  return coalesce(new, old);
end;
$$;

create trigger tire_recaps_log_history
  after insert on public.tire_recaps
  for each row
  execute function public.log_tire_recap_history();

create or replace function public.log_tire_document_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.tire_history (
      company_id, branch_id, vehicle_id, maintenance_record_id,
      tire_id, action, changes, created_by
    )
    values (
      new.company_id, new.branch_id, new.vehicle_id, new.maintenance_record_id,
      new.tire_id, 'document_upload',
      jsonb_build_object(
        'name', new.name,
        'document_type', new.document_type,
        'file_url', new.file_url
      ),
      new.created_by
    );
  end if;
  return coalesce(new, old);
end;
$$;

create trigger tire_documents_log_history
  after insert on public.tire_documents
  for each row
  execute function public.log_tire_document_history();

-- Refresh metrics when recap deleted or tire km updated
create or replace function public.tire_recaps_refresh_metrics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE', 'DELETE') then
    perform public.refresh_tire_metrics(coalesce(new.tire_id, old.tire_id));
  end if;
  return coalesce(new, old);
end;
$$;

create trigger tire_recaps_refresh_metrics_trigger
  after insert or update or delete on public.tire_recaps
  for each row
  execute function public.tire_recaps_refresh_metrics();

create or replace function public.tires_refresh_metrics_on_km()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.accumulated_km is distinct from new.accumulated_km
     or old.purchase_value is distinct from new.purchase_value
     or old.expected_life_km is distinct from new.expected_life_km then
    perform public.refresh_tire_metrics(new.id);
  end if;
  return new;
end;
$$;

create trigger tires_refresh_metrics_on_km
  after update on public.tires
  for each row
  execute function public.tires_refresh_metrics_on_km();

-- ---------------------------------------------------------------------------
-- Aggregated tire stats (RLS enforced via security invoker)
-- ---------------------------------------------------------------------------

create or replace function public.get_tire_stats(p_company_id uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      t.id,
      t.vehicle_id,
      t.tire_status,
      t.accumulated_km,
      t.cost_per_km,
      t.remaining_life_km,
      t.last_tread_depth_mm,
      t.recap_count,
      v.plate as vehicle_plate
    from public.tires t
    left join public.vehicles v
      on v.id = t.vehicle_id and v.deleted_at is null
    where t.company_id = p_company_id
      and t.deleted_at is null
  ),
  replacement_due as (
    select count(*)::int as cnt
    from base
    where tire_status = 'installed'
      and (
        (remaining_life_km is not null and remaining_life_km <= 5000)
        or (last_tread_depth_mm is not null and last_tread_depth_mm <= 2)
      )
  ),
  top_vehicles as (
    select
      vehicle_id,
      max(vehicle_plate) as vehicle_plate,
      round(avg(coalesce(last_tread_depth_mm, 0))::numeric, 2) as avg_tread_mm,
      count(*)::int as tire_count
    from base
    where vehicle_id is not null and tire_status = 'installed'
    group by vehicle_id
    order by avg(coalesce(last_tread_depth_mm, 999)) asc
    limit 5
  )
  select json_build_object(
    'total', (select count(*)::int from base),
    'installed', (select count(*)::int from base where tire_status = 'installed'),
    'in_stock', (select count(*)::int from base where tire_status = 'in_stock'),
    'discarded', (select count(*)::int from base where tire_status = 'discarded'),
    'in_retread', (select count(*)::int from base where tire_status = 'in_retread' or recap_count > 0),
    'average_km', coalesce((
      select round(avg(accumulated_km)::numeric, 2)
      from base
      where accumulated_km > 0
    ), 0),
    'average_cost_per_km', coalesce((
      select round(avg(cost_per_km)::numeric, 4)
      from base
      where cost_per_km is not null and cost_per_km > 0
    ), 0),
    'replacement_due', (select cnt from replacement_due),
    'top_vehicles_by_wear', coalesce((
      select json_agg(
        json_build_object(
          'vehicle_id', vehicle_id,
          'vehicle_plate', vehicle_plate,
          'avg_tread_mm', avg_tread_mm,
          'tire_count', tire_count
        )
        order by avg_tread_mm asc
      ) from top_vehicles
    ), '[]'::json)
  );
$$;

comment on function public.get_tire_stats(uuid) is
  'Aggregated tire statistics for dashboard KPIs';

grant select, insert, update, delete on public.tires to authenticated;
grant select, insert on public.tire_history to authenticated;
grant select, insert, update, delete on public.tire_movements to authenticated;
grant select, insert, update, delete on public.tire_inspections to authenticated;
grant select, insert, update, delete on public.tire_recaps to authenticated;
grant select, insert, update, delete on public.tire_documents to authenticated;
grant execute on function public.get_tire_stats(uuid) to authenticated;
