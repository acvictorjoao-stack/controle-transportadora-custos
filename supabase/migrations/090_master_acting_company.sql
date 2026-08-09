-- FleetControl — Master acting company context (platform owner → tenant dashboard)
-- Does NOT create company_members for portal owners.
-- Scopes Master operational access to one explicitly selected company.

-- Audit action for enter / switch / exit company context
alter type public.portal_audit_action add value if not exists 'company_access';

-- ---------------------------------------------------------------------------
-- 1. Context table (server-validated; one company per Master session)
-- ---------------------------------------------------------------------------

create table public.portal_acting_companies (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  company_id  uuid not null references public.companies (id) on delete cascade,
  updated_at  timestamptz not null default timezone('utc', now())
);

create index idx_portal_acting_companies_company_id
  on public.portal_acting_companies (company_id);

comment on table public.portal_acting_companies is
  'Selected company context for Portal Master (OWNER) when viewing a tenant dashboard. Not a membership.';

create trigger portal_acting_companies_set_updated_at
  before update on public.portal_acting_companies
  for each row
  execute function public.set_updated_at();

alter table public.portal_acting_companies enable row level security;

-- Only the authenticated OWNER may read/write their own acting context.
create policy portal_acting_companies_select_own
  on public.portal_acting_companies
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    and public.is_portal_owner()
  );

create policy portal_acting_companies_insert_own
  on public.portal_acting_companies
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and public.is_portal_owner()
  );

create policy portal_acting_companies_update_own
  on public.portal_acting_companies
  for update
  to authenticated
  using (
    profile_id = auth.uid()
    and public.is_portal_owner()
  )
  with check (
    profile_id = auth.uid()
    and public.is_portal_owner()
  );

create policy portal_acting_companies_delete_own
  on public.portal_acting_companies
  for delete
  to authenticated
  using (
    profile_id = auth.uid()
    and public.is_portal_owner()
  );

grant select, insert, update, delete on public.portal_acting_companies to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Helpers — scoped Master access (never blanket is_portal_owner())
-- ---------------------------------------------------------------------------

create or replace function public.get_portal_acting_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pac.company_id
  from public.portal_acting_companies pac
  inner join public.companies c
    on c.id = pac.company_id
   and c.deleted_at is null
   and c.status = 'active'
  where pac.profile_id = auth.uid()
    and public.is_portal_owner()
  limit 1;
$$;

create or replace function public.is_portal_owner_acting_for(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_company_id is not null
    and public.is_portal_owner()
    and public.get_portal_acting_company_id() = p_company_id;
$$;

grant execute on function public.get_portal_acting_company_id() to authenticated;
grant execute on function public.is_portal_owner_acting_for(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Extend existing auth helpers so all RLS policies inherit scoped Master access
-- ---------------------------------------------------------------------------

create or replace function public.get_my_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cm.company_id
  from public.company_members cm
  where cm.profile_id = auth.uid()
    and cm.deleted_at is null
    and cm.status = 'active'

  union

  select public.get_portal_acting_company_id()
  where public.get_portal_acting_company_id() is not null;
$$;

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_portal_owner_acting_for(p_company_id)
    or exists (
      select 1
      from public.company_members cm
      where cm.company_id = p_company_id
        and cm.profile_id = auth.uid()
        and cm.deleted_at is null
        and cm.status = 'active'
    );
$$;

create or replace function public.has_company_permission(
  p_company_id uuid,
  p_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_portal_owner_acting_for(p_company_id)
    or exists (
      select 1
      from public.company_members cm
      inner join public.roles r
        on r.id = cm.role_id
        and r.company_id = cm.company_id
        and r.deleted_at is null
        and r.status = 'active'
      inner join public.role_permissions rp
        on rp.role_id = r.id
        and rp.company_id = cm.company_id
      inner join public.permissions p
        on p.id = rp.permission_id
      where cm.company_id = p_company_id
        and cm.profile_id = auth.uid()
        and cm.deleted_at is null
        and cm.status = 'active'
        and p.code = p_permission_code
    );
$$;

-- Elevated tenant admin ops for Master ONLY while acting for that company.
-- Identity remains portal OWNER — this does not create a Super Admin membership.
create or replace function public.is_company_super_admin(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_portal_owner_acting_for(p_company_id)
    or exists (
      select 1
      from public.company_members cm
      inner join public.roles r on r.id = cm.role_id
      where cm.company_id = p_company_id
        and cm.profile_id = auth.uid()
        and cm.deleted_at is null
        and cm.status = 'active'
        and r.deleted_at is null
        and r.status = 'active'
        and r.is_system = true
        and r.name = 'Super Admin'
    );
$$;
