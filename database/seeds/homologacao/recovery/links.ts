import type {HmlSupabaseClient} from '../client';
import type {HmlRecoveryTable} from './constants';
import type {LinkCheckResult, PlanRow} from './types';
import {planIdsByTable} from './manifest';

export type CountActiveFn = (args: {
  table: string;
  companyId: string;
  filters: Array<{column: string; value: string}>;
  /** Quando set, ignora linhas cujo id está neste conjunto (plano de recovery). */
  excludeIds?: Set<string>;
}) => Promise<{count: number; error: string | null}>;

/**
 * Contagem segura com exclusão: total − matching(excludeIds).
 * Não pagina lista de IDs (evita truncamento PostgREST).
 * `count === null` ou total < excluded → fail-closed.
 */
export function computeRemainingAfterExclude(
  total: number | null,
  excludedMatching: number | null,
): {count: number; error: string | null} {
  if (total == null || excludedMatching == null) {
    return {count: 0, error: 'count_null_unproven'};
  }
  if (total < 0 || excludedMatching < 0) {
    return {count: 0, error: 'count_negative_unproven'};
  }
  if (excludedMatching > total) {
    return {count: 0, error: 'exclude_count_exceeds_total'};
  }
  return {count: total - excludedMatching, error: null};
}

type HeadCountResult = {count: number | null; error: string | null};

/**
 * Contagem head via PostgREST. Falha de consulta → error string (não throw),
 * para o orquestrador abortar sem escrita.
 *
 * Com excludeIds: duas contagens exact (total e subset in(excludeIds)), sem listagem
 * paginada. Se qualquer contagem for nula/inconsistente → error (fail-closed).
 */
export function createSupabaseCountActive(supabase: HmlSupabaseClient): CountActiveFn {
  const headCount = async (args: {
    table: string;
    companyId: string;
    filters: Array<{column: string; value: string}>;
    inIds?: string[];
  }): Promise<HeadCountResult> => {
    let query = supabase
      .from(args.table as never)
      .select('id', {count: 'exact', head: true})
      .eq('company_id', args.companyId)
      .is('deleted_at', null);

    for (const filter of args.filters) {
      query = query.eq(filter.column, filter.value);
    }
    if (args.inIds && args.inIds.length > 0) {
      query = query.in('id', args.inIds);
    }

    const {error, count} = await query;
    if (error) {
      return {count: null, error: error.message ?? 'count_failed'};
    }
    if (count == null) {
      return {count: null, error: 'count_null_unproven'};
    }
    return {count, error: null};
  };

  return async ({table, companyId, filters, excludeIds}) => {
    const total = await headCount({table, companyId, filters});
    if (total.error || total.count == null) {
      return {count: 0, error: total.error ?? 'count_null_unproven'};
    }

    if (!excludeIds || excludeIds.size === 0) {
      return {count: total.count, error: null};
    }

    const excluded = await headCount({
      table,
      companyId,
      filters,
      inIds: [...excludeIds],
    });
    if (excluded.error || excluded.count == null) {
      return {count: 0, error: excluded.error ?? 'exclude_count_unproven'};
    }

    return computeRemainingAfterExclude(total.count, excluded.count);
  };
}

/** company_members usa deleted_at; default_branch_id sem exclude (não está no plano). */
async function countMembersDefaultBranch(
  countActive: CountActiveFn,
  companyId: string,
  branchId: string,
): Promise<{count: number; error: string | null}> {
  return countActive({
    table: 'company_members',
    companyId,
    filters: [{column: 'default_branch_id', value: branchId}],
  });
}

export async function checkSupplierLinks(
  countActive: CountActiveFn,
  companyId: string,
  row: PlanRow,
): Promise<LinkCheckResult> {
  const details: string[] = [];
  const tables = [
    'financial_entries',
    'maintenance_records',
    'tires',
    'tire_recaps',
    'fuel_records',
  ] as const;

  for (const table of tables) {
    const result = await countActive({
      table,
      companyId,
      filters: [{column: 'supplier_id', value: row.id}],
    });
    if (result.error) {
      return {
        table: row.table,
        id: row.id,
        key: row.key,
        blocked: true,
        reason: `link_query_failed:${table}`,
        details: [result.error],
      };
    }
    if (result.count > 0) {
      details.push(`${table}=${result.count}`);
    }
  }

  return {
    table: row.table,
    id: row.id,
    key: row.key,
    blocked: details.length > 0,
    reason: details.length > 0 ? 'supplier_has_links' : 'ok',
    details,
  };
}

export async function checkCostCenterLinks(
  countActive: CountActiveFn,
  companyId: string,
  row: PlanRow,
): Promise<LinkCheckResult> {
  const details: string[] = [];

  const financial = await countActive({
    table: 'financial_entries',
    companyId,
    filters: [{column: 'cost_center_id', value: row.id}],
  });
  if (financial.error) {
    return {
      table: row.table,
      id: row.id,
      key: row.key,
      blocked: true,
      reason: 'link_query_failed:financial_entries',
      details: [financial.error],
    };
  }
  if (financial.count > 0) details.push(`financial_entries=${financial.count}`);

  const employees = await countActive({
    table: 'employees',
    companyId,
    filters: [{column: 'cost_center_id', value: row.id}],
  });
  if (employees.error) {
    return {
      table: row.table,
      id: row.id,
      key: row.key,
      blocked: true,
      reason: 'link_query_failed:employees',
      details: [employees.error],
    };
  }
  if (employees.count > 0) details.push(`employees=${employees.count}`);

  return {
    table: row.table,
    id: row.id,
    key: row.key,
    blocked: details.length > 0,
    reason: details.length > 0 ? 'cost_center_has_links' : 'ok',
    details,
  };
}

