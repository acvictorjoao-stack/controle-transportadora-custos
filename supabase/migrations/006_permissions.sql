-- FleetControl Sprint 9 — permissions (global RBAC catalog)

create table public.permissions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  resource    text not null,
  action      text not null,
  description text,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),

  constraint permissions_code_not_empty check (length(trim(code)) > 0),
  constraint permissions_code_format check (code ~ '^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$'),
  constraint permissions_resource_not_empty check (length(trim(resource)) > 0),
  constraint permissions_action_not_empty check (length(trim(action)) > 0),
  constraint permissions_code_matches_resource_action check (code = resource || ':' || action),
  constraint permissions_code_key unique (code)
);

create unique index idx_permissions_code
  on public.permissions (code);

create index idx_permissions_resource_action
  on public.permissions (resource, action);

create trigger permissions_set_updated_at
  before update on public.permissions
  for each row
  execute function public.set_updated_at();

alter table public.permissions enable row level security;

comment on table public.permissions is 'Global permission catalog — platform scope, no company_id';
