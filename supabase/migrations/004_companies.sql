-- FleetControl Sprint 9 — companies (tenant root)

create table public.companies (
  id            uuid primary key default gen_random_uuid(),
  legal_name    text not null,
  trade_name    text,
  tax_id        text not null,
  slug          text not null,
  email         text not null,
  phone         text,
  address_street text,
  address_city   text,
  address_state  text,
  address_zip    text,
  logo_url      text,
  settings      jsonb not null default '{}'::jsonb,
  status        public.entity_status not null default 'active',
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  deleted_at    timestamptz,

  constraint companies_legal_name_not_empty check (length(trim(legal_name)) > 0),
  constraint companies_tax_id_not_empty check (length(trim(tax_id)) > 0),
  constraint companies_slug_not_empty check (length(trim(slug)) > 0),
  constraint companies_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint companies_email_not_empty check (length(trim(email)) > 0),
  constraint companies_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint companies_settings_is_object check (jsonb_typeof(settings) = 'object')
);

create unique index idx_companies_tax_id_active
  on public.companies (tax_id)
  where deleted_at is null;

create unique index idx_companies_slug
  on public.companies (slug);

create index idx_companies_status_active
  on public.companies (status)
  where deleted_at is null;

create index idx_companies_created_at
  on public.companies (created_at desc);

create trigger companies_set_updated_at
  before update on public.companies
  for each row
  execute function public.set_updated_at();

alter table public.companies enable row level security;

comment on table public.companies is 'Tenant root — transport carrier organization';
