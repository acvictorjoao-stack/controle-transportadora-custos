import {resolve} from 'node:path';

import {
  HML_AUTHORIZED_PROJECT_REF,
  HML_COMPANY_SLUG,
  HML_DESTRUCTIVE_ADVISORY_LOCK_SQL,
  HML_EXPECTED_PROJECT_REF_GUC,
} from '../constants';

/** Escopo fixo — não alterar sem nova autorização humana e novo manifesto. */
export const HML_HARD_DELETE_COMPANY_SLUG = HML_COMPANY_SLUG;
export const HML_HARD_DELETE_COMPANY_ID =
  '451a7940-a56b-425f-ae5f-e493d536591f' as const;
export const HML_HARD_DELETE_PROJECT_REF = HML_AUTHORIZED_PROJECT_REF;

export const HML_HARD_DELETE_EXPECTED_ENTRY_COUNT = 43 as const;

export const HML_HARD_DELETE_MANIFEST_PATH = resolve(
  process.cwd(),
  '.hml-seed/evidence-2026-10-20-partial/manifest.json',
);

/**
 * Migration local preparada — NÃO aplicar automaticamente.
 * A execução remota exige: migration aplicada + triplo gate + flag de código
 * + GRANT EXECUTE reabilitado (revogado nesta migration).
 */
export const HML_HARD_DELETE_MIGRATION_PATH = resolve(
  process.cwd(),
  'supabase/migrations/102_hml_hard_delete_manifest_43.sql',
);

export const HML_HARD_DELETE_RPC = 'hml_hard_delete_manifest_43' as const;

/** Confirmação exigida pelo argumento da função SQL e pelo env do CLI. */
export const HML_HARD_DELETE_CONFIRM_VALUE = 'HARD_DELETE_MANIFEST_43' as const;
export const HML_HARD_DELETE_CONFIRM_ENV = 'HML_HARD_DELETE_CONFIRM' as const;
export const HML_HARD_DELETE_AUTHORIZE_FLAG =
  '--i-authorize-hard-delete-of-manifest-43' as const;

/**
 * Trava de código: enquanto false, o CLI recusa qualquer chamada RPC,
 * mesmo com flags de autorização. Só mudar após revisão humana explícita.
 */
export const HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED = false as const;

/**
 * Portal Master acting NÃO autoriza hard-delete nesta versão.
 * Um mecanismo Master formal exigiria nova migration + autorização humana.
 */
export const HML_HARD_DELETE_PORTAL_MASTER_AUTHORIZED = false as const;

/**
 * GUC de sessão exigida pela função.
 * Gate operacional — NÃO autenticação do chamador (nem via PostgREST nem SQL).
 */
export const HML_HARD_DELETE_SESSION_GUC = 'app.allow_hml_hard_delete' as const;

/**
 * GUC de defesa em profundidade para project-ref (paridade com 103).
 * O CLI deve setá-la só depois de validar o host de NEXT_PUBLIC_SUPABASE_URL.
 * PostgreSQL não prova o project-ref Supabase; um operador no projeto errado
 * ainda pode setar esta GUC manualmente.
 */
export const HML_HARD_DELETE_PROJECT_REF_GUC = HML_EXPECTED_PROJECT_REF_GUC;

/** Trecho SQL do advisory lock compartilhado com company-reset (103). */
export const HML_HARD_DELETE_ADVISORY_LOCK_SQL =
  HML_DESTRUCTIVE_ADVISORY_LOCK_SQL;

/** Tabela de auditoria dedicada (não portal_audit_logs). */
export const HML_HARD_DELETE_AUDIT_TABLE =
  'hml_hard_delete_audit_events' as const;

/** Ordem de DELETE físico (filhos → pais). Histórico tratado à parte. */
export const HML_HARD_DELETE_TABLE_ORDER = [
  'customer_contract_items',
  'customer_addresses',
  'customer_contacts',
  'customer_contracts',
  'customers',
  'suppliers',
  'vehicles',
  'cost_centers',
  'positions',
  'branches',
] as const;

export type HmlHardDeleteTable = (typeof HML_HARD_DELETE_TABLE_ORDER)[number];

export const HML_HARD_DELETE_ALLOWED_TABLES = new Set<string>(
  HML_HARD_DELETE_TABLE_ORDER,
);

