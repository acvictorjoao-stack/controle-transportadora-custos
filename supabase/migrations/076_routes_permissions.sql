-- FleetControl Sprint 25.1 — Routes RBAC permissions

insert into public.permissions (code, resource, action, description)
values
  ('routes:read',   'routes', 'read',   'View operational routes'),
  ('routes:create', 'routes', 'create', 'Create operational routes'),
  ('routes:update', 'routes', 'update', 'Update operational routes'),
  ('routes:delete', 'routes', 'delete', 'Delete operational routes')
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
  and p.code in ('routes:read', 'routes:create', 'routes:update', 'routes:delete')
  and (
    r.name in ('Super Admin', 'Admin')
    or (r.name = 'Manager' and p.code in ('routes:read', 'routes:create', 'routes:update'))
    or (r.name = 'Operator' and p.code = 'routes:read')
  )
on conflict do nothing;

-- Update canonical role seeding to include route permissions
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
    'routes:read', 'routes:create', 'routes:update',
    'fuel:read', 'fuel:create', 'fuel:update',
    'maintenance:read', 'maintenance:create', 'maintenance:update',
    'tires:read', 'tires:create', 'tires:update',
    'customers:read', 'customers:create', 'customers:update',
    'financeiro:read', 'financeiro:create', 'financeiro:update',
    'financeiro_fluxo:read', 'financeiro_pagar:read', 'financeiro_receber:read',
    'vision_providers:read', 'vision_providers:create', 'vision_providers:update'
  )
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id, company_id, created_by)
  select v_operator_id, p.id, p_company_id, p_created_by
  from public.permissions p
  where p.action = 'read'
  on conflict do nothing;

  perform public.seed_financial_defaults_for_company(p_company_id, p_created_by);
end;
$$;

comment on function public.seed_default_roles_for_company(uuid, uuid) is
  'Canonical role seeding — creates system roles and maps permissions (Sprint 25.1)';
