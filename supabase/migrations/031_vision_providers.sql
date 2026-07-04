-- FleetControl — VI session module: vision_providers table

create table public.vision_providers (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete restrict,
  name           text not null,
  provider_name  public.provider_name not null,
  kind           public.kind not null,
  model          text,
  config         jsonb not null default '{}'::jsonb,
  is_default     boolean not null default false,
  status         public.entity_status not null default 'active',
  metadata       jsonb not null default '{}'::jsonb,
  notes          text,
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now()),
  deleted_at     timestamptz,
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,

  constraint vision_providers_name_not_empty check (length(trim(name)) > 0),
  constraint vision_providers_config_is_object check (jsonb_typeof(config) = 'object'),
  constraint vision_providers_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create unique index idx_vision_providers_company_provider_kind_active
  on public.vision_providers (company_id, provider_name, kind)
  where deleted_at is null;

create index idx_vision_providers_company_id_active
  on public.vision_providers (company_id)
  where deleted_at is null;

create index idx_vision_providers_company_kind_active
  on public.vision_providers (company_id, kind)
  where deleted_at is null;

create index idx_vision_providers_company_status_active
  on public.vision_providers (company_id, status)
  where deleted_at is null;

create index idx_vision_providers_company_default_active
  on public.vision_providers (company_id, is_default)
  where deleted_at is null and is_default = true;

create trigger vision_providers_set_updated_at
  before update on public.vision_providers
  for each row
  execute function public.set_updated_at();

alter table public.vision_providers enable row level security;

comment on table public.vision_providers is
  'Company-scoped vision AI provider configurations for the VI session module';

comment on column public.vision_providers.config is
  'Provider-specific settings (model, endpoint, credentials reference, etc.)';

comment on column public.vision_providers.is_default is
  'When true, this provider is the default for its kind within the company';

grant select, insert, update, delete on public.vision_providers to authenticated;