/** Códigos esperados por key do manifesto — rejeitam HQ / is_system. */
export const HML_HARD_DELETE_EXPECTED_CODES = {
  branches: {
    imp: 'HML-IMP',
    the: 'HML-THE',
  },
  cost_centers: {
    'cc-frota': 'HML-FROTA',
    'cc-manut': 'HML-MANUT',
    'cc-fin': 'HML-FIN',
  },
  positions: {
    'pos-analista': 'HML_ANALISTA_OPS',
    'pos-aux': 'HML_AUX_LOG',
  },
} as const;

/**
 * Filhos CASCADE inventariados antes do 1º DELETE.
 * `allowlistOnly`: IDs vivos sob o pai devem ⊆ allowlist do manifesto.
 * `mustBeEmpty`: qualquer linha sob o pai aborta (fora dos 43).
 * History é tratado em history-validate (único CASCADE não-allowlist permitido).
 */
export const HML_HARD_DELETE_CASCADE_CHILD_CHECKS = [
  {
    childTable: 'customer_addresses',
    parentTable: 'customers',
    parentColumn: 'customer_id',
    mode: 'allowlistOnly',
    allowlistTable: 'customer_addresses',
  },
  {
    childTable: 'customer_contacts',
    parentTable: 'customers',
    parentColumn: 'customer_id',
    mode: 'allowlistOnly',
    allowlistTable: 'customer_contacts',
  },
  {
    childTable: 'customer_contracts',
    parentTable: 'customers',
    parentColumn: 'customer_id',
    mode: 'allowlistOnly',
    allowlistTable: 'customer_contracts',
  },
  {
    childTable: 'customer_contract_items',
    parentTable: 'customer_contracts',
    parentColumn: 'contract_id',
    mode: 'allowlistOnly',
    allowlistTable: 'customer_contract_items',
  },
  {
    childTable: 'customer_documents',
    parentTable: 'customers',
    parentColumn: 'customer_id',
    mode: 'mustBeEmpty',
  },
  {
    childTable: 'customer_documents',
    parentTable: 'customer_contracts',
    parentColumn: 'contract_id',
    mode: 'mustBeEmpty',
  },
  {
    childTable: 'vehicle_documents',
    parentTable: 'vehicles',
    parentColumn: 'vehicle_id',
    mode: 'mustBeEmpty',
  },
] as const;

/**
 * Escopo das contagens de FK no SQL: global (sem filtrar só a empresa HML).
 * Pendência remota: confirmar zero hits cross-tenant com SELECT readonly.
 */
export const HML_HARD_DELETE_EXTERNAL_REF_SCOPE = 'global' as const;

/** Tabelas H1 cujo branch_id SET NULL deve ser pré-checado (067). */
export const HML_HARD_DELETE_CUSTOMER_BRANCH_REF_TABLES = [
  'customer_addresses',
  'customer_contacts',
  'customer_contracts',
  'customer_contract_items',
  'customer_documents',
  'customer_history',
] as const;

/**
 * Tabelas com FK SET NULL / RESTRICT para os alvos do manifesto.
 * Contagem total (incl. soft-deleted), escopo global. Hit após exclude → abort.
 */
