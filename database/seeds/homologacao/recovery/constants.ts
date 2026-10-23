import {resolve} from 'node:path';

export const HML_RECOVERY_MANIFEST_PATH = resolve(
  process.cwd(),
  '.hml-seed/evidence-2026-10-20-partial/manifest.json',
);

export const HML_RECOVERY_CHECKPOINT_PATH = resolve(
  process.cwd(),
  '.hml-seed/recovery-partial-log.jsonl',
);

export const HML_RECOVERY_EXPECTED_ENTRY_COUNT = 43;
export const HML_RECOVERY_CHECKPOINT_VERSION = 1 as const;

export const HML_RECOVERY_AUTHORIZE_FLAG = '--i-authorize-soft-delete-of-manifest-43';
export const HML_RECOVERY_CONFIRM_ENV = 'HML_RECOVERY_CONFIRM';
export const HML_RECOVERY_CONFIRM_VALUE = 'SOFT_DELETE_MANIFEST_43';

/** Ordem de soft-delete (filhos → pais; filiais por último). */
export const HML_RECOVERY_TABLE_ORDER = [
  'customer_contract_items',
  'customer_contracts',
  'customer_contacts',
  'customer_addresses',
  'customers',
  'suppliers',
  'vehicles',
  'cost_centers',
  'positions',
  'branches',
] as const;

export type HmlRecoveryTable = (typeof HML_RECOVERY_TABLE_ORDER)[number];

export const HML_RECOVERY_ALLOWED_TABLES = new Set<string>(HML_RECOVERY_TABLE_ORDER);

/**
 * Vínculos consultados pelo recovery.
 *
 * Contagens de filial / cadastro usam somente linhas ativas (`deleted_at IS NULL`).
 *
 * Referências já soft-deletadas (`deleted_at NOT NULL`) — NÃO bloqueiam:
 * justificativa: soft-delete na app ignora FKs “fantasma” em linhas arquivadas;
 * hard-delete RESTRICT/SET NULL não é o caminho deste recovery. Ghosts arquivados
 * permanecem apontando ao UUID do pai.
 *
 * Filiais — tabelas com company_id+branch_id+deleted_at (ver BRANCH_REF_TABLES):
 * cadastros do plano, ops (trips/fuel/maintenance/tires filhos), financeiro
 * (entries/categories/cost_centers/documents), customer_documents, fuel_documents.
 * `company_members.default_branch_id` à parte.
 * excludeIds apenas para tabelas ∈ HML_RECOVERY_TABLE_ORDER.
 *
 * Fora do pré-check de filiais:
 * - suppliers (sem branch_id), vehicle_documents (sem branch_id)
 * - *_history (auditoria; não tratados como vínculo operacional)
 * - storage objects / paths / RPC/views
 */
export const HML_RECOVERY_LINK_COVERAGE_NOTES = {
  verified: [
    'suppliers: financial_entries, maintenance_records, tires, tire_recaps, fuel_records (não branch_id)',
    'cost_centers: financial_entries, employees(cost_center_id)',
    'positions: payroll_expenses, employees(position_id)',
    'branches: company_members.default_branch_id + BRANCH_REF_TABLES (ops/docs/financeiro; sem suppliers; sem *_history)',
  ],
  archivedRefsPolicy:
    'Refs com deleted_at NOT NULL não bloqueiam (paridade soft-delete da app; ghosts FK aceitos).',
  notQueried: [
    'suppliers.branch_id (coluna inexistente)',
    'vehicle_documents (sem branch_id)',
    'tabelas *_history (snapshots de auditoria)',
    'documentos/storage paths fora das tabelas listadas em BRANCH_REF_TABLES',
  ],
} as const;
