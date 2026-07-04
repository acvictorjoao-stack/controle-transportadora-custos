-- FleetControl Sprint 23.1.1 — Schema consistency hardening

-- ---------------------------------------------------------------------------
-- companies.slug — partial unique index (allow slug reuse after soft delete)
-- ---------------------------------------------------------------------------

drop index if exists public.idx_companies_slug;

create unique index idx_companies_slug_active
  on public.companies (slug)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- vision_providers permissions (RLS references these since migration 032)
-- ---------------------------------------------------------------------------

insert into public.permissions (code, resource, action, description)
values
  ('vision_providers:read',   'vision_providers', 'read',   'View vision provider integrations'),
  ('vision_providers:create', 'vision_providers', 'create', 'Create vision provider integrations'),
  ('vision_providers:update', 'vision_providers', 'update', 'Update vision provider integrations'),
  ('vision_providers:delete', 'vision_providers', 'delete', 'Delete vision provider integrations')
on conflict (code) do update
set
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  updated_at = timezone('utc', now());

insert into public.role_permissions (role_id, permission_id, company_id, created_by)
select r.id, p.id, r.company_id, null
from public.roles r
cross join public.permissions p
where r.deleted_at is null
  and p.code in (
    'vision_providers:read',
    'vision_providers:create',
    'vision_providers:update',
    'vision_providers:delete'
  )
  and (
    r.name in ('Super Admin', 'Admin')
    or (r.name = 'Manager' and p.code in ('vision_providers:read', 'vision_providers:create', 'vision_providers:update'))
    or (r.name = 'Operator' and p.code = 'vision_providers:read')
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- vision_providers RLS — align policies with corrected permission codes
-- (databases that ran migration 032 before the code format fix)
-- ---------------------------------------------------------------------------

drop policy if exists vision_providers_select_authorized on public.vision_providers;
drop policy if exists vision_providers_insert_authorized on public.vision_providers;
drop policy if exists vision_providers_update_authorized on public.vision_providers;
drop policy if exists vision_providers_delete_authorized on public.vision_providers;

create policy vision_providers_select_authorized
  on public.vision_providers
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'vision_providers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy vision_providers_insert_authorized
  on public.vision_providers
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'vision_providers:create')
    or public.is_company_super_admin(company_id)
  );

create policy vision_providers_update_authorized
  on public.vision_providers
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'vision_providers:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'vision_providers:update')
    or public.is_company_super_admin(company_id)
  );

create policy vision_providers_delete_authorized
  on public.vision_providers
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'vision_providers:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- seed_default_roles_for_company — single canonical definition (migrations 028–058
-- only insert permissions + backfill; this function is the source of truth)
-- ---------------------------------------------------------------------------

create or replace function public.seed_default_roles_for_company(
  p_company_id uuid,
  p_created_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_super_admin_id uuid;
  v_admin_id       uuid;
  v_manager_id     uuid;
  v_operator_id    uuid;
begin
  if not exists (
    select 1 from public.roles
    where company_id = p_company_id and name = 'Super Admin' and deleted_at is null
  ) then
    insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
    values (p_company_id, 'Super Admin', 'Full access to all company resources', true, p_created_by, p_created_by);
  end if;

  if not exists (
    select 1 from public.roles
    where company_id = p_company_id and name = 'Admin' and deleted_at is null
  ) then
    insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
    values (p_company_id, 'Admin', 'Administrative access for company management', true, p_created_by, p_created_by);
  end if;

  if not exists (
    select 1 from public.roles
    where company_id = p_company_id and name = 'Manager' and deleted_at is null
  ) then
    insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
    values (p_company_id, 'Manager', 'Operational management with selective write access', true, p_created_by, p_created_by);
  end if;

  if not exists (
    select 1 from public.roles
    where company_id = p_company_id and name = 'Operator' and deleted_at is null
  ) then
    insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
    values (p_company_id, 'Operator', 'Read-heavy access for day-to-day operations', true, p_created_by, p_created_by);
  end if;

  select id into v_super_admin_id from public.roles where company_id = p_company_id and name = 'Super Admin' and deleted_at is null;
  select id into v_admin_id       from public.roles where company_id = p_company_id and name = 'Admin'       and deleted_at is null;
  select id into v_manager_id     from public.roles where company_id = p_company_id and name = 'Manager'     and deleted_at is null;
  select id into v_operator_id    from public.roles where company_id = p_company_id and name = 'Operator'    and deleted_at is null;

  insert into public.role_permissions (role_id, permission_id, company_id, created_by)
  select v_super_admin_id, p.id, p_company_id, p_created_by
  from public.permissions p
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id, company_id, created_by)
  select v_admin_id, p.id, p_company_id, p_created_by
  from public.permissions p
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id, company_id, created_by)
  select v_manager_id, p.id, p_company_id, p_created_by
  from public.permissions p
  where p.code in (
    'companies:read',
    'branches:read', 'branches:write',
    'members:read',
    'roles:read',
    'profiles:read', 'profiles:write',
    'vehicles:read', 'vehicles:create', 'vehicles:update',
    'drivers:read', 'drivers:create', 'drivers:update',
    'trips:read', 'trips:create', 'trips:update',
    'fuel:read', 'fuel:create', 'fuel:update',
    'maintenance:read', 'maintenance:create', 'maintenance:update',
    'tires:read', 'tires:create', 'tires:update',
    'vision_providers:read', 'vision_providers:create', 'vision_providers:update'
  )
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id, company_id, created_by)
  select v_operator_id, p.id, p_company_id, p_created_by
  from public.permissions p
  where p.action = 'read'
  on conflict do nothing;
end;
$$;

comment on function public.seed_default_roles_for_company(uuid, uuid) is
  'Canonical role seeding — creates system roles and maps permissions (Sprint 23.1.1)';