export const HML_HARD_DELETE_EXTERNAL_REF_CHECKS = [
  {parent: 'branches', table: 'company_members', column: 'default_branch_id'},
  {parent: 'branches', table: 'vehicles', column: 'branch_id'},
  {parent: 'branches', table: 'customers', column: 'branch_id'},
  // H1 — 067_customers.sql ON DELETE SET NULL
  {parent: 'branches', table: 'customer_addresses', column: 'branch_id'},
  {parent: 'branches', table: 'customer_contacts', column: 'branch_id'},
  {parent: 'branches', table: 'customer_contracts', column: 'branch_id'},
  {parent: 'branches', table: 'customer_contract_items', column: 'branch_id'},
  {parent: 'branches', table: 'customer_documents', column: 'branch_id'},
  {parent: 'branches', table: 'customer_history', column: 'branch_id'},
  {parent: 'branches', table: 'drivers', column: 'branch_id'},
  {parent: 'branches', table: 'employees', column: 'branch_id'},
  {parent: 'branches', table: 'payroll_expenses', column: 'branch_id'},
  {parent: 'branches', table: 'routes', column: 'branch_id'},
  {parent: 'branches', table: 'financial_entries', column: 'branch_id'},
  {parent: 'branches', table: 'financial_categories', column: 'branch_id'},
  {parent: 'branches', table: 'financial_cost_centers', column: 'branch_id'},
  {parent: 'branches', table: 'financial_documents', column: 'branch_id'},
  {parent: 'branches', table: 'financial_history', column: 'branch_id'},
  {parent: 'branches', table: 'fuel_records', column: 'branch_id'},
  {parent: 'branches', table: 'fuel_history', column: 'branch_id'},
  {parent: 'branches', table: 'fuel_documents', column: 'branch_id'},
  {parent: 'branches', table: 'maintenance_records', column: 'branch_id'},
  {parent: 'branches', table: 'maintenance_schedules', column: 'branch_id'},
  {parent: 'branches', table: 'maintenance_history', column: 'branch_id'},
  {parent: 'branches', table: 'maintenance_documents', column: 'branch_id'},
  {parent: 'branches', table: 'maintenance_parts', column: 'branch_id'},
  {parent: 'branches', table: 'maintenance_services', column: 'branch_id'},
  {parent: 'branches', table: 'tires', column: 'branch_id'},
  {parent: 'branches', table: 'tire_history', column: 'branch_id'},
  {parent: 'branches', table: 'tire_movements', column: 'branch_id'},
  {parent: 'branches', table: 'tire_inspections', column: 'branch_id'},
  {parent: 'branches', table: 'tire_recaps', column: 'branch_id'},
  {parent: 'branches', table: 'tire_documents', column: 'branch_id'},
  {parent: 'branches', table: 'trips', column: 'branch_id'},
  {parent: 'branches', table: 'trip_history', column: 'branch_id'},
  {parent: 'branches', table: 'trip_expenses', column: 'branch_id'},
  {parent: 'branches', table: 'trip_stops', column: 'branch_id'},
  {parent: 'branches', table: 'trip_occurrences', column: 'branch_id'},
  {parent: 'branches', table: 'trip_checklists', column: 'branch_id'},
  {parent: 'branches', table: 'trip_documents', column: 'branch_id'},
  {parent: 'branches', table: 'trip_locations', column: 'branch_id'},
  {parent: 'cost_centers', table: 'employees', column: 'cost_center_id'},
  {parent: 'cost_centers', table: 'payroll_expenses', column: 'cost_center_id'},
  {parent: 'cost_centers', table: 'financial_entries', column: 'cost_center_id'},
  {parent: 'positions', table: 'employees', column: 'position_id'},
  {parent: 'positions', table: 'payroll_expenses', column: 'position_id'},
  {parent: 'suppliers', table: 'financial_entries', column: 'supplier_id'},
  {parent: 'suppliers', table: 'fuel_records', column: 'supplier_id'},
  {parent: 'suppliers', table: 'maintenance_records', column: 'supplier_id'},
  {parent: 'suppliers', table: 'tires', column: 'supplier_id'},
  {parent: 'suppliers', table: 'tire_recaps', column: 'supplier_id'},
  {parent: 'customers', table: 'financial_entries', column: 'customer_id'},
  {parent: 'customers', table: 'routes', column: 'customer_id'},
  {parent: 'customers', table: 'trips', column: 'customer_id'},
  {
    parent: 'customer_contracts',
    table: 'financial_entries',
    column: 'customer_contract_id',
  },
  {parent: 'customer_contracts', table: 'trips', column: 'customer_contract_id'},
  {parent: 'vehicles', table: 'trips', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'fuel_records', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'fuel_history', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'fuel_documents', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'maintenance_records', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'maintenance_schedules', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'maintenance_history', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'maintenance_documents', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'maintenance_parts', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'maintenance_services', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'tires', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'tire_history', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'tire_movements', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'tire_inspections', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'tire_recaps', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'tire_documents', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'financial_entries', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'financial_categories', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'financial_cost_centers', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'financial_documents', column: 'vehicle_id'},
  {parent: 'vehicles', table: 'financial_history', column: 'vehicle_id'},
] as const;
