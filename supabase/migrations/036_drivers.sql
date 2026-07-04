-- FleetControl Sprint 18 — drivers, history and documents

create table public.drivers (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies (id) on delete restrict,
  branch_id            uuid references public.branches (id) on delete set null,
  name                 text not null,
  cpf                  text not null,
  rg                   text,
  cnh_number           text not null,
  license_category     public.driver_license_category not null,
  license_issued_at    date,
  license_expires_at   date,
  ear                  boolean not null default false,
  birth_date           date,
  phone                text,
  whatsapp             text,
  email                text,
  address              text,
  zip_code             text,
  city                 text,
  state                text,
  notes                text,
  photo_url            text,
  photo_storage_path   text,
  operational_status   public.driver_operational_status not null default 'active',
  hired_at             date,
  terminated_at        date,
  contract_type        public.driver_contract_type,
  emergency_contact    text,
  metadata             jsonb not null default '{}'::jsonb,
  status               public.entity_status not null default 'active',
  external_id          text,
  integration_source   text,
  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now()),
  deleted_at           timestamptz,
  created_by           uuid references public.profiles (id) on delete set null,
  updated_by           uuid references public.profiles (id) on delete set null,

  constraint drivers_name_not_empty check (length(trim(name)) > 0),
  constraint drivers_cpf_not_empty check (length(trim(cpf)) > 0),
  constraint drivers_cnh_not_empty check (length(trim(cnh_number)) > 0),
  constraint drivers_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create unique index idx_drivers_company_cpf_active
  on public.drivers (company_id, cpf)
  where deleted_at is null;

create unique index idx_drivers_company_cnh_active
  on public.drivers (company_id, upper(trim(cnh_number)))
  where deleted_at is null;

create index idx_drivers_company_id_active
  on public.drivers (company_id)
  where deleted_at is null;

create index idx_drivers_company_branch_active
  on public.drivers (company_id, branch_id)
  where deleted_at is null;

create index idx_drivers_company_operational_status
  on public.drivers (company_id, operational_status)
  where deleted_at is null;

create index idx_drivers_company_license_expires
  on public.drivers (company_id, license_expires_at)
  where deleted_at is null and license_expires_at is not null;

create index idx_drivers_company_created_at
  on public.drivers (company_id, created_at desc)
  where deleted_at is null;

create index idx_drivers_company_external_id
  on public.drivers (company_id, integration_source, external_id)
  where deleted_at is null and external_id is not null;

create trigger drivers_set_updated_at
  before update on public.drivers
  for each row
  execute function public.set_updated_at();

alter table public.drivers enable row level security;

comment on table public.drivers is 'Fleet drivers belonging to a transport company';

-- ---------------------------------------------------------------------------
-- driver_history — audit trail for all driver changes
-- ---------------------------------------------------------------------------

create table public.driver_history (
  id                          uuid primary key default gen_random_uuid(),
  company_id                  uuid not null references public.companies (id) on delete restrict,
  driver_id                   uuid not null references public.drivers (id) on delete cascade,
  action                      text not null,
  changes                     jsonb not null default '{}'::jsonb,
  previous_operational_status public.driver_operational_status,
  new_operational_status      public.driver_operational_status,
  created_at                  timestamptz not null default timezone('utc', now()),
  created_by                  uuid references public.profiles (id) on delete set null,

  constraint driver_history_action_not_empty check (length(trim(action)) > 0),
  constraint driver_history_changes_is_object check (jsonb_typeof(changes) = 'object')
);

create index idx_driver_history_driver_created
  on public.driver_history (driver_id, created_at desc);

create index idx_driver_history_company_driver
  on public.driver_history (company_id, driver_id);

alter table public.driver_history enable row level security;

comment on table public.driver_history is 'Change history for fleet drivers';

-- ---------------------------------------------------------------------------
-- driver_documents — uploaded files (CNH, ASO, photos, attachments)
-- ---------------------------------------------------------------------------

create table public.driver_documents (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete restrict,
  driver_id      uuid not null references public.drivers (id) on delete cascade,
  name           text not null,
  file_url       text not null,
  storage_path   text,
  document_type  public.driver_document_type not null default 'document',
  mime_type      text,
  file_size      integer,
  created_at     timestamptz not null default timezone('utc', now()),
  deleted_at     timestamptz,
  created_by     uuid references public.profiles (id) on delete set null,

  constraint driver_documents_name_not_empty check (length(trim(name)) > 0),
  constraint driver_documents_file_url_not_empty check (length(trim(file_url)) > 0)
);

create index idx_driver_documents_driver_active
  on public.driver_documents (driver_id)
  where deleted_at is null;

create index idx_driver_documents_company_driver
  on public.driver_documents (company_id, driver_id)
  where deleted_at is null;

alter table public.driver_documents enable row level security;

comment on table public.driver_documents is 'Documents and files attached to drivers';

-- ---------------------------------------------------------------------------
-- Trigger: log driver changes to driver_history
-- ---------------------------------------------------------------------------

