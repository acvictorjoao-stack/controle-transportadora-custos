import {resolve} from 'node:path';

import {
  HML_AUTHORIZED_PROJECT_REF,
  HML_COMPANY_SLUG,
  HML_DESTRUCTIVE_ADVISORY_LOCK_SQL,
  HML_EMPTY_MODULE_TABLES,
  HML_EXPECTED_PROJECT_REF_GUC,
} from '../constants';

/** Escopo fixo — não alterar sem nova autorização humana. */
export const HML_COMPANY_RESET_COMPANY_SLUG = HML_COMPANY_SLUG;
export const HML_COMPANY_RESET_COMPANY_ID =
  '451a7940-a56b-425f-ae5f-e493d536591f' as const;
export const HML_COMPANY_RESET_PROJECT_REF = HML_AUTHORIZED_PROJECT_REF;

/**
 * Migration local preparada — NÃO aplicar automaticamente.
 * Preferível ao hard-delete dos 43 IDs para reset completo da base fictícia.
 */
export const HML_COMPANY_RESET_MIGRATION_PATH = resolve(
  process.cwd(),
  'supabase/migrations/103_hml_company_business_reset.sql',
);

export const HML_COMPANY_RESET_RPC = 'hml_reset_company_business_data' as const;

export const HML_COMPANY_RESET_CONFIRM_VALUE =
  'HML_RESET_COMPANY_BUSINESS' as const;
export const HML_COMPANY_RESET_CONFIRM_ENV = 'HML_COMPANY_RESET_CONFIRM' as const;
export const HML_COMPANY_RESET_AUTHORIZE_FLAG =
  '--i-authorize-hml-company-business-reset' as const;

/**
 * Trava de código: enquanto false, o CLI recusa qualquer chamada RPC.
 * Independente de HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED (também false).
 */
export const HML_COMPANY_RESET_REMOTE_EXECUTION_ENABLED = false as const;

export const HML_COMPANY_RESET_PORTAL_MASTER_AUTHORIZED = false as const;

/** GUC operacional — NÃO autenticação. */
export const HML_COMPANY_RESET_SESSION_GUC =
  'app.allow_hml_company_reset' as const;

/**
 * GUC de defesa em profundidade para project-ref.
 * O CLI deve setá-la só depois de validar o host de NEXT_PUBLIC_SUPABASE_URL.
 * PostgreSQL não prova o project-ref Supabase; um operador no projeto errado
 * ainda pode setar esta GUC manualmente.
 */
export const HML_COMPANY_RESET_PROJECT_REF_GUC = HML_EXPECTED_PROJECT_REF_GUC;

/** Trecho SQL do advisory lock compartilhado com hard-delete (102). */
export const HML_COMPANY_RESET_ADVISORY_LOCK_SQL =
  HML_DESTRUCTIVE_ADVISORY_LOCK_SQL;

export const HML_COMPANY_RESET_AUDIT_TABLE =
  'hml_company_reset_audit_events' as const;

/**
 * Critério de identificação: todo dado de negócio com company_id = empresa HML,
 * EXCETO a lista de preservação. Inclui soft-deleted (hard DELETE).
 */
export const HML_COMPANY_RESET_IDENTIFICATION =
  'company_id_equals_hml_except_preserved' as const;

/**
 * Tabelas-base apagadas por inteiro (todas as linhas da empresa, incl. arquivadas).
 * `payroll_people` é VIEW (091) — não entra na lista.
 */
