-- FleetControl Sprint 21 — maintenance records, history, documents, parts, services, schedules

-- ---------------------------------------------------------------------------
-- maintenance_records — core operational entity
-- ---------------------------------------------------------------------------

create table public.maintenance_records (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid not null references public.vehicles (id) on delete restrict,
  driver_id             uuid references public.drivers (id) on delete set null,
  trip_id               uuid references public.trips (id) on delete set null,
  maintenance_type      public.maintenance_type not null,
  priority              public.maintenance_priority not null default 'medium',
  maintenance_status    public.maintenance_status not null default 'open',
  supplier              text,
  workshop              text,
  opened_at             timestamptz not null default timezone('utc', now()),
  completed_at          timestamptz,
  odometer_km           numeric(12, 2),
  hour_meter            numeric(12, 2),
  downtime_hours        numeric(10, 2),
  description           text,
  diagnosis             text,
  solution              text,
  notes                 text,
  estimated_amount      numeric(14, 2),
  final_amount          numeric(14, 2),
  parts_total           numeric(14, 2) not null default 0,
  services_total        numeric(14, 2) not null default 0,
  total_cost            numeric(14, 2) not null default 0,
  cost_per_km           numeric(12, 4),
  responsible           text,
  metadata              jsonb not null default '{}'::jsonb,
  status                public.entity_status not null default 'active',
  external_id           text,
  integration_source    text,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint maintenance_records_odometer_non_negative check (odometer_km is null or odometer_km >= 0),
  constraint maintenance_records_hour_meter_non_negative check (hour_meter is null or hour_meter >= 0),
  constraint maintenance_records_downtime_non_negative check (downtime_hours is null or downtime_hours >= 0),
  constraint maintenance_records_estimated_non_negative check (estimated_amount is null or estimated_amount >= 0),
  constraint maintenance_records_final_non_negative check (final_amount is null or final_amount >= 0),
  constraint maintenance_records_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index idx_maintenance_records_company_id_active
  on public.maintenance_records (company_id)
  where deleted_at is null;

create index idx_maintenance_records_company_branch_active
  on public.maintenance_records (company_id, branch_id)
  where deleted_at is null;

create index idx_maintenance_records_company_vehicle_active
  on public.maintenance_records (company_id, vehicle_id, opened_at desc)
  where deleted_at is null;

create index idx_maintenance_records_company_driver_active
  on public.maintenance_records (company_id, driver_id, opened_at desc)
  where deleted_at is null and driver_id is not null;

create index idx_maintenance_records_company_trip_active
  on public.maintenance_records (company_id, trip_id)
  where deleted_at is null and trip_id is not null;

create index idx_maintenance_records_company_opened_at
  on public.maintenance_records (company_id, opened_at desc)
  where deleted_at is null;

create index idx_maintenance_records_company_type
  on public.maintenance_records (company_id, maintenance_type)
  where deleted_at is null;

create index idx_maintenance_records_company_status
  on public.maintenance_records (company_id, maintenance_status)
  where deleted_at is null;

create index idx_maintenance_records_company_supplier
  on public.maintenance_records (company_id, supplier)
  where deleted_at is null and supplier is not null;

create index idx_maintenance_records_company_external_id
  on public.maintenance_records (company_id, integration_source, external_id)
  where deleted_at is null and external_id is not null;

create trigger maintenance_records_set_updated_at
  before update on public.maintenance_records
  for each row
  execute function public.set_updated_at();

alter table public.maintenance_records enable row level security;

comment on table public.maintenance_records is 'Fleet maintenance records';

-- ---------------------------------------------------------------------------
-- maintenance_history — audit trail
-- ---------------------------------------------------------------------------

create table public.maintenance_history (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  driver_id             uuid references public.drivers (id) on delete set null,
  trip_id               uuid references public.trips (id) on delete set null,
  maintenance_record_id uuid not null references public.maintenance_records (id) on delete cascade,
  action                text not null,
  changes               jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint maintenance_history_action_not_empty check (length(trim(action)) > 0),
  constraint maintenance_history_changes_is_object check (jsonb_typeof(changes) = 'object')
);

create index idx_maintenance_history_record_created
  on public.maintenance_history (maintenance_record_id, created_at desc);

create index idx_maintenance_history_company_record
  on public.maintenance_history (company_id, maintenance_record_id);

create index idx_maintenance_history_company_vehicle
  on public.maintenance_history (company_id, vehicle_id)
  where vehicle_id is not null;

create trigger maintenance_history_set_updated_at
  before update on public.maintenance_history
  for each row
  execute function public.set_updated_at();

alter table public.maintenance_history enable row level security;

comment on table public.maintenance_history is 'Change history for maintenance records';

-- ---------------------------------------------------------------------------
-- maintenance_documents
-- ---------------------------------------------------------------------------

create table public.maintenance_documents (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  driver_id             uuid references public.drivers (id) on delete set null,
  trip_id               uuid references public.trips (id) on delete set null,
  maintenance_record_id uuid not null references public.maintenance_records (id) on delete cascade,
  name                  text not null,
  file_url              text not null,
  storage_path          text,
  document_type         public.maintenance_document_type not null default 'other',
  mime_type             text,
  file_size             integer,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint maintenance_documents_name_not_empty check (length(trim(name)) > 0),
  constraint maintenance_documents_file_url_not_empty check (length(trim(file_url)) > 0)
);

create index idx_maintenance_documents_record_active
  on public.maintenance_documents (maintenance_record_id)
  where deleted_at is null;

create index idx_maintenance_documents_company_record
  on public.maintenance_documents (company_id, maintenance_record_id)
  where deleted_at is null;

create trigger maintenance_documents_set_updated_at
  before update on public.maintenance_documents
  for each row
  execute function public.set_updated_at();

alter table public.maintenance_documents enable row level security;

comment on table public.maintenance_documents is 'Documents attached to maintenance records';

-- ---------------------------------------------------------------------------
-- maintenance_parts
-- ---------------------------------------------------------------------------

create table public.maintenance_parts (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  driver_id             uuid references public.drivers (id) on delete set null,
  trip_id               uuid references public.trips (id) on delete set null,
  maintenance_record_id uuid not null references public.maintenance_records (id) on delete cascade,
  name                  text not null,
  code                  text,
  quantity              numeric(12, 3) not null default 1,
  unit_price            numeric(14, 2) not null default 0,
  total_price           numeric(14, 2) not null default 0,
  supplier              text,
  warranty_until        date,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint maintenance_parts_name_not_empty check (length(trim(name)) > 0),
  constraint maintenance_parts_quantity_positive check (quantity > 0),
  constraint maintenance_parts_unit_price_non_negative check (unit_price >= 0),
  constraint maintenance_parts_total_price_non_negative check (total_price >= 0)
);

create index idx_maintenance_parts_record_active
  on public.maintenance_parts (maintenance_record_id)
  where deleted_at is null;

create index idx_maintenance_parts_company_record
  on public.maintenance_parts (company_id, maintenance_record_id)
  where deleted_at is null;

create trigger maintenance_parts_set_updated_at
  before update on public.maintenance_parts
  for each row
  execute function public.set_updated_at();

alter table public.maintenance_parts enable row level security;

comment on table public.maintenance_parts is 'Parts used in maintenance records';

-- ---------------------------------------------------------------------------
-- maintenance_services
-- ---------------------------------------------------------------------------

create table public.maintenance_services (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  driver_id             uuid references public.drivers (id) on delete set null,
  trip_id               uuid references public.trips (id) on delete set null,
  maintenance_record_id uuid not null references public.maintenance_records (id) on delete cascade,
  description           text not null,
  hours                 numeric(10, 2),
  amount                numeric(14, 2) not null default 0,
  responsible           text,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint maintenance_services_description_not_empty check (length(trim(description)) > 0),
  constraint maintenance_services_hours_non_negative check (hours is null or hours >= 0),
  constraint maintenance_services_amount_non_negative check (amount >= 0)
);

create index idx_maintenance_services_record_active
  on public.maintenance_services (maintenance_record_id)
  where deleted_at is null;

create index idx_maintenance_services_company_record
  on public.maintenance_services (company_id, maintenance_record_id)
  where deleted_at is null;

create trigger maintenance_services_set_updated_at
  before update on public.maintenance_services
  for each row
  execute function public.set_updated_at();

alter table public.maintenance_services enable row level security;

comment on table public.maintenance_services is 'Services performed in maintenance records';

-- ---------------------------------------------------------------------------
-- maintenance_schedules — preventive scheduling and alerts
-- ---------------------------------------------------------------------------

create table public.maintenance_schedules (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  vehicle_id            uuid not null references public.vehicles (id) on delete restrict,
  driver_id             uuid references public.drivers (id) on delete set null,
  trip_id               uuid references public.trips (id) on delete set null,
  schedule_type         public.maintenance_schedule_type not null,
  alert_type            public.maintenance_alert_type not null,
  alert_km              numeric(12, 2),
  alert_date            date,
  alert_hour_meter      numeric(12, 2),
  last_done_at          timestamptz,
  next_due_at           timestamptz,
  last_odometer_km      numeric(12, 2),
  last_hour_meter       numeric(12, 2),
  is_active             boolean not null default true,
  notes                 text,
  metadata              jsonb not null default '{}'::jsonb,
  status                public.entity_status not null default 'active',
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint maintenance_schedules_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index idx_maintenance_schedules_company_vehicle_active
  on public.maintenance_schedules (company_id, vehicle_id)
  where deleted_at is null;

create index idx_maintenance_schedules_company_next_due
  on public.maintenance_schedules (company_id, next_due_at)
  where deleted_at is null and is_active = true;

create trigger maintenance_schedules_set_updated_at
  before update on public.maintenance_schedules
  for each row
  execute function public.set_updated_at();

alter table public.maintenance_schedules enable row level security;

comment on table public.maintenance_schedules is 'Preventive maintenance schedules and alerts';

-- ---------------------------------------------------------------------------
-- Recalculate costs on parts/services changes
-- ---------------------------------------------------------------------------

create or replace function public.recalculate_maintenance_costs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
  v_parts_total numeric(14, 2);
  v_services_total numeric(14, 2);
  v_total_cost numeric(14, 2);
  v_odometer_km numeric(12, 2);
  v_cost_per_km numeric(12, 4);
begin
  v_record_id := coalesce(new.maintenance_record_id, old.maintenance_record_id);

  select coalesce(sum(total_price), 0)
  into v_parts_total
  from public.maintenance_parts
  where maintenance_record_id = v_record_id
    and deleted_at is null;

  select coalesce(sum(amount), 0)
  into v_services_total
  from public.maintenance_services
  where maintenance_record_id = v_record_id
    and deleted_at is null;

  v_total_cost := v_parts_total + v_services_total;

  select odometer_km into v_odometer_km
  from public.maintenance_records
  where id = v_record_id;

  if v_odometer_km is not null and v_odometer_km > 0 then
    v_cost_per_km := round(v_total_cost / v_odometer_km, 4);
  else
    v_cost_per_km := null;
  end if;

  update public.maintenance_records
  set
    parts_total = v_parts_total,
    services_total = v_services_total,
    total_cost = v_total_cost,
    cost_per_km = v_cost_per_km,
    final_amount = case when final_amount is null then v_total_cost else final_amount end
  where id = v_record_id;

  return coalesce(new, old);
end;
$$;

create trigger maintenance_parts_recalculate_costs
  after insert or update or delete on public.maintenance_parts
  for each row
  execute function public.recalculate_maintenance_costs();

create trigger maintenance_services_recalculate_costs
  after insert or update or delete on public.maintenance_services
  for each row
  execute function public.recalculate_maintenance_costs();

-- ---------------------------------------------------------------------------
-- History triggers
-- ---------------------------------------------------------------------------

create or replace function public.log_maintenance_history()
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
    insert into public.maintenance_history (
      company_id, branch_id, vehicle_id, driver_id, trip_id,
      maintenance_record_id, action, changes, created_by
    )
    values (
      new.company_id, new.branch_id, new.vehicle_id, new.driver_id, new.trip_id,
      new.id, 'create',
      jsonb_build_object(
        'vehicle_id', new.vehicle_id,
        'maintenance_type', new.maintenance_type,
        'maintenance_status', new.maintenance_status,
        'opened_at', new.opened_at
      ),
      new.created_by
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_actor := new.updated_by;

    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.maintenance_history (
        company_id, branch_id, vehicle_id, driver_id, trip_id,
        maintenance_record_id, action, changes, created_by
      )
      values (
        new.company_id, new.branch_id, new.vehicle_id, new.driver_id, new.trip_id,
        new.id, 'delete',
        jsonb_build_object('deleted_at', new.deleted_at),
        v_actor
      );
      return new;
    end if;

    if old.maintenance_status is distinct from new.maintenance_status then
      v_action := 'status_change';
      v_changes := v_changes || jsonb_build_object(
        'maintenance_status', jsonb_build_object('from', old.maintenance_status, 'to', new.maintenance_status)
      );

      if new.maintenance_status = 'completed' and old.maintenance_status <> 'completed' then
        v_action := 'completion';
      end if;
    end if;

    if old.vehicle_id is distinct from new.vehicle_id then
      v_changes := v_changes || jsonb_build_object(
        'vehicle_id', jsonb_build_object('from', old.vehicle_id, 'to', new.vehicle_id)
      );
    end if;

    if old.maintenance_type is distinct from new.maintenance_type then
      v_changes := v_changes || jsonb_build_object(
        'maintenance_type', jsonb_build_object('from', old.maintenance_type, 'to', new.maintenance_type)
      );
    end if;

    if old.priority is distinct from new.priority then
      v_changes := v_changes || jsonb_build_object(
        'priority', jsonb_build_object('from', old.priority, 'to', new.priority)
      );
    end if;

    if old.final_amount is distinct from new.final_amount
       or old.total_cost is distinct from new.total_cost then
      v_changes := v_changes || jsonb_build_object(
        'total_cost', jsonb_build_object('from', old.total_cost, 'to', new.total_cost)
      );
    end if;

    if v_changes = '{}'::jsonb and v_action = 'update' then
      return new;
    end if;

    insert into public.maintenance_history (
      company_id, branch_id, vehicle_id, driver_id, trip_id,
      maintenance_record_id, action, changes, created_by
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

create trigger maintenance_records_log_history
  after insert or update on public.maintenance_records
  for each row
  execute function public.log_maintenance_history();

create or replace function public.log_maintenance_document_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.maintenance_history (
    company_id, branch_id, vehicle_id, driver_id, trip_id,
    maintenance_record_id, action, changes, created_by
  )
  values (
    new.company_id, new.branch_id, new.vehicle_id, new.driver_id, new.trip_id,
    new.maintenance_record_id, 'document_upload',
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

create trigger maintenance_documents_log_history
  after insert on public.maintenance_documents
  for each row
  execute function public.log_maintenance_document_history();

create or replace function public.log_maintenance_parts_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.maintenance_records%rowtype;
begin
  select * into v_record
  from public.maintenance_records
  where id = coalesce(new.maintenance_record_id, old.maintenance_record_id);

  insert into public.maintenance_history (
    company_id, branch_id, vehicle_id, driver_id, trip_id,
    maintenance_record_id, action, changes, created_by
  )
  values (
    v_record.company_id, v_record.branch_id, v_record.vehicle_id,
    v_record.driver_id, v_record.trip_id,
    v_record.id,
    case tg_op when 'INSERT' then 'parts_add' when 'UPDATE' then 'parts_update' else 'parts_delete' end,
    jsonb_build_object(
      'part_name', coalesce(new.name, old.name),
      'quantity', coalesce(new.quantity, old.quantity),
      'total_price', coalesce(new.total_price, old.total_price)
    ),
    coalesce(new.created_by, new.updated_by, old.updated_by)
  );
  return coalesce(new, old);
end;
$$;

create trigger maintenance_parts_log_history
  after insert or update or delete on public.maintenance_parts
  for each row
  execute function public.log_maintenance_parts_history();

create or replace function public.log_maintenance_services_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.maintenance_records%rowtype;
begin
  select * into v_record
  from public.maintenance_records
  where id = coalesce(new.maintenance_record_id, old.maintenance_record_id);

  insert into public.maintenance_history (
    company_id, branch_id, vehicle_id, driver_id, trip_id,
    maintenance_record_id, action, changes, created_by
  )
  values (
    v_record.company_id, v_record.branch_id, v_record.vehicle_id,
    v_record.driver_id, v_record.trip_id,
    v_record.id,
    case tg_op when 'INSERT' then 'services_add' when 'UPDATE' then 'services_update' else 'services_delete' end,
    jsonb_build_object(
      'description', coalesce(new.description, old.description),
      'amount', coalesce(new.amount, old.amount)
    ),
    coalesce(new.created_by, new.updated_by, old.updated_by)
  );
  return coalesce(new, old);
end;
$$;

create trigger maintenance_services_log_history
  after insert or update or delete on public.maintenance_services
  for each row
  execute function public.log_maintenance_services_history();

-- ---------------------------------------------------------------------------
-- Aggregated maintenance stats (RLS enforced via security invoker)
-- ---------------------------------------------------------------------------

create or replace function public.get_maintenance_stats(p_company_id uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      mr.id,
      mr.vehicle_id,
      mr.maintenance_type,
      mr.maintenance_status,
      mr.total_cost,
      mr.downtime_hours,
      mr.supplier,
      mr.opened_at,
      mr.completed_at,
      v.plate as vehicle_plate
    from public.maintenance_records mr
    left join public.vehicles v
      on v.id = mr.vehicle_id and v.deleted_at is null
    where mr.company_id = p_company_id
      and mr.deleted_at is null
  ),
  top_vehicles as (
    select
      vehicle_id,
      max(vehicle_plate) as vehicle_plate,
      round(sum(total_cost)::numeric, 2) as total_cost
    from base
    group by vehicle_id
    order by sum(total_cost) desc
    limit 5
  ),
  top_suppliers as (
    select
      supplier,
      count(*)::int as maintenance_count,
      round(sum(total_cost)::numeric, 2) as total_cost
    from base
    where supplier is not null and length(trim(supplier)) > 0
    group by supplier
    order by sum(total_cost) desc
    limit 5
  ),
  overdue_schedules as (
    select count(*)::int as cnt
    from public.maintenance_schedules ms
    where ms.company_id = p_company_id
      and ms.deleted_at is null
      and ms.is_active = true
      and ms.next_due_at is not null
      and ms.next_due_at < timezone('utc', now())
  ),
  unavailable_vehicles as (
    select count(distinct vehicle_id)::int as cnt
    from base
    where maintenance_status in ('open', 'in_progress', 'waiting_parts')
  )
  select json_build_object(
    'total', (select count(*)::int from base),
    'preventive', (select count(*)::int from base where maintenance_type = 'preventive'),
    'corrective', (select count(*)::int from base where maintenance_type = 'corrective'),
    'emergency', (select count(*)::int from base where maintenance_type = 'emergency'),
    'total_cost', coalesce((select round(sum(total_cost)::numeric, 2) from base), 0),
    'average_downtime_hours', coalesce((
      select round(avg(downtime_hours)::numeric, 2)
      from base
      where downtime_hours is not null and downtime_hours > 0
    ), 0),
    'unavailable_vehicles', (select cnt from unavailable_vehicles),
    'overdue_schedules', (select cnt from overdue_schedules),
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
    'top_suppliers', coalesce((
      select json_agg(
        json_build_object(
          'supplier', supplier,
          'maintenance_count', maintenance_count,
          'total_cost', total_cost
        )
        order by total_cost desc
      ) from top_suppliers
    ), '[]'::json)
  );
$$;

comment on function public.get_maintenance_stats(uuid) is
  'Aggregated maintenance statistics for dashboard KPIs';

grant select, insert, update, delete on public.maintenance_records to authenticated;
grant select, insert on public.maintenance_history to authenticated;
grant select, insert, update, delete on public.maintenance_documents to authenticated;
grant select, insert, update, delete on public.maintenance_parts to authenticated;
grant select, insert, update, delete on public.maintenance_services to authenticated;
grant select, insert, update, delete on public.maintenance_schedules to authenticated;
grant execute on function public.get_maintenance_stats(uuid) to authenticated;
