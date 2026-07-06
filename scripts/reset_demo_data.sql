-- =============================================================================
-- FleetControl — Reset de dados operacionais (demo / homologação)
-- =============================================================================
--
-- Remove todos os dados de tenant (empresas e módulos operacionais), mantendo:
--   • Estrutura do banco (tabelas, enums, funções, triggers, RLS, migrations)
--   • Catálogo global `permissions` (seed RBAC da plataforma)
--   • `platform_settings` (configuração singleton do Portal Master)
--   • `portal_users` e perfis vinculados (operadores do Portal Master)
--   • Usuários `auth.users` dos operadores do Portal Master
--
-- Também remove (dados por empresa, recriados no provisionamento):
--   • `roles` e `role_permissions` — instâncias por tenant; o trigger
--     `on_company_created` + `seed_default_roles_for_company()` as recria.
--
-- Remove adicionalmente:
--   • `portal_audit_logs` (histórico operacional do portal)
--   • Objetos dos buckets de Storage operacionais (via bypass controlado do Supabase)
--   • `auth.users` / `profiles` de administradores e membros de empresas
--
-- NÃO altera: RLS, policies, migrations, buckets (apenas objetos dentro deles).
--
-- Storage: o Supabase bloqueia DELETE direto em storage.* por padrão
-- (trigger storage.protect_delete). Este script habilita o bypass apenas nesta
-- transação via set_config('storage.allow_delete_query', 'true', true).
--
-- Uso: executar no SQL Editor do Supabase como postgres / service_role.
--      Recomendado fazer backup antes em ambientes compartilhados.
--
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Storage — objetos operacionais (buckets permanecem)
--    Requer bypass explícito: storage.protect_delete() bloqueia DELETE direto.
-- ---------------------------------------------------------------------------

select set_config('storage.allow_delete_query', 'true', true);

delete from storage.objects
where bucket_id in (
  'company-logos',
  'vehicle-files',
  'driver-files',
  'trip-files',
  'fuel-files',
  'maintenance-files',
  'tire-files',
  'financial-files',
  'customer-files'
);

-- Supabase recente também mantém prefixes por bucket (se existir a tabela).
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'storage'
      and table_name = 'prefixes'
  ) then
    execute $sql$
      delete from storage.prefixes
      where bucket_id in (
        'company-logos',
        'vehicle-files',
        'driver-files',
        'trip-files',
        'fuel-files',
        'maintenance-files',
        'tire-files',
        'financial-files',
        'customer-files'
      )
    $sql$;
  end if;
end $$;

-- O bypass é local à transação (is_local=true) e expira no COMMIT — não precisa restaurar.

-- ---------------------------------------------------------------------------
-- 2. Dados operacionais — TRUNCATE atômico (ordem irrelevante entre si)
-- ---------------------------------------------------------------------------

truncate table
  -- Viagens
  public.trip_locations,
  public.trip_stops,
  public.trip_expenses,
  public.trip_checklists,
  public.trip_occurrences,
  public.trip_documents,
  public.trip_history,
  public.trips,
  -- Manutenções
  public.maintenance_parts,
  public.maintenance_services,
  public.maintenance_schedules,
  public.maintenance_documents,
  public.maintenance_history,
  public.maintenance_records,
  -- Pneus
  public.tire_documents,
  public.tire_recaps,
  public.tire_inspections,
  public.tire_movements,
  public.tire_history,
  public.tires,
  -- Financeiro
  public.financial_documents,
  public.financial_history,
  public.financial_entries,
  public.financial_cost_centers,
  public.financial_categories,
  -- Clientes
  public.customer_history,
  public.customer_documents,
  public.customer_contract_items,
  public.customer_contracts,
  public.customer_contacts,
  public.customer_addresses,
  public.customers,
  -- Abastecimentos
  public.fuel_documents,
  public.fuel_history,
  public.fuel_records,
  -- Veículos
  public.vehicle_documents,
  public.vehicle_history,
  public.vehicles,
  -- Motoristas
  public.driver_documents,
  public.driver_history,
  public.drivers,
  -- Integrações / tenant
  public.vision_providers,
  public.company_members,
  public.role_permissions,
  public.roles,
  public.branches,
  public.companies,
  -- Auditoria operacional do portal
  public.portal_audit_logs
