-- FleetControl Sprint 9 — Seed: permissions, plan catalog, default roles

-- ---------------------------------------------------------------------------
-- SaaS plan catalog (reference until saas_plans table — Sprint 10)
-- ---------------------------------------------------------------------------

create or replace function public.get_plan_catalog()
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_array(
    jsonb_build_object(
      'slug', 'free',
      'name', 'Plano Free',
      'description', 'Plano gratuito para transportadoras em fase inicial',
      'price_monthly', 0.00,
      'price_yearly', 0.00,
      'max_users', 3,
      'max_vehicles', 5,
      'max_branches', 1,
      'enabled_modules', jsonb_build_array('organization', 'fleet_basic')
    ),
    jsonb_build_object(
      'slug', 'professional',
      'name', 'Plano Professional',
      'description', 'Plano completo para operações em crescimento',
      'price_monthly', 299.00,
      'price_yearly', 2990.00,
      'max_users', 25,
      'max_vehicles', 50,
      'max_branches', 10,
      'enabled_modules', jsonb_build_array(
        'organization', 'fleet', 'operations', 'financial', 'costs', 'reports'
      )
    )
  );
$$;

comment on function public.get_plan_catalog() is
  'Returns Free and Professional plan definitions until saas_plans migration (Sprint 10)';

grant execute on function public.get_plan_catalog() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Global permissions (Organization module)
-- ---------------------------------------------------------------------------

insert into public.permissions (code, resource, action, description)
values
  ('companies:read',   'companies', 'read',   'View company settings'),
  ('companies:write',  'companies', 'write',  'Update company settings'),
  ('branches:read',    'branches',  'read',   'View branches'),
  ('branches:write',   'branches',  'write',  'Manage branches'),
  ('members:read',     'members',   'read',   'View company members'),
  ('members:write',    'members',   'write',  'Manage company members'),
  ('members:invite',   'members',   'invite', 'Invite users to company'),
  ('roles:read',       'roles',     'read',   'View roles and permissions'),
  ('roles:write',      'roles',     'write',  'Manage roles and permissions'),
  ('profiles:read',    'profiles',  'read',   'View user profiles'),
  ('profiles:write',   'profiles',  'write',  'Update user profiles')
on conflict (code) do update
set
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  updated_at = timezone('utc', now());

-- ---------------------------------------------------------------------------
-- Default roles per company (Super Admin, Admin, Manager, Operator)
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
    'profiles:read', 'profiles:write'
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
  'Creates system roles (Super Admin, Admin, Manager, Operator) and maps permissions';

-- ---------------------------------------------------------------------------
-- Company onboarding: HQ branch + default roles
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.branches (
    company_id,
    code,
    name,
    is_headquarters,
    status,
    created_by
  )
  values (
    new.id,
    'HQ',
    coalesce(new.trade_name, new.legal_name),
    true,
    'active',
    null
  );

  perform public.seed_default_roles_for_company(new.id, null);

  return new;
end;
$$;

create trigger on_company_created
  after insert on public.companies
  for each row
  execute function public.handle_new_company();

grant execute on function public.seed_default_roles_for_company(uuid, uuid) to authenticated;
