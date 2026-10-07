-- FleetControl — sessão autenticada não deixa a empresa sem Super Admin ativo
-- 098 impede members:write/invite de alterar role ou status de Super Admin.
-- 099 impede DELETE e deleted_at do último ativo, mas um Super Admin ou o
-- Portal Master ainda rebaixa (role_id) ou inativa (status) o último pela API.
-- Esta trava roda no fim da transação, depois de ver todas as linhas do
-- comando, e serializa o julgamento com um advisory lock por empresa.
-- auth.uid() nulo = service role (provisão, reset de demo): segue liberado.
-- Não altera policies nem os triggers das migrations 098 e 099.
-- A contagem depende da linha do papel Super Admin em public.roles, que a
-- policy roles_update_authorized libera inteira para roles:write; a segunda
-- parte desta migration trava essa linha para sessões autenticadas.

create or replace function public.membership_is_active_super_admin(
  p_role_id uuid,
  p_status public.entity_status,
  p_deleted_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_deleted_at is null
    and p_status = 'active'
    and exists (
      select 1
      from public.roles r
      where r.id = p_role_id
        and r.deleted_at is null
        and r.status = 'active'
        and r.is_system = true
        and r.name = 'Super Admin'
    );
$$;

comment on function public.membership_is_active_super_admin(uuid, public.entity_status, timestamptz) is
  'True quando a membership entra em count_active_super_admins: ativa, sem deleted_at, papel Super Admin de sistema ativo';

revoke all on function public.membership_is_active_super_admin(uuid, public.entity_status, timestamptz)
  from public, anon, authenticated;

create or replace function public.lock_company_super_admin_guard(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Lock transacional por empresa. Não trava linhas e não depende da ordem
  -- dos row locks do UPDATE/DELETE, então duas empresas diferentes não se
  -- esperam e duas alterações da mesma empresa não entram em deadlock.
  perform pg_advisory_xact_lock(
    hashtext('fleetcontrol.company_members.last_super_admin'),
    hashtext(p_company_id::text)
  );
end;
$$;

comment on function public.lock_company_super_admin_guard(uuid) is
  'Serializa a checagem do último Super Admin ativo dentro da transação, por empresa';

revoke all on function public.lock_company_super_admin_guard(uuid)
  from public, anon, authenticated;

create or replace function public.enforce_last_active_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return null;
  end if;

  if not public.membership_is_active_super_admin(old.role_id, old.status, old.deleted_at) then
    return null;
  end if;

  -- Ainda é Super Admin ativo da mesma empresa: rebaixar/inativar não ocorreu.
  if tg_op = 'UPDATE'
    and new.company_id is not distinct from old.company_id
    and public.membership_is_active_super_admin(new.role_id, new.status, new.deleted_at)
  then
    return null;
  end if;

  perform public.lock_company_super_admin_guard(old.company_id);

  if public.count_active_super_admins(old.company_id) < 1 then
    raise exception 'Não é possível remover ou rebaixar o último Super Admin ativo da empresa.'
      using errcode = '42501';
  end if;

  return null;
end;
$$;

comment on function public.enforce_last_active_super_admin() is
  'No fim da transação, impede sessão autenticada de deixar a empresa sem Super Admin ativo';

revoke all on function public.enforce_last_active_super_admin()
  from public, anon, authenticated;

create constraint trigger company_members_keep_last_active_super_admin
  after update or delete on public.company_members
  deferrable initially deferred
  for each row
  execute function public.enforce_last_active_super_admin();

-- Papel de sistema Super Admin: identificado por is_system + name, o mesmo
-- critério de is_company_super_admin e count_active_super_admins. Renomear,
-- desmarcar is_system, inativar, soft-delete, trocar company_id (098 compara
-- r.company_id, is_company_super_admin não) ou excluir a linha tira ou dá o
-- nível Super Admin a todos os membros sem passar pelos triggers de
-- company_members. Promover outro papel a Super Admin é o mesmo bypass ao
-- contrário. Só description e notes seguem editáveis pela API; a policy
-- roles_delete_authorized (is_system = false) é só RLS e não cobre isso.
-- Papéis customizados e os demais papéis de sistema não passam por aqui.

create or replace function public.protect_super_admin_system_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_protected boolean := old.is_system = true and old.name = 'Super Admin';
  v_new_protected boolean := false;
begin
  if tg_op = 'UPDATE' then
    v_new_protected := new.is_system = true and new.name = 'Super Admin';
  end if;

  if not (v_old_protected or v_new_protected) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  -- service role: seed, provisionamento, migração e reset de demo.
  if auth.uid() is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
    and (to_jsonb(new) - array['description', 'notes', 'updated_at', 'updated_by'])
      is not distinct from
      (to_jsonb(old) - array['description', 'notes', 'updated_at', 'updated_by'])
  then
    return new;
  end if;

  raise exception 'O papel de sistema Super Admin não pode ser renomeado, desativado, movido ou excluído.'
    using errcode = '42501';
end;
$$;

comment on function public.protect_super_admin_system_role() is
  'Impede sessão autenticada de alterar identidade, status, empresa ou exclusão do papel de sistema Super Admin';

revoke all on function public.protect_super_admin_system_role()
  from public, anon, authenticated;

create trigger roles_protect_super_admin_system_role
  before update or delete on public.roles
  for each row
  execute function public.protect_super_admin_system_role();
