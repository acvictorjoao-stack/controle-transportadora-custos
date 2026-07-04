-- FleetControl Sprint 14 — Company provisioning control fields & RPC

create type public.provision_status as enum (
  'pending',
  'in_progress',
  'completed',
  'error'
);

comment on type public.provision_status is
  'Lifecycle of automatic company provisioning from the Master Portal';

alter table public.companies
  add column provision_status public.provision_status not null default 'pending',
  add column provisioned_at timestamptz,
  add column provision_error text;

create index idx_companies_provision_status_active
  on public.companies (provision_status)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Portal owner: update provision status during orchestration
-- ---------------------------------------------------------------------------

create or replace function public.update_company_provision_status(
  p_company_id uuid,
  p_status public.provision_status,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_portal_owner() then
    raise exception 'Acesso negado: somente OWNER pode provisionar empresas';
  end if;

  update public.companies
  set
    provision_status = p_status,
    provision_error = p_error,
    provisioned_at = case
      when p_status = 'completed' then timezone('utc', now())
      else provisioned_at
    end
  where id = p_company_id
    and deleted_at is null;

  if not found then
    raise exception 'Empresa não encontrada: %', p_company_id;
  end if;
end;
$$;

comment on function public.update_company_provision_status(uuid, public.provision_status, text) is
  'Updates provisioning status for a company (Portal Master OWNER only)';

-- ---------------------------------------------------------------------------
-- Complete provisioning: company_members + mark company as provisioned
-- ---------------------------------------------------------------------------

create or replace function public.complete_company_provisioning(
  p_company_id uuid,
  p_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hq_branch_id uuid;
  v_super_admin_role_id uuid;
  v_member_id uuid;
begin
  if not public.is_portal_owner() then
    raise exception 'Acesso negado: somente OWNER pode provisionar empresas';
  end if;

  if exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.deleted_at is null
      and cm.status = 'active'
  ) then
    raise exception 'Empresa já possui membros ativos';
  end if;

  select b.id
  into v_hq_branch_id
  from public.branches b
  where b.company_id = p_company_id
    and b.code = 'HQ'
    and b.deleted_at is null
  limit 1;

  if v_hq_branch_id is null then
    raise exception 'Filial matriz (HQ) não encontrada para a empresa %', p_company_id;
  end if;

  select r.id
  into v_super_admin_role_id
  from public.roles r
  where r.company_id = p_company_id
    and r.name = 'Super Admin'
    and r.is_system = true
    and r.deleted_at is null
  limit 1;

  if v_super_admin_role_id is null then
    raise exception 'Role Super Admin não encontrada para a empresa %', p_company_id;
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = p_profile_id
  ) then
    raise exception 'Profile não encontrado: %', p_profile_id;
  end if;

  insert into public.company_members (
    company_id,
    profile_id,
    role_id,
    default_branch_id,
    accepted_at,
    status
  )
  values (
    p_company_id,
    p_profile_id,
    v_super_admin_role_id,
    v_hq_branch_id,
    timezone('utc', now()),
    'active'
  )
  returning id into v_member_id;

  update public.companies
  set
    provision_status = 'completed',
    provisioned_at = timezone('utc', now()),
    provision_error = null
  where id = p_company_id
    and deleted_at is null;

  return v_member_id;
end;
$$;

comment on function public.complete_company_provisioning(uuid, uuid) is
  'Links admin profile as Super Admin member with HQ default branch (Portal Master OWNER only)';

grant execute on function public.update_company_provision_status(uuid, public.provision_status, text) to authenticated;
grant execute on function public.complete_company_provisioning(uuid, uuid) to authenticated;
