import {
  HML_HARD_DELETE_CASCADE_CHILD_CHECKS,
  type HmlHardDeleteTable,
} from './constants';
import {expectedIdsByTable} from './expected-ids';

export type CascadeChildRow = {
  id: string;
  parentId: string;
  childTable: string;
  parentColumn: string;
};

export type CascadeValidationResult =
  | {ok: true}
  | {ok: false; reason: string};

/**
 * Valida inventário de filhos CASCADE antes de qualquer DELETE.
 * Filhos allowlistOnly: todo ID sob pais do escopo ⊆ allowlist.
 * Filhos mustBeEmpty: qualquer linha sob pais do escopo aborta.
 */
export function validateCascadeChildren(
  rows: CascadeChildRow[],
  parentIdsByTable: Map<string, Set<string>> = expectedIdsByTable() as Map<
    string,
    Set<string>
  >,
): CascadeValidationResult {
  for (const check of HML_HARD_DELETE_CASCADE_CHILD_CHECKS) {
    const parents = parentIdsByTable.get(check.parentTable);
    if (!parents || parents.size === 0) {
      return {ok: false, reason: `cascade_parent_set_missing:${check.parentTable}`};
    }

    const scoped = rows.filter(
      (row) =>
        row.childTable === check.childTable &&
        row.parentColumn === check.parentColumn &&
        parents.has(row.parentId),
    );

    if (check.mode === 'mustBeEmpty') {
      if (scoped.length > 0) {
        return {
          ok: false,
          reason: `cascade_extra_child:${check.childTable}.${check.parentColumn}`,
        };
      }
      continue;
    }

    const allowlist = parentIdsByTable.get(check.allowlistTable);
    if (!allowlist) {
      return {
        ok: false,
        reason: `cascade_allowlist_missing:${check.allowlistTable}`,
      };
    }

    for (const row of scoped) {
      if (!allowlist.has(row.id)) {
        return {
          ok: false,
          reason: `cascade_child_not_in_allowlist:${check.childTable}:${row.id.slice(0, 8)}`,
        };
      }
    }
  }

  return {ok: true};
}

/** Monta parent map a partir da allowlist tipada. */
export function cascadeParentIdsFromAllowlist(): Map<string, Set<string>> {
  const byTable = expectedIdsByTable();
  const map = new Map<string, Set<string>>();
  for (const [table, ids] of byTable) {
    map.set(table, ids);
  }
  return map;
}

export function isHardDeleteAllowlistTable(
  table: string,
): table is HmlHardDeleteTable {
  return cascadeParentIdsFromAllowlist().has(table);
}
