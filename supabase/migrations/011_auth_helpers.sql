-- FleetControl Sprint 9 — Auth helpers and integrity triggers for RLS

-- Checks if a company has any active member (bypasses RLS — used for bootstrap policies)
create or replace function public.company_has_active_members(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.deleted_at is null
  );
$$;

-- Returns company IDs the current user belongs to
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
    and cm.status = 'active';
$$;

-- Checks if current user is an active member of a company
create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.profile_id = auth.uid()
      and cm.deleted_at is null
      and cm.status = 'active'
  );
$$;

-- Checks if current user has a permission within a company (via role)
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
  select exists (
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

-- Super Admin bypass for company-scoped admin operations
create or replace function public.is_company_super_admin(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
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

-- Ensures role_permissions.company_id matches roles.company_id
create or replace function public.validate_role_permissions_company()
returns trigger
language plpgsql
as $$
declare
  v_role_company_id uuid;
begin
  select company_id into v_role_company_id
  from public.roles
  where id = new.role_id;

  if v_role_company_id is null then
    raise exception 'role_id % does not exist', new.role_id;
  end if;

  if new.company_id <> v_role_company_id then
    raise exception 'role_permissions.company_id must match roles.company_id';
  end if;

  return new;
end;
$$;

create trigger role_permissions_validate_company
  before insert or update on public.role_permissions
  for each row
  execute function public.validate_role_permissions_company();

-- Ensures default_branch_id belongs to the same company
create or replace function public.validate_company_member_branch()
returns trigger
language plpgsql
as $$
declare
  v_branch_company_id uuid;
begin
  if new.default_branch_id is null then
    return new;
  end if;

  select company_id into v_branch_company_id
  from public.branches
  where id = new.default_branch_id
    and deleted_at is null;

  if v_branch_company_id is null then
    raise exception 'default_branch_id % is invalid', new.default_branch_id;
  end if;

  if v_branch_company_id <> new.company_id then
    raise exception 'default_branch_id must belong to the same company';
  end if;

  return new;
end;
$$;

create trigger company_members_validate_branch
  before insert or update on public.company_members
  for each row
  execute function public.validate_company_member_branch();

-- Ensures company_member.role_id belongs to the same company
create or replace function public.validate_company_member_role()
returns trigger
language plpgsql
as $$
declare
  v_role_company_id uuid;
begin
  select company_id into v_role_company_id
  from public.roles
  where id = new.role_id
    and deleted_at is null;

  if v_role_company_id is null then
    raise exception 'role_id % is invalid', new.role_id;
  end if;

  if v_role_company_id <> new.company_id then
    raise exception 'role_id must belong to the same company';
  end if;

  return new;
end;
$$;

create trigger company_members_validate_role
  before insert or update on public.company_members
  for each row
  execute function public.validate_company_member_role();

grant execute on function public.company_has_active_members(uuid) to authenticated;
grant execute on function public.get_my_company_ids() to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.has_company_permission(uuid, text) to authenticated;
grant execute on function public.is_company_super_admin(uuid) to authenticated;
