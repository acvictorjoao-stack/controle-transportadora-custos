-- FleetControl Sprint 25.1 — routes, history and documents

create table public.routes (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies (id) on delete restrict,
  name                 text not null,
  code                 text,
  origin               text not null,
  destination          text not null,
  route_type           public.route_type not null default 'delivery',
  planned_distance_km  numeric(10, 2),
  lead_time_minutes    integer,
  unload_time_minutes  integer,
  notes                text,
  operational_status   public.route_operational_status not null default 'active',
  metadata             jsonb not null default '{}'::jsonb,
  status               public.entity_status not null default 'active',
  external_id          text,
  integration_source   text,
  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now()),
  deleted_at           timestamptz,
  created_by           uuid references public.profiles (id) on delete set null,
  updated_by           uuid references public.profiles (id) on delete set null,

  constraint routes_name_not_empty check (length(trim(name)) > 0),
  constraint routes_origin_not_empty check (length(trim(origin)) > 0),
  constraint routes_destination_not_empty check (length(trim(destination)) > 0),
  constraint routes_planned_distance_non_negative
    check (planned_distance_km is null or planned_distance_km >= 0),
  constraint routes_lead_time_non_negative
    check (lead_time_minutes is null or lead_time_minutes >= 0),
  constraint routes_unload_time_non_negative
    check (unload_time_minutes is null or unload_time_minutes >= 0),
  constraint routes_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create unique index idx_routes_company_code_active
  on public.routes (company_id, upper(trim(code)))
  where deleted_at is null and code is not null and length(trim(code)) > 0;

create index idx_routes_company_id_active
  on public.routes (company_id)
  where deleted_at is null;

create index idx_routes_company_operational_status
  on public.routes (company_id, operational_status)
  where deleted_at is null;

create index idx_routes_company_route_type
  on public.routes (company_id, route_type)
  where deleted_at is null;

create index idx_routes_company_origin
  on public.routes (company_id, origin)
  where deleted_at is null;

create index idx_routes_company_destination
  on public.routes (company_id, destination)
  where deleted_at is null;

create index idx_routes_company_created_at
  on public.routes (company_id, created_at desc)
  where deleted_at is null;

create index idx_routes_company_external_id
  on public.routes (company_id, integration_source, external_id)
  where deleted_at is null and external_id is not null;

create trigger routes_set_updated_at
  before update on public.routes
  for each row
  execute function public.set_updated_at();

alter table public.routes enable row level security;

comment on table public.routes is 'Operational routes belonging to a transport company';

-- ---------------------------------------------------------------------------
-- route_history — audit trail for all route changes
-- ---------------------------------------------------------------------------

create table public.route_history (
  id                          uuid primary key default gen_random_uuid(),
  company_id                  uuid not null references public.companies (id) on delete restrict,
  route_id                    uuid not null references public.routes (id) on delete cascade,
  action                      text not null,
  changes                     jsonb not null default '{}'::jsonb,
  previous_operational_status public.route_operational_status,
  new_operational_status      public.route_operational_status,
  created_at                  timestamptz not null default timezone('utc', now()),
  created_by                  uuid references public.profiles (id) on delete set null,

  constraint route_history_action_not_empty check (length(trim(action)) > 0),
  constraint route_history_changes_is_object check (jsonb_typeof(changes) = 'object')
);

create index idx_route_history_route_created
  on public.route_history (route_id, created_at desc);

create index idx_route_history_company_route
  on public.route_history (company_id, route_id);

alter table public.route_history enable row level security;

comment on table public.route_history is 'Change history for operational routes';

-- ---------------------------------------------------------------------------
-- route_documents — uploaded files (maps, attachments) — upload UI later
-- ---------------------------------------------------------------------------

create table public.route_documents (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete restrict,
  route_id       uuid not null references public.routes (id) on delete cascade,
  name           text not null,
  file_url       text not null,
  storage_path   text,
  document_type  public.route_document_type not null default 'document',
  mime_type      text,
  file_size      integer,
  created_at     timestamptz not null default timezone('utc', now()),
  deleted_at     timestamptz,
  created_by     uuid references public.profiles (id) on delete set null,

  constraint route_documents_name_not_empty check (length(trim(name)) > 0),
  constraint route_documents_file_url_not_empty check (length(trim(file_url)) > 0)
);

create index idx_route_documents_route_active
  on public.route_documents (route_id)
  where deleted_at is null;

