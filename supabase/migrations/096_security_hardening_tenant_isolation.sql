-- FleetControl — Hardening de isolamento multiempresa (checklist final #1)
-- Não desabilita RLS nem afrouxa policies: remove caminhos de acesso indevido.

-- ---------------------------------------------------------------------------
-- 1. Bootstrap de onboarding (012)
-- ---------------------------------------------------------------------------
-- Desde 020 só o Portal Master cria empresas e o primeiro membro entra pela RPC
-- complete_company_provisioning (SECURITY DEFINER). As policies de bootstrap
-- deixavam qualquer usuário autenticado listar empresas sem membros (provisão
-- em andamento, provisão com erro, empresas excluídas) e se inserir como
-- Super Admin delas.

drop policy if exists companies_select_bootstrap on public.companies;
drop policy if exists roles_select_bootstrap on public.roles;
drop policy if exists branches_select_bootstrap on public.branches;

drop policy if exists company_members_insert_authorized on public.company_members;

create policy company_members_insert_authorized
  on public.company_members
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'members:write')
    or public.has_company_permission(company_id, 'members:invite')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- 2. RPCs SECURITY DEFINER expostas a anon
-- ---------------------------------------------------------------------------
-- O Supabase concede EXECUTE em funções novas a PUBLIC e, por default
-- privileges, explicitamente a anon. Os guards "auth.uid() is not null and ..."
-- tratam anon como contexto de sistema, então anon semeava qualquer empresa.

-- Reaplica as permissões padrão dos papéis (desfaz cortes feitos no Portal
-- Master). Só o trigger handle_new_company (executa como owner) precisa dela.
revoke all on function public.seed_default_roles_for_company(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.seed_default_roles_for_company(uuid, uuid)
  to service_role;

revoke all on function public.seed_financial_defaults_for_company(uuid, uuid)
  from public, anon;
grant execute on function public.seed_financial_defaults_for_company(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.seed_cost_centers_for_company(uuid, uuid)
  from public, anon;
grant execute on function public.seed_cost_centers_for_company(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.seed_positions_for_company(uuid, uuid)
  from public, anon;
grant execute on function public.seed_positions_for_company(uuid, uuid)
  to authenticated, service_role;

-- Migração de dados de todas as empresas (085); não é chamada pela aplicação.
revoke all on function public.migrate_free_text_suppliers()
  from public, anon, authenticated;

-- Só é chamada pelos triggers de pneus, todos SECURITY DEFINER.
revoke all on function public.refresh_tire_metrics(uuid)
  from public, anon, authenticated;

revoke all on function public.count_active_super_admins(uuid)
  from public, anon;
grant execute on function public.count_active_super_admins(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Colunas de plataforma em companies
-- ---------------------------------------------------------------------------
-- companies_update_authorized (012) libera a linha inteira para companies:write.
-- Status, exclusão, provisionamento e plano são decisões do Portal Master: sem
-- este guard o tenant reativava empresa suspensa ou trocava o próprio plano
-- (limites de veículos/usuários) direto pela API.

create or replace function public.protect_company_platform_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() nulo = service_role / migrations.
  if auth.uid() is null or public.is_portal_owner() then
    return new;
  end if;

  if new.status is distinct from old.status
    or new.deleted_at is distinct from old.deleted_at
    or new.slug is distinct from old.slug
    or new.provision_status is distinct from old.provision_status
    or new.provisioned_at is distinct from old.provisioned_at
    or new.provision_error is distinct from old.provision_error
    or (new.settings -> 'plan_slug') is distinct from (old.settings -> 'plan_slug')
    or (new.settings -> 'provision_history') is distinct from (old.settings -> 'provision_history')
  then
    raise exception 'somente o Portal Master pode alterar status, plano ou provisionamento da empresa'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.protect_company_platform_columns() is
  'Bloqueia alteração de status/plano/provisionamento de companies fora do Portal Master';

create trigger companies_protect_platform_columns
  before update on public.companies
  for each row
  execute function public.protect_company_platform_columns();

-- ---------------------------------------------------------------------------
-- 4. Storage — leitura via API restrita à empresa dona da pasta
-- ---------------------------------------------------------------------------
-- As policies *_select eram "to public using (bucket_id = ...)": qualquer
-- pessoa com a anon key listava e baixava os arquivos de todas as empresas
-- (paths {company_id}/{entity_id}/...). Os buckets continuam public: o
-- download por URL pública não passa por RLS e segue funcionando para quem já
-- tem a URL gravada no registro.

create or replace function public.storage_object_company_id(p_name text)
returns uuid
language sql
stable
set search_path = public
as $$
  -- CASE garante que o cast só roda depois da validação do formato.
  select case
    when (storage.foldername(p_name))[1]
      ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_name))[1])::uuid
  end;
$$;

comment on function public.storage_object_company_id(text) is
  'company_id do primeiro segmento do path do objeto ({company_id}/...), ou null';

grant execute on function public.storage_object_company_id(text)
  to authenticated, service_role;

drop policy if exists company_logos_select on storage.objects;
create policy company_logos_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'company-logos'
    and public.is_company_member(public.storage_object_company_id(name))
  );

drop policy if exists vehicle_files_select on storage.objects;
create policy vehicle_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'vehicle-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'vehicles:read')
  );

drop policy if exists driver_files_select on storage.objects;
create policy driver_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'driver-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'drivers:read')
  );

drop policy if exists trip_files_select on storage.objects;
create policy trip_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'trip-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'trips:read')
  );

drop policy if exists fuel_files_select on storage.objects;
create policy fuel_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'fuel-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'fuel:read')
  );

drop policy if exists maintenance_files_select on storage.objects;
create policy maintenance_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'maintenance-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'maintenance:read')
  );

drop policy if exists tire_files_select on storage.objects;
create policy tire_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'tire-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'tires:read')
  );

drop policy if exists financial_files_select on storage.objects;
create policy financial_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'financial-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'financeiro:read')
  );

drop policy if exists customer_files_select on storage.objects;
create policy customer_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'customer-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'customers:read')
  );
