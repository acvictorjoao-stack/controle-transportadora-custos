-- FleetControl Sprint 12 — portal_users (Portal Master access)

create type public.portal_role as enum (
  'OWNER',
  'SUPPORT',
  'FINANCE'
);

comment on type public.portal_role is 'Platform-level roles for the Master Portal';

create table public.portal_users (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  role        public.portal_role not null,
  active      boolean not null default true,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),

  constraint portal_users_profile_id_unique unique (profile_id)
);

create index idx_portal_users_profile_id_active
  on public.portal_users (profile_id)
  where active = true;

create index idx_portal_users_role_active
  on public.portal_users (role)
  where active = true;

create trigger portal_users_set_updated_at
  before update on public.portal_users
  for each row
  execute function public.set_updated_at();

alter table public.portal_users enable row level security;

comment on table public.portal_users is 'Platform operators with access to the Master Portal';

-- ---------------------------------------------------------------------------
-- Auth helpers (security definer — bypass RLS for middleware/guards)
-- ---------------------------------------------------------------------------

create or replace function public.get_my_portal_role()
returns public.portal_role
language sql
stable
security definer
set search_path = public
as $$
  select pu.role
  from public.portal_users pu
  where pu.profile_id = auth.uid()
    and pu.active = true
  limit 1;
$$;

create or replace function public.is_portal_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_users pu
    where pu.profile_id = auth.uid()
      and pu.active = true
      and pu.role = 'OWNER'
  );
$$;

create or replace function public.is_portal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_users pu
    where pu.profile_id = auth.uid()
      and pu.active = true
  );
$$;

grant execute on function public.get_my_portal_role() to authenticated;
grant execute on function public.is_portal_owner() to authenticated;
grant execute on function public.is_portal_user() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

-- Users can read their own active portal record
create policy portal_users_select_own
  on public.portal_users
  for select
  to authenticated
  using (profile_id = auth.uid() and active = true);

-- Mutations restricted to service_role (bootstrap via Supabase SQL editor)
-- No insert/update/delete policies for authenticated role