create index idx_route_documents_company_route
  on public.route_documents (company_id, route_id)
  where deleted_at is null;

alter table public.route_documents enable row level security;

comment on table public.route_documents is 'Documents and files attached to routes';

-- ---------------------------------------------------------------------------
-- Trigger: log route changes to route_history
-- ---------------------------------------------------------------------------

create or replace function public.log_route_history()
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
    insert into public.route_history (
      company_id,
      route_id,
      action,
      changes,
      new_operational_status,
      created_by
    )
    values (
      new.company_id,
      new.id,
      'create',
      jsonb_build_object(
        'name', new.name,
        'code', new.code,
        'origin', new.origin,
        'destination', new.destination,
        'route_type', new.route_type,
        'operational_status', new.operational_status
      ),
      new.operational_status,
      new.created_by
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_actor := new.updated_by;

    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.route_history (
        company_id,
        route_id,
        action,
        changes,
        previous_operational_status,
        new_operational_status,
        created_by
      )
      values (
        new.company_id,
        new.id,
        'delete',
        jsonb_build_object('deleted_at', new.deleted_at),
        old.operational_status,
        new.operational_status,
        v_actor
      );
      return new;
    end if;

    if old.operational_status is distinct from new.operational_status then
      v_action := 'status_change';
    end if;

    if old.name is distinct from new.name then
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('from', old.name, 'to', new.name));
    end if;
    if old.code is distinct from new.code then
      v_changes := v_changes || jsonb_build_object('code', jsonb_build_object('from', old.code, 'to', new.code));
    end if;
    if old.origin is distinct from new.origin then
      v_changes := v_changes || jsonb_build_object('origin', jsonb_build_object('from', old.origin, 'to', new.origin));
    end if;
    if old.destination is distinct from new.destination then
      v_changes := v_changes || jsonb_build_object('destination', jsonb_build_object('from', old.destination, 'to', new.destination));
    end if;
    if old.route_type is distinct from new.route_type then
      v_changes := v_changes || jsonb_build_object('route_type', jsonb_build_object('from', old.route_type, 'to', new.route_type));
    end if;
    if old.planned_distance_km is distinct from new.planned_distance_km then
      v_changes := v_changes || jsonb_build_object('planned_distance_km', jsonb_build_object('from', old.planned_distance_km, 'to', new.planned_distance_km));
    end if;
    if old.lead_time_minutes is distinct from new.lead_time_minutes then
      v_changes := v_changes || jsonb_build_object('lead_time_minutes', jsonb_build_object('from', old.lead_time_minutes, 'to', new.lead_time_minutes));
    end if;
    if old.unload_time_minutes is distinct from new.unload_time_minutes then
      v_changes := v_changes || jsonb_build_object('unload_time_minutes', jsonb_build_object('from', old.unload_time_minutes, 'to', new.unload_time_minutes));
    end if;
    if old.operational_status is distinct from new.operational_status then
      v_changes := v_changes || jsonb_build_object('operational_status', jsonb_build_object('from', old.operational_status, 'to', new.operational_status));
    end if;
    if old.notes is distinct from new.notes then
      v_changes := v_changes || jsonb_build_object('notes', jsonb_build_object('from', old.notes, 'to', new.notes));
    end if;

    if v_changes = '{}'::jsonb and v_action = 'update' then
      return new;
    end if;

    insert into public.route_history (
      company_id,
      route_id,
      action,
      changes,
      previous_operational_status,
      new_operational_status,
      created_by
    )
    values (
      new.company_id,
      new.id,
      v_action,
      v_changes,
      old.operational_status,
      new.operational_status,
      v_actor
    );
    return new;
  end if;

  return new;
end;
$$;

create trigger routes_log_history
  after insert or update on public.routes
  for each row
  execute function public.log_route_history();

-- ---------------------------------------------------------------------------
-- Trigger: log document uploads to route_history
-- ---------------------------------------------------------------------------

create or replace function public.log_route_document_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.route_history (
    company_id,
    route_id,
    action,
    changes,
    created_by
  )
  values (
    new.company_id,
    new.route_id,
    'document_upload',
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

create trigger route_documents_log_history
  after insert on public.route_documents
  for each row
  execute function public.log_route_document_history();

grant select, insert, update, delete on public.routes to authenticated;
grant select, insert on public.route_history to authenticated;
grant select, insert, update, delete on public.route_documents to authenticated;
