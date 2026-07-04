-- FleetControl Sprint 15.2 — portal_audit_logs, platform_settings, portal_users OWNER policies

-- ---------------------------------------------------------------------------
-- Audit action enum
-- ---------------------------------------------------------------------------

create type public.portal_audit_action as enum (
  'login',
  'logout',
  'company_create',
  'company_update',
  'company_provision',
  'company_delete',
  'password_reset',
  'user_create',
  'user_update',
  'user_role_change',
  'user_activate',
  'user_deactivate',
  'plan_change',
  'company_suspend',
  'company_reactivate',
  'settings_update'
);

comment on type public.portal_audit_action is 'Actions recorded in portal_audit_logs';

-- ---------------------------------------------------------------------------
-- portal_audit_logs
-- ---------------------------------------------------------------------------

create table public.portal_audit_logs (
  id                uuid primary key default gen_random_uuid(),
  action            public.portal_audit_action not null,
  actor_profile_id  uuid references public.profiles (id) on delete set null,
  actor_email       text,
  target_type       text,
  target_id         text,
  target_label      text,
  metadata          jsonb not null default '{}'::jsonb,
  ip_address        text,
  user_agent        text,
  created_at        timestamptz not null default timezone('utc', now()),

  constraint portal_audit_logs_metadata_is_object
    check (jsonb_typeof(metadata) = 'object')
);

create index idx_portal_audit_logs_created_at
  on public.portal_audit_logs (created_at desc);

create index idx_portal_audit_logs_action
  on public.portal_audit_logs (action);

create index idx_portal_audit_logs_actor_profile_id
  on public.portal_audit_logs (actor_profile_id)
  where actor_profile_id is not null;

alter table public.portal_audit_logs enable row level security;

comment on table public.portal_audit_logs is 'Audit trail for Portal Master operations';

-- ---------------------------------------------------------------------------
-- platform_settings (singleton row)
-- ---------------------------------------------------------------------------

create table public.platform_settings (
  id                       text primary key default 'default',
  platform_name            text not null default 'FleetControl',
  logo_url                 text,
  favicon_url              text,
  public_url               text,
  smtp_config              jsonb not null default '{}'::jsonb,
  sender_email             text,
  session_timeout_minutes  integer not null default 480,
  password_policy          jsonb not null default '{
    "min_length": 8,
    "require_uppercase": true,
    "require_lowercase": true,
    "require_number": true,
    "require_special": false
  }'::jsonb,
  max_upload_mb            integer not null default 10,
  integrations             jsonb not null default '{}'::jsonb,
  feature_flags            jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default timezone('utc', now()),
  updated_at               timestamptz not null default timezone('utc', now()),

  constraint platform_settings_singleton check (id = 'default'),
  constraint platform_settings_smtp_is_object
    check (jsonb_typeof(smtp_config) = 'object'),
  constraint platform_settings_password_policy_is_object
    check (jsonb_typeof(password_policy) = 'object'),
  constraint platform_settings_integrations_is_object
    check (jsonb_typeof(integrations) = 'object'),
  constraint platform_settings_feature_flags_is_object
    check (jsonb_typeof(feature_flags) = 'object'),
  constraint platform_settings_session_timeout_positive
    check (session_timeout_minutes > 0),
  constraint platform_settings_max_upload_positive
    check (max_upload_mb > 0)
);

create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row
  execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

comment on table public.platform_settings is 'Global platform configuration (singleton)';

insert into public.platform_settings (id)
values ('default')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- portal_users — OWNER management policies
-- ---------------------------------------------------------------------------

create policy portal_users_select_owner
  on public.portal_users
  for select
  to authenticated
  using (public.is_portal_owner());

create policy portal_users_insert_owner
  on public.portal_users
  for insert
  to authenticated
  with check (public.is_portal_owner());

create policy portal_users_update_owner
  on public.portal_users
  for update
  to authenticated
  using (public.is_portal_owner())
  with check (public.is_portal_owner());

-- ---------------------------------------------------------------------------
-- portal_audit_logs — OWNER read-only
-- ---------------------------------------------------------------------------

create policy portal_audit_logs_select_owner
  on public.portal_audit_logs
  for select
  to authenticated
  using (public.is_portal_owner());

-- ---------------------------------------------------------------------------
-- platform_settings — OWNER read/write
-- ---------------------------------------------------------------------------

create policy platform_settings_select_owner
  on public.platform_settings
  for select
  to authenticated
  using (public.is_portal_owner());

create policy platform_settings_update_owner
  on public.platform_settings
  for update
  to authenticated
  using (public.is_portal_owner())
  with check (public.is_portal_owner());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select on public.portal_audit_logs to authenticated;
grant select, update on public.platform_settings to authenticated;
grant insert, update on public.portal_users to authenticated;
