-- FleetControl Sprint 9 — roles (per-company access profiles)

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete restrict,
  name        text not null,
  description text,
  is_system   boolean not null default false,
  status      public.entity_status not null default 'active',
  notes       text,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),
  deleted_at  timestamptz,
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,

  constraint roles_name_not_empty check (length(trim(name)) > 0)
);

create unique index idx_roles_company_name_active
  on public.roles (company_id, name)
  where deleted_at is null;

create index idx_roles_company_id
  on public.roles (company_id);

create index idx_roles_company_status_active
  on public.roles (company_id, status)
  where deleted_at is null;

create trigger roles_set_updated_at
  before update on public.roles
  for each row
  execute function public.set_updated_at();

alter table public.roles enable row level security;

comment on table public.roles is 'Company-scoped role — links to permissions via role_permissions';
