-- FleetControl — Business roles (perfis de negócio) + permission matrices
-- Reuses existing permissions catalog. Does NOT mix with Portal Master.
--
-- Migration map (in-place rename; company_members.role_id preserved):
--   Admin    → Administrador
--   Manager  → Operacional  (permissions realigned to operational matrix)
--   Operator → Consulta     (kept as all *:read — already matched)
-- New roles: Financeiro, Cadastro
-- Unchanged: Super Admin (required by is_company_super_admin / provisioning)

-- ---------------------------------------------------------------------------
-- 1. Rename legacy system roles (preserve role ids → memberships stay valid)
-- ---------------------------------------------------------------------------

update public.roles
set
  name = 'Administrador',
  description = 'Acesso administrativo amplo da empresa',
  updated_at = timezone('utc', now())
where name = 'Admin'
  and deleted_at is null;

update public.roles
set
  name = 'Operacional',
  description = 'Operações: viagens, abastecimentos, manutenção e pneus',
  updated_at = timezone('utc', now())
where name = 'Manager'
  and deleted_at is null;

update public.roles
set
  name = 'Consulta',
  description = 'Somente leitura nos módulos disponíveis',
  updated_at = timezone('utc', now())
where name = 'Operator'
  and deleted_at is null;

update public.roles
set
  description = 'Acesso total à empresa (maior nível dentro do tenant)',
  updated_at = timezone('utc', now())
where name = 'Super Admin'
  and deleted_at is null
  and is_system = true;

-- ---------------------------------------------------------------------------
-- 2. Ensure Financeiro + Cadastro exist for every company
-- ---------------------------------------------------------------------------

insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
select
  c.id,
  'Financeiro',
  'Financeiro, DRE, rentabilidade e relatórios financeiros',
  true,
  null,
  null
from public.companies c
where c.deleted_at is null
  and not exists (
    select 1
    from public.roles r
    where r.company_id = c.id
      and r.name = 'Financeiro'
      and r.deleted_at is null
  );

insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
select
  c.id,
  'Cadastro',
  'Cadastros de veículos, motoristas, clientes e fornecedores',
  true,
  null,
  null
from public.companies c
where c.deleted_at is null
  and not exists (
    select 1
    from public.roles r
    where r.company_id = c.id
      and r.name = 'Cadastro'
      and r.deleted_at is null
  );

-- ---------------------------------------------------------------------------
-- 3. Realign role_permissions for business profiles
--    Super Admin / Administrador → all permissions
--    Consulta → all action = 'read'
--    Operacional / Financeiro / Cadastro → explicit allow-lists
-- ---------------------------------------------------------------------------

-- Super Admin + Administrador: ensure full catalog
insert into public.role_permissions (role_id, permission_id, company_id, created_by)
select r.id, p.id, r.company_id, null
from public.roles r
cross join public.permissions p
where r.deleted_at is null
  and r.name in ('Super Admin', 'Administrador')
on conflict do nothing;

-- Consulta: all read permissions (matches former Operator)
insert into public.role_permissions (role_id, permission_id, company_id, created_by)
select r.id, p.id, r.company_id, null
from public.roles r
cross join public.permissions p
where r.deleted_at is null
  and r.name = 'Consulta'
  and p.action = 'read'
on conflict do nothing;

-- Remove non-read grants accidentally left on Consulta (none expected after rename)
delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and r.name = 'Consulta'
  and r.deleted_at is null
  and p.action <> 'read';

-- Operacional: replace grants with operational matrix (no members admin, no financial write)
delete from public.role_permissions rp
using public.roles r
where rp.role_id = r.id
  and r.name = 'Operacional'
  and r.deleted_at is null;

insert into public.role_permissions (role_id, permission_id, company_id, created_by)
select r.id, p.id, r.company_id, null
from public.roles r
cross join public.permissions p
where r.deleted_at is null
  and r.name = 'Operacional'
  and p.code in (
    'companies:read',
    'branches:read',
    'vehicles:read', 'vehicles:create', 'vehicles:update',
    'drivers:read', 'drivers:create', 'drivers:update',
    'trips:read', 'trips:create', 'trips:update',
    'routes:read', 'routes:create', 'routes:update',
    'fuel:read', 'fuel:create', 'fuel:update',
    'maintenance:read', 'maintenance:create', 'maintenance:update',
    'tires:read', 'tires:create', 'tires:update',
    'customers:read',
    'suppliers:read',
    'vision_providers:read', 'vision_providers:create', 'vision_providers:update'
  )