export async function checkPositionLinks(
  countActive: CountActiveFn,
  companyId: string,
  row: PlanRow,
): Promise<LinkCheckResult> {
  const details: string[] = [];

  const payroll = await countActive({
    table: 'payroll_expenses',
    companyId,
    filters: [{column: 'position_id', value: row.id}],
  });
  if (payroll.error) {
    return {
      table: row.table,
      id: row.id,
      key: row.key,
      blocked: true,
      reason: 'link_query_failed:payroll_expenses',
      details: [payroll.error],
    };
  }
  if (payroll.count > 0) details.push(`payroll_expenses=${payroll.count}`);

  const employees = await countActive({
    table: 'employees',
    companyId,
    filters: [{column: 'position_id', value: row.id}],
  });
  if (employees.error) {
    return {
      table: row.table,
      id: row.id,
      key: row.key,
      blocked: true,
      reason: 'link_query_failed:employees',
      details: [employees.error],
    };
  }
  if (employees.count > 0) details.push(`employees=${employees.count}`);

  return {
    table: row.table,
    id: row.id,
    key: row.key,
    blocked: details.length > 0,
    reason: details.length > 0 ? 'position_has_links' : 'ok',
    details,
  };
}

/**
 * Tabelas com `company_id` + `branch_id` + `deleted_at` consultadas no pré-check
 * de filiais (confirmado em migrations/types). `company_members` usa
 * `default_branch_id` e é tratado à parte.
 *
 * excludeIds só se aplica quando a tabela ∈ HML_RECOVERY_TABLE_ORDER (filhos do
 * manifesto soft-deletados na mesma execução, antes das filiais).
 *
 * Fora desta lista de propósito:
 * - `suppliers` — sem coluna branch_id
 * - `vehicle_documents` — sem coluna branch_id
 * - `*_history` — snapshots de auditoria; deleted_at IS NULL não implica vínculo operacional
 * - storage objects / paths
 */
export const BRANCH_REF_TABLES = [
  // Cadastros / plano HML (excludeIds quando no manifesto)
  'vehicles',
  'customers',
  'customer_contracts',
  'customer_addresses',
  'customer_contacts',
  'customer_contract_items',
  'customer_documents',
  'drivers',
  'employees',
  'fuel_records',
  'fuel_documents',
  'maintenance_records',
  'maintenance_parts',
  'maintenance_services',
  'maintenance_schedules',
  'maintenance_documents',
  'tires',
  'tire_movements',
  'tire_inspections',
  'tire_recaps',
  'tire_documents',
  'trips',
  'trip_expenses',
  'trip_stops',
  'trip_occurrences',
  'trip_checklists',
  'trip_documents',
  'trip_locations',
  'payroll_expenses',
  'financial_entries',
  'financial_categories',
  'financial_cost_centers',
  'financial_documents',
  'routes',
] as const;

export async function checkBranchLinks(
  countActive: CountActiveFn,
  companyId: string,
  row: PlanRow,
  plan: PlanRow[],
): Promise<LinkCheckResult> {
  const details: string[] = [];
  const idsByTable = planIdsByTable(plan);

  const members = await countMembersDefaultBranch(countActive, companyId, row.id);
  if (members.error) {
    return {
      table: row.table,
      id: row.id,
      key: row.key,
      blocked: true,
      reason: 'link_query_failed:company_members',
      details: [members.error],
    };
  }
  if (members.count > 0) details.push(`company_members.default_branch_id=${members.count}`);

  for (const table of BRANCH_REF_TABLES) {
    const excludeIds = idsByTable.get(table as HmlRecoveryTable);
    const result = await countActive({
      table,
      companyId,
      filters: [{column: 'branch_id', value: row.id}],
      excludeIds: excludeIds && excludeIds.size > 0 ? excludeIds : undefined,
    });
    if (result.error) {
      return {
        table: row.table,
        id: row.id,
        key: row.key,
        blocked: true,
        reason: `link_query_failed:${table}`,
        details: [result.error],
      };
    }
    if (result.count > 0) details.push(`${table}.branch_id=${result.count}`);
  }

  return {
    table: row.table,
    id: row.id,
    key: row.key,
    blocked: details.length > 0,
    reason: details.length > 0 ? 'branch_has_active_refs' : 'ok',
    details,
  };
}

export async function runLinkPrechecks(
  countActive: CountActiveFn,
  companyId: string,
  activeRows: PlanRow[],
  fullPlan: PlanRow[],
): Promise<LinkCheckResult[]> {
  const results: LinkCheckResult[] = [];

  for (const row of activeRows) {
    if (row.table === 'suppliers') {
      results.push(await checkSupplierLinks(countActive, companyId, row));
    } else if (row.table === 'cost_centers') {
      results.push(await checkCostCenterLinks(countActive, companyId, row));
    } else if (row.table === 'positions') {
      results.push(await checkPositionLinks(countActive, companyId, row));
    } else if (row.table === 'branches') {
      results.push(await checkBranchLinks(countActive, companyId, row, fullPlan));
    }
  }

  return results;
}
