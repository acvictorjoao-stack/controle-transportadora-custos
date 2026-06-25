-- FleetControl Sprint 9 — branches (operational units)

create table public.branches (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete restrict,
  code             text not null,
  name             text not null,
  tax_id           text,
  is_headquarters  boolean not null default false,
  address_street   text,
  address_city     text,
  address_state    text,
  address_zip      text,
  metadata         jsonb not null default '{}'::jsonb,
  status           public.entity_status not null default 'active',
  notes            text,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now()),
  deleted_at       timestamptz,
  created_by       uuid references public.profiles (id) on delete set null,
  updated_by       uuid references public.profiles (id) on delete set null,

  constraint branches_code_not_empty check (length(trim(code)) > 0),
  constraint branches_name_not_empty check (length(trim(name)) > 0),
  constraint branches_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create unique index idx_branches_company_code_active
  on public.branches (company_id, code)
  where deleted_at is null;

create index idx_branches_company_id_active
  on public.branches (company_id)
  where deleted_at is null;

create index idx_branches_company_headquarters
  on public.branches (company_id, is_headquarters)
  where deleted_at is null and is_headquarters = true;

create trigger branches_set_updated_at
  before update on public.branches
  for each row
  execute function public.set_updated_at();

alter table public.branches enable row level security;

comment on table public.branches is 'Branch / operational unit belonging to a company';
