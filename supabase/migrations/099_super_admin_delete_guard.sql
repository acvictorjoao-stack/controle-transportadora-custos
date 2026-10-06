-- FleetControl — DELETE de Super Admin não passa por members:write
-- A policy company_members_delete_authorized (012) permanece: members:write
-- continua apagando membro comum; Super Admin e Portal Master atuando também.
-- O trigger da 098 só cobre INSERT/UPDATE de role e status. Ficavam de fora o
-- DELETE da linha e o soft-delete (deleted_at), ambos suficientes para derrubar
-- is_company_super_admin.
-- auth.uid() nulo = service role (reset de demo, provisionamento): segue
-- liberado, inclusive para remover o último Super Admin ativo.
-- Super Admin e Portal Master atuando continuam podendo excluir outro Super
-- Admin, desde que reste um Super Admin ativo — a mesma regra da aplicação.

create or replace function public.protect_super_admin_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_is_super boolean;
  v_old_is_super boolean := false;
  v_protected boolean;
begin
  select exists (
    select 1
    from public.roles r
    where r.id = new.role_id
      and r.company_id = new.company_id
      and r.name = 'Super Admin'
      and r.is_system = true
      and r.deleted_at is null
  )
  into v_new_is_super;

  if tg_op = 'UPDATE' then
    select exists (
      select 1
      from public.roles r
      where r.id = old.role_id
        and r.name = 'Super Admin'
        and r.is_system = true
        and r.deleted_at is null
    )
    into v_old_is_super;

    v_protected :=
      (v_new_is_super and new.role_id is distinct from old.role_id)
      or (
        v_old_is_super
        and (
          new.role_id is distinct from old.role_id
          or new.status is distinct from old.status
          or new.deleted_at is distinct from old.deleted_at
        )
      );
  else
    v_protected := v_new_is_super;
  end if;

  if not v_protected then
    return new;
  end if;

  if public.actor_can_manage_super_admin(new.company_id) then
    -- Soft-delete do último Super Admin ativo. Service role (uid nulo) passa.
    if tg_op = 'UPDATE'
      and auth.uid() is not null
      and v_old_is_super
      and old.deleted_at is null
      and new.deleted_at is not null
      and old.status = 'active'
      and public.count_active_super_admins(old.company_id) = 1
      and exists (
        select 1
        from public.roles r
        where r.id = old.role_id
          and r.company_id = old.company_id
          and r.name = 'Super Admin'
          and r.is_system = true
          and r.deleted_at is null
          and r.status = 'active'
      )
    then
      raise exception 'Não é possível remover ou rebaixar o último Super Admin ativo da empresa.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  -- complete_company_provisioning: OWNER ainda sem contexto de atuação.
  if tg_op = 'INSERT'
    and public.is_portal_owner()
    and not public.company_has_active_members(new.company_id)
  then
    return new;
  end if;

  raise exception 'Somente um Super Admin pode atribuir o perfil Super Admin ou alterar uma conta Super Admin.'
    using errcode = '42501';
end;
$$;

comment on function public.protect_super_admin_membership() is
  'Impede insert/update de role, status ou deleted_at de Super Admin por members:write ou members:invite';

revoke all on function public.protect_super_admin_membership()
  from public, anon, authenticated;

create or replace function public.protect_super_admin_membership_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_super boolean;
  v_is_active_super boolean;
begin
  select exists (
    select 1
    from public.roles r
    where r.id = old.role_id
      and r.company_id = old.company_id
      and r.name = 'Super Admin'
      and r.is_system = true
      and r.deleted_at is null
  )
  into v_is_super;

  -- Membro comum: a policy company_members_delete_authorized segue decidindo.
  if not v_is_super then
    return old;
  end if;

  -- service role: fluxos legítimos, inclusive o último Super Admin.
  if auth.uid() is null then
    return old;
  end if;

  if not public.actor_can_manage_super_admin(old.company_id) then
    raise exception 'Somente um Super Admin pode atribuir o perfil Super Admin ou alterar uma conta Super Admin.'
      using errcode = '42501';
  end if;

  select
    old.deleted_at is null
    and old.status = 'active'
    and exists (
      select 1
      from public.roles r
      where r.id = old.role_id
        and r.company_id = old.company_id
        and r.name = 'Super Admin'
        and r.is_system = true
        and r.deleted_at is null
        and r.status = 'active'
    )
  into v_is_active_super;

  if v_is_active_super
    and public.count_active_super_admins(old.company_id) = 1
  then
    raise exception 'Não é possível remover ou rebaixar o último Super Admin ativo da empresa.'
      using errcode = '42501';
  end if;

  return old;
end;
$$;

comment on function public.protect_super_admin_membership_delete() is
  'Impede DELETE de Super Admin por members:write/invite e a exclusão do último Super Admin ativo';

revoke all on function public.protect_super_admin_membership_delete()
  from public, anon, authenticated;

create trigger company_members_protect_super_admin_delete
  before delete on public.company_members
  for each row
  execute function public.protect_super_admin_membership_delete();