restart identity cascade;

-- ---------------------------------------------------------------------------
-- 3. Auth — remover usuários de tenant (mantém operadores do Portal Master)
--    profiles é removido em cascade (profiles.id → auth.users ON DELETE CASCADE)
-- ---------------------------------------------------------------------------

delete from auth.users
where id not in (
  select profile_id
  from public.portal_users
);

-- ---------------------------------------------------------------------------
-- 4. Verificação pós-reset (opcional — revisar antes do COMMIT)
-- ---------------------------------------------------------------------------

do $$
declare
  v_companies        bigint;
  v_members          bigint;
  v_permissions      bigint;
  v_portal_users     bigint;
  v_portal_profiles  bigint;
  v_platform_settings bigint;
  v_storage_objects  bigint;
  v_tenant_auth      bigint;
begin
  select count(*) into v_companies from public.companies;
  select count(*) into v_members from public.company_members;
  select count(*) into v_permissions from public.permissions;
  select count(*) into v_portal_users from public.portal_users;
  select count(*) into v_portal_profiles
  from public.profiles p
  inner join public.portal_users pu on pu.profile_id = p.id;
  select count(*) into v_platform_settings from public.platform_settings;
  select count(*) into v_storage_objects
  from storage.objects
  where bucket_id in (
    'company-logos', 'vehicle-files', 'driver-files', 'trip-files',
    'fuel-files', 'maintenance-files', 'tire-files', 'financial-files',
    'customer-files'
  );
  select count(*) into v_tenant_auth
  from auth.users u
  where u.id not in (select profile_id from public.portal_users);

  raise notice '--- FleetControl reset_demo_data ---';
  raise notice 'companies:           % (esperado: 0)', v_companies;
  raise notice 'company_members:     % (esperado: 0)', v_members;
  raise notice 'permissions:         % (preservado)', v_permissions;
  raise notice 'portal_users:        % (preservado)', v_portal_users;
  raise notice 'portal profiles:     % (preservado)', v_portal_profiles;
  raise notice 'platform_settings:   % (preservado)', v_platform_settings;
  raise notice 'storage objects:     % (esperado: 0)', v_storage_objects;
  raise notice 'tenant auth.users:   % (esperado: 0)', v_tenant_auth;

  if v_companies > 0 or v_members > 0 or v_storage_objects > 0 or v_tenant_auth > 0 then
    raise exception 'Reset incompleto — revise os contadores acima antes de confirmar.';
  end if;

  if v_permissions = 0 then
    raise exception 'Catálogo permissions foi apagado — abortando.';
  end if;

  if v_portal_users = 0 then
    raise warning 'Nenhum portal_users encontrado — Portal Master sem operadores.';
  end if;
end $$;

commit;

-- ---------------------------------------------------------------------------
-- 5. Resumo visível no SQL Editor (execute junto com o bloco acima)
-- ---------------------------------------------------------------------------

select
  'Reset concluído com sucesso' as status,
  (select count(*) from public.companies) as companies,
  (select count(*) from public.company_members) as company_members,
  (select count(*) from public.permissions) as permissions,
  (select count(*) from public.portal_users) as portal_users,
  (select count(*) from public.platform_settings) as platform_settings,
  (
    select count(*)
    from storage.objects
    where bucket_id in (
      'company-logos', 'vehicle-files', 'driver-files', 'trip-files',
      'fuel-files', 'maintenance-files', 'tire-files', 'financial-files',
      'customer-files'
    )
  ) as storage_objects,
  (
    select count(*)
    from auth.users u
    where u.id not in (select profile_id from public.portal_users)
  ) as tenant_auth_users;

-- =============================================================================
-- Pós-reset: provisione uma nova empresa pelo Portal Master (/master/empresas).
-- Roles e role_permissions da empresa serão recriados automaticamente pelo trigger.
-- =============================================================================
