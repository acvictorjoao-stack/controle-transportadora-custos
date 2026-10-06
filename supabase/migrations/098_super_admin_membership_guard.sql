-- FleetControl — Super Admin não é um perfil atribuível por members:write/invite
-- O Administrador recebe o catálogo inteiro de permissões (089), mas Super Admin
-- é outro nível: is_company_super_admin. Sem este guard, quem tem members:write
-- altera role/status direto na API, e quem tem members:invite insere um Super Admin.
-- O service role (auth.uid() nulo) continua liberado: a Server Action é quem
-- identifica o usuário da sessão antes de chamar o admin client.
-- O Portal Master atuando na empresa passa por is_company_super_admin (090).
-- O primeiro Super Admin da provisão passa: OWNER, empresa ainda sem membros.

create or replace function public.actor_can_manage_super_admin(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is null
    or public.is_company_super_admin(p_company_id);
$$;

comment on function public.actor_can_manage_super_admin(uuid) is
  'True para service role ou para Super Admin / Portal Master atuando nesta empresa';

revoke all on function public.actor_can_manage_super_admin(uuid)
  from public, anon, authenticated;

create or replace function public.protect_super_admin_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_is_super boolean;
  v_old_is_super boolean;
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
        )
      );
  else
    v_protected := v_new_is_super;
  end if;

  if not v_protected then
    return new;
  end if;

  if public.actor_can_manage_super_admin(new.company_id) then
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
  'Impede insert/update de role ou status de Super Admin por members:write ou members:invite';

revoke all on function public.protect_super_admin_membership()
  from public, anon, authenticated;

create trigger company_members_protect_super_admin
  before insert or update on public.company_members
  for each row
  execute function public.protect_super_admin_membership();

-- profiles:write deixa o Administrador alterar o e-mail exibido de qualquer par.
-- A troca do e-mail de login (auth.users) só existe na Server Action, via service role.
create or replace function public.protect_super_admin_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not distinct from old.email then
    return new;
  end if;

  if exists (
    select 1
    from public.company_members cm
    inner join public.roles r
      on r.id = cm.role_id
    where cm.profile_id = new.id
      and cm.deleted_at is null
      and r.name = 'Super Admin'
      and r.is_system = true
      and r.deleted_at is null
      and not public.actor_can_manage_super_admin(cm.company_id)
  ) then
    raise exception 'Somente um Super Admin pode atribuir o perfil Super Admin ou alterar uma conta Super Admin.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.protect_super_admin_profile_email() is
  'Impede members com profiles:write de alterar o e-mail de um Super Admin pela API';

revoke all on function public.protect_super_admin_profile_email()
  from public, anon, authenticated;

create trigger profiles_protect_super_admin_email
  before update on public.profiles
  for each row
  execute function public.protect_super_admin_profile_email();