on conflict do nothing;

-- Financeiro: financial + DRE/rentabilidade context reads (no members admin, no fleet write)
delete from public.role_permissions rp
using public.roles r
where rp.role_id = r.id
  and r.name = 'Financeiro'
  and r.deleted_at is null;

insert into public.role_permissions (role_id, permission_id, company_id, created_by)
select r.id, p.id, r.company_id, null
from public.roles r
cross join public.permissions p
where r.deleted_at is null
  and r.name = 'Financeiro'
  and p.code in (
    'companies:read',
    'branches:read',
    'financeiro:read', 'financeiro:create', 'financeiro:update', 'financeiro:delete',
    'financeiro_fluxo:read',
    'financeiro_pagar:read',
    'financeiro_receber:read',
    'customers:read',
    'suppliers:read',
    'vehicles:read',
    'drivers:read',
    'trips:read',
    'routes:read',
    'fuel:read',
    'maintenance:read',
    'tires:read'
  )
on conflict do nothing;

-- Cadastro: master data write + operational reads (no members admin, no financial write)
delete from public.role_permissions rp
using public.roles r
where rp.role_id = r.id
  and r.name = 'Cadastro'
  and r.deleted_at is null;

insert into public.role_permissions (role_id, permission_id, company_id, created_by)
select r.id, p.id, r.company_id, null
from public.roles r
cross join public.permissions p
where r.deleted_at is null
  and r.name = 'Cadastro'
  and p.code in (
    'companies:read',
    'branches:read',
    'profiles:read',
    'vehicles:read', 'vehicles:create', 'vehicles:update',
    'drivers:read', 'drivers:create', 'drivers:update',
    'customers:read', 'customers:create', 'customers:update',
    'suppliers:read', 'suppliers:create', 'suppliers:update',
    'routes:read', 'routes:create', 'routes:update',
    'trips:read',
    'fuel:read',
    'maintenance:read',
    'tires:read',
    'vision_providers:read', 'vision_providers:create', 'vision_providers:update'
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. Canonical seed for NEW companies
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
  v_super_admin_id   uuid;
  v_administrador_id uuid;
  v_financeiro_id    uuid;
  v_operacional_id   uuid;
  v_cadastro_id      uuid;
  v_consulta_id      uuid;
begin
  if not exists (
    select 1 from public.roles
    where company_id = p_company_id and name = 'Super Admin' and deleted_at is null
  ) then
    insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
    values (
      p_company_id,
      'Super Admin',
      'Acesso total à empresa (maior nível dentro do tenant)',
      true,
      p_created_by,
      p_created_by
    );
  end if;

  if not exists (
    select 1 from public.roles
    where company_id = p_company_id and name = 'Administrador' and deleted_at is null
  ) then
    insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
    values (
      p_company_id,
      'Administrador',
      'Acesso administrativo amplo da empresa',
      true,
      p_created_by,
      p_created_by
    );
  end if;

  if not exists (
    select 1 from public.roles
    where company_id = p_company_id and name = 'Financeiro' and deleted_at is null
  ) then
    insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
    values (
      p_company_id,
      'Financeiro',
      'Financeiro, DRE, rentabilidade e relatórios financeiros',
      true,
      p_created_by,
      p_created_by
    );
  end if;

  if not exists (
    select 1 from public.roles
    where company_id = p_company_id and name = 'Operacional' and deleted_at is null
  ) then
    insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
    values (
      p_company_id,
      'Operacional',
      'Operações: viagens, abastecimentos, manutenção e pneus',
      true,
      p_created_by,
      p_created_by
    );
  end if;

  if not exists (
    select 1 from public.roles
    where company_id = p_company_id and name = 'Cadastro' and deleted_at is null
  ) then
    insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
    values (
      p_company_id,
      'Cadastro',
      'Cadastros de veículos, motoristas, clientes e fornecedores',
      true,
      p_created_by,
      p_created_by
    );
  end if;

  if not exists (
    select 1 from public.roles
    where company_id = p_company_id and name = 'Consulta' and deleted_at is null
  ) then
    insert into public.roles (company_id, name, description, is_system, created_by, updated_by)
    values (
      p_company_id,
      'Consulta',
      'Somente leitura nos módulos disponíveis',
      true,
      p_created_by,
      p_created_by
    );
  end if;

  select id into v_super_admin_id
  from public.roles
  where company_id = p_company_id and name = 'Super Admin' and deleted_at is null;

  select id into v_administrador_id
  from public.roles
  where company_id = p_company_id and name = 'Administrador' and deleted_at is null;

  select id into v_financeiro_id
  from public.roles
  where company_id = p_company_id and name = 'Financeiro' and deleted_at is null;

  select id into v_operacional_id
  from public.roles
  where company_id = p_company_id and name = 'Operacional' and deleted_at is null;

  select id into v_cadastro_id
  from public.roles
  where company_id = p_company_id and name = 'Cadastro' and deleted_at is null;

  select id into v_consulta_id
  from public.roles
  where company_id = p_company_id and name = 'Consulta' and deleted_at is null;

  insert into public.role_permissions (role_id, permission_id, company_id, created_by)
  select v_super_admin_id, p.id, p_company_id, p_created_by
  from public.permissions p
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id, company_id, created_by)
  select v_administrador_id, p.id, p_company_id, p_created_by
  from public.permissions p
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id, company_id, created_by)
  select v_financeiro_id, p.id, p_company_id, p_created_by
  from public.permissions p
  where p.code in (
    'companies:read',
    'branches:read',
    'financeiro:read', 'financeiro:create', 'financeiro:update', 'financeiro:delete',
    'financeiro_fluxo:read',
    'financeiro_pagar:read',
    'financeiro_receber:read',
    'customers:read',
    'suppliers:read',
    'vehicles:read',
    'drivers:read',
    'trips:read',
    'routes:read',
    'fuel:read',
    'maintenance:read',
    'tires:read'
  )
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id, company_id, created_by)
  select v_operacional_id, p.id, p_company_id, p_created_by
  from public.permissions p
  where p.code in (
    'companies:read',
    'branches:read',
    'vehicles:read', 'vehicles:create', 'vehicles:update',
    'drivers:read', 'drivers:create', 'drivers:update',
    'trips:read', 'trips:create', 'trips:update',
    'routes:read', 'routes:create', 'routes:update',
    'fuel:read', 'fuel:create', 'fuel:update',
    'maintenance:read', 'maintenance:create', 'maintenance:update',
    'tires:read', 'tires:create', 'tires:update',
    'customers:read',
    'suppliers:read',
    'vision_providers:read', 'vision_providers:create', 'vision_providers:update'
  )
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id, company_id, created_by)
  select v_cadastro_id, p.id, p_company_id, p_created_by
  from public.permissions p
  where p.code in (
    'companies:read',
    'branches:read',
    'profiles:read',
    'vehicles:read', 'vehicles:create', 'vehicles:update',
    'drivers:read', 'drivers:create', 'drivers:update',
    'customers:read', 'customers:create', 'customers:update',
    'suppliers:read', 'suppliers:create', 'suppliers:update',
    'routes:read', 'routes:create', 'routes:update',
    'trips:read',
    'fuel:read',
    'maintenance:read',
    'tires:read',
    'vision_providers:read', 'vision_providers:create', 'vision_providers:update'
  )
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id, company_id, created_by)
  select v_consulta_id, p.id, p_company_id, p_created_by
  from public.permissions p
  where p.action = 'read'
  on conflict do nothing;

  perform public.seed_financial_defaults_for_company(p_company_id, p_created_by);
end;
$$;

comment on function public.seed_default_roles_for_company(uuid, uuid) is
  'Canonical business role seeding — Super Admin, Administrador, Financeiro, Operacional, Cadastro, Consulta';

-- ---------------------------------------------------------------------------
-- 5. Helper: count active Super Admins in a company (for last-admin protection)
-- ---------------------------------------------------------------------------

create or replace function public.count_active_super_admins(p_company_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.company_members cm
  inner join public.roles r on r.id = cm.role_id
  where cm.company_id = p_company_id
    and cm.deleted_at is null
    and cm.status = 'active'
    and r.deleted_at is null
    and r.status = 'active'
    and r.is_system = true
    and r.name = 'Super Admin';
$$;

comment on function public.count_active_super_admins(uuid) is
  'Counts active Super Admin memberships for a company (last-admin protection)';

grant execute on function public.count_active_super_admins(uuid) to authenticated;