create or replace function public.log_driver_history()
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
    insert into public.driver_history (
      company_id,
      driver_id,
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
        'cpf', new.cpf,
        'cnh_number', new.cnh_number,
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
      insert into public.driver_history (
        company_id,
        driver_id,
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

    if old.branch_id is distinct from new.branch_id then
      if v_action = 'update' then
        v_action := 'branch_change';
      end if;
    end if;

    if old.name is distinct from new.name then
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('from', old.name, 'to', new.name));
    end if;
    if old.cpf is distinct from new.cpf then
      v_changes := v_changes || jsonb_build_object('cpf', jsonb_build_object('from', old.cpf, 'to', new.cpf));
    end if;
    if old.cnh_number is distinct from new.cnh_number then
      v_changes := v_changes || jsonb_build_object('cnh_number', jsonb_build_object('from', old.cnh_number, 'to', new.cnh_number));
    end if;
    if old.license_category is distinct from new.license_category then
      v_changes := v_changes || jsonb_build_object('license_category', jsonb_build_object('from', old.license_category, 'to', new.license_category));
    end if;
    if old.license_expires_at is distinct from new.license_expires_at then
      v_changes := v_changes || jsonb_build_object('license_expires_at', jsonb_build_object('from', old.license_expires_at, 'to', new.license_expires_at));
    end if;
    if old.ear is distinct from new.ear then
      v_changes := v_changes || jsonb_build_object('ear', jsonb_build_object('from', old.ear, 'to', new.ear));
    end if;
    if old.branch_id is distinct from new.branch_id then
      v_changes := v_changes || jsonb_build_object('branch_id', jsonb_build_object('from', old.branch_id, 'to', new.branch_id));
    end if;
    if old.operational_status is distinct from new.operational_status then
      v_changes := v_changes || jsonb_build_object('operational_status', jsonb_build_object('from', old.operational_status, 'to', new.operational_status));
    end if;
    if old.photo_url is distinct from new.photo_url then
      v_changes := v_changes || jsonb_build_object('photo_url', jsonb_build_object('from', old.photo_url, 'to', new.photo_url));
    end if;
    if old.contract_type is distinct from new.contract_type then
      v_changes := v_changes || jsonb_build_object('contract_type', jsonb_build_object('from', old.contract_type, 'to', new.contract_type));
    end if;

    if v_changes = '{}'::jsonb and v_action = 'update' then
      return new;
    end if;

    insert into public.driver_history (
      company_id,
      driver_id,
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

create trigger drivers_log_history
  after insert or update on public.drivers
  for each row
  execute function public.log_driver_history();

-- ---------------------------------------------------------------------------
-- Trigger: log document uploads to driver_history
-- ---------------------------------------------------------------------------

create or replace function public.log_driver_document_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.driver_history (
    company_id,
    driver_id,
    action,
    changes,
    created_by
  )
  values (
    new.company_id,
    new.driver_id,
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

create trigger driver_documents_log_history
  after insert on public.driver_documents
  for each row
  execute function public.log_driver_document_history();

-- ---------------------------------------------------------------------------
-- Aggregated driver stats (RLS enforced via security invoker)
-- ---------------------------------------------------------------------------

create or replace function public.get_driver_stats(p_company_id uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      d.id,
      d.branch_id,
      d.operational_status,
      d.license_expires_at,
      d.ear,
      b.name as branch_name
    from public.drivers d
    left join public.branches b
      on b.id = d.branch_id
      and b.deleted_at is null
    where d.company_id = p_company_id
      and d.deleted_at is null
  ),
  branch_stats as (
    select
      coalesce(branch_id::text, 'none') as branch_key,
      branch_id,
      max(branch_name) as branch_name,
      count(*)::int as total,
      count(*) filter (where operational_status = 'active')::int as active
    from base
    group by branch_id
  )
  select json_build_object(
    'total', (select count(*)::int from base),
    'active', (select count(*)::int from base where operational_status = 'active'),
    'inactive', (select count(*)::int from base where operational_status = 'inactive'),
    'cnh_expiring', (
      select count(*)::int from base
      where license_expires_at is not null
        and license_expires_at >= current_date
        and license_expires_at <= current_date + interval '30 days'
    ),
    'cnh_expired', (
      select count(*)::int from base
      where license_expires_at is not null
        and license_expires_at < current_date
    ),
    'ear_pending', (
      select count(*)::int from base
      where ear = false
        and operational_status = 'active'
    ),
    'by_branch', coalesce(
      (
        select json_agg(
          json_build_object(
            'branch_id', branch_id,
            'branch_name', coalesce(branch_name, 'Sem filial'),
            'total', total,
            'active', active
          )
          order by coalesce(branch_name, 'Sem filial')
        )
        from branch_stats
      ),
      '[]'::json
    )
  );
$$;

comment on function public.get_driver_stats(uuid) is
  'Aggregated driver statistics for dashboard KPIs';

grant select, insert, update, delete on public.drivers to authenticated;
grant select, insert on public.driver_history to authenticated;
grant select, insert, update, delete on public.driver_documents to authenticated;
grant execute on function public.get_driver_stats(uuid) to authenticated;