export const HML_COMPANY_RESET_FULL_DELETE_TABLES = [
  'financial_history',
  'financial_documents',
  'financial_entries',
  'payroll_expenses',
  'employees',
  'fuel_history',
  'fuel_documents',
  'fuel_records',
  'maintenance_parts',
  'maintenance_services',
  'maintenance_schedules',
  'maintenance_documents',
  'maintenance_history',
  'maintenance_records',
  'tire_documents',
  'tire_recaps',
  'tire_inspections',
  'tire_movements',
  'tire_history',
  'tires',
  'trip_locations',
  'trip_stops',
  'trip_expenses',
  'trip_checklists',
  'trip_occurrences',
  'trip_documents',
  'trip_history',
  'trips',
  'route_documents',
  'route_history',
  'routes',
  'customer_history',
  'customer_documents',
  'customer_contract_items',
  'customer_contracts',
  'customer_contacts',
  'customer_addresses',
  'customers',
  'suppliers',
  'driver_documents',
  'driver_history',
  'drivers',
  'vehicle_documents',
  'vehicle_history',
  'vehicles',
  'vision_providers',
] as const;

/**
 * Tabelas com delete seletivo (preserva is_system / HQ).
 * Ordem: após full-delete; filiais por último após reassign de default_branch.
 */
export const HML_COMPANY_RESET_SELECTIVE_DELETE = [
  {table: 'positions', predicate: 'is_system = false'},
  {table: 'cost_centers', predicate: 'is_system = false'},
  {table: 'financial_cost_centers', predicate: 'is_system = false'},
  {table: 'financial_categories', predicate: 'is_system = false'},
  {table: 'branches', predicate: 'is_headquarters = false'},
] as const;

/** Nunca apagar / nunca alterar nestas operações. */
export const HML_COMPANY_RESET_PRESERVE = [
  'companies (row da empresa-alvo)',
  'auth.users / profiles / vínculos de autenticação',
  'company_members (memberships)',
  'roles / role_permissions',
  'branches HQ (is_headquarters = true)',
  'cost_centers is_system = true',
  'positions is_system = true',
  'financial_categories is_system = true',
  'financial_cost_centers is_system = true',
  'portal / settings / integrações compartilhadas',
  'dados de outras empresas',
  'schema, funções e policies compartilhadas',
  'Storage fora do escopo HML (seed não cria objetos)',
] as const;

/** Empty-guards que o seed exige verdes após o reset. */
export const HML_COMPANY_RESET_SEED_EMPTY_GUARDS = HML_EMPTY_MODULE_TABLES;

/**
 * Pais com FK SET NULL/RESTRICT por id — pré-check CROSS-TENANT obrigatório
 * antes do DELETE (escopo global; abort se outra empresa referencia).
 * Espelha a cobertura de HML_HARD_DELETE_EXTERNAL_REF_CHECKS + driver_id.
 */
export const HML_COMPANY_RESET_CROSS_TENANT_PARENT_CHECKS = [
  {parent: 'branches', column: 'id', via: 'non_hq_branch_ids'},
  {parent: 'cost_centers', column: 'id', via: 'non_system_cost_center_ids'},
  {parent: 'positions', column: 'id', via: 'non_system_position_ids'},
  {parent: 'suppliers', column: 'id', via: 'all_company_supplier_ids'},
  {parent: 'customers', column: 'id', via: 'all_company_customer_ids'},
  {parent: 'customer_contracts', column: 'id', via: 'all_company_contract_ids'},
  {parent: 'vehicles', column: 'id', via: 'all_company_vehicle_ids'},
  {parent: 'drivers', column: 'id', via: 'all_company_driver_ids'},
  {parent: 'trips', column: 'id', via: 'all_company_trip_ids'},
  {parent: 'routes', column: 'id', via: 'all_company_route_ids'},
  {parent: 'fuel_records', column: 'id', via: 'all_company_fuel_ids'},
  {parent: 'maintenance_records', column: 'id', via: 'all_company_maint_ids'},
  {parent: 'tires', column: 'id', via: 'all_company_tire_ids'},
] as const;

/**
 * Tabelas public com company_id que o reset deve full-delete OU selective-delete
 * OU preservar. Usado por testes estruturais (não substring).
 */
export const HML_COMPANY_RESET_PRESERVE_COMPANY_ID_TABLES = [
  'company_members',
  'roles',
  'role_permissions',
  'portal_acting_companies',
] as const;
