import {
  HML_HARD_DELETE_COMPANY_ID,
  HML_HARD_DELETE_CONFIRM_VALUE,
  HML_HARD_DELETE_EXTERNAL_REF_CHECKS,
  HML_HARD_DELETE_TABLE_ORDER,
  type HmlHardDeleteTable,
} from './constants';
import {
  cascadeParentIdsFromAllowlist,
  validateCascadeChildren,
} from './cascade-validate';
import {HML_HARD_DELETE_EXPECTED_ENTRIES} from './expected-ids';
import {validateHistoryBundle} from './history-validate';
import {classifyTargetPresence, validateLiveTargetRow} from './row-validate';
import type {
  CustomerHistoryRow,
  HardDeleteOutcome,
  LiveTargetRow,
  SimulatedStore,
  VehicleHistoryRow,
} from './types';

type TxSnapshot = {
  targets: Map<string, LiveTargetRow & {table: HmlHardDeleteTable}>;
  customerHistory: CustomerHistoryRow[];
  vehicleHistory: VehicleHistoryRow[];
  cascadeChildren: SimulatedStore['cascadeChildren'];
  externalRefRows: SimulatedStore['externalRefRows'];
  auditEvents: SimulatedStore['auditEvents'];
  rowLocksHeld: boolean;
};

function cloneStore(store: SimulatedStore): TxSnapshot {
  return {
    targets: new Map(store.targets),
    customerHistory: store.customerHistory.map((row) => ({...row})),
    vehicleHistory: store.vehicleHistory.map((row) => ({...row})),
    cascadeChildren: store.cascadeChildren.map((row) => ({...row})),
    externalRefRows: store.externalRefRows.map((row) => ({...row})),
    auditEvents: store.auditEvents.map((row) => ({...row, counts: {...row.counts}})),
    rowLocksHeld: store.rowLocksHeld,
  };
}

function restoreStore(store: SimulatedStore, snapshot: TxSnapshot): void {
  store.targets = snapshot.targets;
  store.customerHistory = snapshot.customerHistory;
  store.vehicleHistory = snapshot.vehicleHistory;
  store.cascadeChildren = snapshot.cascadeChildren;
  store.externalRefRows = snapshot.externalRefRows;
  store.auditEvents = snapshot.auditEvents;
  store.rowLocksHeld = snapshot.rowLocksHeld;
}

function targetKey(table: HmlHardDeleteTable, id: string): string {
  return `${table}:${id}`;
}

/**
 * Conta refs como no SQL: global, depois excludeIds (linhas da allowlist
 * apagadas na mesma tx). Preferência: externalRefRows; fallback: map líquido.
 */
function countExternal(
  store: SimulatedStore,
  table: string,
  column: string,
  parentId: string,
  excludeIds: Set<string>,
): number {
  const rows = store.externalRefRows.filter(
    (row) =>
      row.table === table &&
      row.column === column &&
      row.parentId === parentId &&
      !excludeIds.has(row.childId),
  );
  if (store.externalRefRows.some((r) => r.table === table && r.column === column)) {
    return rows.length;
  }
  return store.externalRefs.get(`${table}:${column}:${parentId}`) ?? 0;
}

function writeAudit(
  store: SimulatedStore,
  actorId: string,
  result: string,
  counts: Record<string, number>,
): void {
  if (store.auditInsertFails) {
    throw new Error('audit_insert_failed');
  }
  store.auditEvents.push({
    companyId: store.companyId,
    actorId,
    scope: 'hml_manifest_43',
    result,
    counts: {...counts},
  });
}

/**
 * Simula a função SQL em uma única transação com rollback integral.
 * Usado só em testes locais — não conecta ao Supabase.
 *
 * Limite do lock: o simulador aborta se outro ator já segura o advisory lock
 * (não modela espera de pg_advisory_xact_lock). FOR UPDATE dos alvos é marcado
 * em rowLocksHeld após a presença completa.
 */
export function runHardDeleteTransaction(args: {
  store: SimulatedStore;
  confirm: string;
  isSuperAdmin: boolean;
  actorId: string;
  isPortalMasterActing?: boolean;
  failAfterTargetDeletes?: number;
}): HardDeleteOutcome {
  const {store} = args;

  if (args.confirm !== HML_HARD_DELETE_CONFIRM_VALUE) {
    return {status: 'aborted', reason: 'confirm_mismatch'};
  }
  if (args.isPortalMasterActing === true) {
    return {status: 'aborted', reason: 'portal_master_not_authorized'};
  }
  if (!args.isSuperAdmin) {
    return {status: 'aborted', reason: 'not_membership_super_admin'};
  }
  if (store.companyId !== HML_HARD_DELETE_COMPANY_ID) {
    return {status: 'aborted', reason: 'company_mismatch'};
  }

  if (store.lockedBy != null && store.lockedBy !== args.actorId) {
    return {status: 'aborted', reason: 'advisory_lock_held'};
  }
  store.lockedBy = args.actorId;

  const snapshot = cloneStore(store);
  const deleted: Record<string, number> = {
    customer_history: 0,
    vehicle_history: 0,
  };
  for (const table of HML_HARD_DELETE_TABLE_ORDER) deleted[table] = 0;

  try {
    const hq = [...store.targets.values()].find(
      (row) => row.table === 'branches' && row.id === store.hqBranchId,
    );
    if (!hq || hq.is_headquarters !== true || hq.code !== 'HQ') {
      throw new Error('hq_invariant_broken');
    }
    for (const id of store.systemCostCenterIds) {
      const row = store.targets.get(targetKey('cost_centers', id));
      if (!row || row.is_system !== true) throw new Error('system_cost_center_missing');
    }
    for (const id of store.systemPositionIds) {
      const row = store.targets.get(targetKey('positions', id));
      if (!row || row.is_system !== true) throw new Error('system_position_missing');
    }

    const presenceInputs = HML_HARD_DELETE_EXPECTED_ENTRIES.map((expected) => {
      const live = store.targets.get(targetKey(expected.table, expected.id)) ?? null;
      return {expected, live};
    });
    const presence = classifyTargetPresence(presenceInputs, store.companyId);
    if (!presence.ok) throw new Error(presence.reason);

    const cascade = validateCascadeChildren(
      store.cascadeChildren,
      cascadeParentIdsFromAllowlist(),
    );
    if (!cascade.ok) throw new Error(cascade.reason);

    const customerIds = new Set(
      HML_HARD_DELETE_EXPECTED_ENTRIES.filter((e) => e.table === 'customers').map(
        (e) => e.id,
      ),
    );
    const contractIds = new Set(
      HML_HARD_DELETE_EXPECTED_ENTRIES.filter(
        (e) => e.table === 'customer_contracts',
      ).map((e) => e.id),
    );
    const vehicleIds = new Set(
      HML_HARD_DELETE_EXPECTED_ENTRIES.filter((e) => e.table === 'vehicles').map(
        (e) => e.id,
      ),
    );

    // Descoberta alinhada ao SQL: customer_id OR contract_id
    const customerHistory = store.customerHistory.filter(
      (row) =>
        customerIds.has(row.customer_id) ||
        (row.contract_id != null && contractIds.has(row.contract_id)),
    );
    const vehicleHistory = store.vehicleHistory.filter((row) =>
      vehicleIds.has(row.vehicle_id),
    );

    if (presence.presentCount === 0) {
      if (customerHistory.length === 0 && vehicleHistory.length === 0) {
        writeAudit(store, args.actorId, 'already_clean', {});
        store.lockedBy = null;
        // Paridade SQL: deleted vazio (não zera chaves).
        return {status: 'already_clean', deleted: {}, audited: true};
      }
      throw new Error('targets_absent_but_history_remains');
    }

    // FOR UPDATE simulado dos alvos presentes
    store.rowLocksHeld = true;

    const history = validateHistoryBundle(
      customerHistory,
      vehicleHistory,
      store.companyId,
    );
    if (!history.ok) throw new Error(history.reason);

    const excludeByTable = new Map<string, Set<string>>();
    for (const entry of HML_HARD_DELETE_EXPECTED_ENTRIES) {
      const set = excludeByTable.get(entry.table) ?? new Set<string>();
      set.add(entry.id);
      excludeByTable.set(entry.table, set);
    }
    // History IDs validados também são excluídos do check branch_id (como v_ch_ids)
    excludeByTable.set(
      'customer_history',
      new Set(history.customerHistoryIds),
    );

    for (const entry of HML_HARD_DELETE_EXPECTED_ENTRIES) {
      for (const check of HML_HARD_DELETE_EXTERNAL_REF_CHECKS) {
        if (check.parent !== entry.table) continue;
        const exclude = excludeByTable.get(check.table) ?? new Set();
        const count = countExternal(
          store,
          check.table,
          check.column,
          entry.id,
          exclude,
        );
        if (count > 0) {
          throw new Error(
            `external_ref:${check.table}.${check.column}:${entry.id.slice(0, 8)}=${count}`,
          );
        }
      }
    }

    const customerHistoryIdSet = new Set(history.customerHistoryIds);
    const beforeCh = store.customerHistory.length;
    store.customerHistory = store.customerHistory.filter(
      (row) => !customerHistoryIdSet.has(row.id),
    );
    deleted.customer_history = beforeCh - store.customerHistory.length;

    const vehicleHistoryIdSet = new Set(history.vehicleHistoryIds);
    const beforeVh = store.vehicleHistory.length;
    store.vehicleHistory = store.vehicleHistory.filter(
      (row) => !vehicleHistoryIdSet.has(row.id),
    );
    deleted.vehicle_history = beforeVh - store.vehicleHistory.length;

    let targetDeletes = 0;
    const orderedTargets = [...HML_HARD_DELETE_EXPECTED_ENTRIES].sort((a, b) => {
      return (
        HML_HARD_DELETE_TABLE_ORDER.indexOf(a.table) -
        HML_HARD_DELETE_TABLE_ORDER.indexOf(b.table)
      );
    });
    for (const expected of orderedTargets) {
      const live = store.targets.get(targetKey(expected.table, expected.id)) ?? null;
      const validated = validateLiveTargetRow(expected, live, store.companyId);
      if (!validated.ok) throw new Error(validated.reason);
      if (!validated.present) throw new Error('target_vanished_mid_tx');

      store.targets.delete(targetKey(expected.table, expected.id));
      deleted[expected.table] = (deleted[expected.table] ?? 0) + 1;
      targetDeletes += 1;

      if (
        args.failAfterTargetDeletes != null &&
        targetDeletes >= args.failAfterTargetDeletes
      ) {
        throw new Error('forced_mid_transaction_failure');
      }
    }

    store.customerHistory = store.customerHistory.filter(
      (row) => !customerIds.has(row.customer_id),
    );
    store.vehicleHistory = store.vehicleHistory.filter(
      (row) => !vehicleIds.has(row.vehicle_id),
    );
    store.cascadeChildren = [];
    store.externalRefRows = [];

    const hqAfter = store.targets.get(targetKey('branches', store.hqBranchId));
    if (!hqAfter || hqAfter.is_headquarters !== true) {
      throw new Error('hq_lost_after_delete');
    }
    for (const id of store.systemCostCenterIds) {
      if (!store.targets.has(targetKey('cost_centers', id))) {
        throw new Error('system_cost_center_lost');
      }
    }
    for (const id of store.systemPositionIds) {
      if (!store.targets.has(targetKey('positions', id))) {
        throw new Error('system_position_lost');
      }
    }
    for (const expected of HML_HARD_DELETE_EXPECTED_ENTRIES) {
      if (store.targets.has(targetKey(expected.table, expected.id))) {
        throw new Error('target_still_present_after_delete');
      }
    }

    writeAudit(store, args.actorId, 'deleted', deleted);
    store.lockedBy = null;
    return {status: 'deleted', deleted, audited: true};
  } catch (error) {
    restoreStore(store, snapshot);
    store.lockedBy = null;
    const reason = error instanceof Error ? error.message : 'unknown';
    return {status: 'aborted', reason};
  }
}

export function createEmptySimulatedStore(): SimulatedStore {
  return {
    companyId: HML_HARD_DELETE_COMPANY_ID,
    targets: new Map(),
    customerHistory: [],
    vehicleHistory: [],
    cascadeChildren: [],
    externalRefRows: [],
    externalRefs: new Map(),
    auditEvents: [],
    auditInsertFails: false,
    rowLocksHeld: false,
    hqBranchId: 'cc609577-0000-4000-8000-0000000000hq',
    systemCostCenterIds: ['sys-cc-oper', 'sys-cc-adm'],
    systemPositionIds: ['sys-pos-mot', 'sys-pos-ger'],
    lockedBy: null,
  };
}

export function seedSimulatedStoreWithManifestResidues(
  store: SimulatedStore,
): void {
  store.targets.set(targetKey('branches', store.hqBranchId), {
    id: store.hqBranchId,
    company_id: store.companyId,
    table: 'branches',
    code: 'HQ',
    is_headquarters: true,
    deleted_at: null,
  });
  for (const id of store.systemCostCenterIds) {
    store.targets.set(targetKey('cost_centers', id), {
      id,
      company_id: store.companyId,
      table: 'cost_centers',
      code: 'OPERACIONAL',
      is_system: true,
      deleted_at: null,
    });
  }
  for (const id of store.systemPositionIds) {
    store.targets.set(targetKey('positions', id), {
      id,
      company_id: store.companyId,
      table: 'positions',
      code: 'MOTORISTA',
      is_system: true,
      deleted_at: null,
    });
  }

  for (const entry of HML_HARD_DELETE_EXPECTED_ENTRIES) {
    store.targets.set(targetKey(entry.table, entry.id), {
      id: entry.id,
      company_id: store.companyId,
      table: entry.table,
      code: entry.expectedCode ?? null,
      is_headquarters: false,
      is_system: false,
      deleted_at: null,
    });
  }

  const customers = HML_HARD_DELETE_EXPECTED_ENTRIES.filter(
    (e) => e.table === 'customers',
  );
  const customerByKey = new Map(customers.map((row) => [row.key, row]));
  for (const entry of HML_HARD_DELETE_EXPECTED_ENTRIES) {
    if (entry.table === 'customer_addresses' || entry.table === 'customer_contacts') {
      const parent = customerByKey.get(entry.key);
      if (parent) {
        store.cascadeChildren.push({
          id: entry.id,
          parentId: parent.id,
          childTable: entry.table,
          parentColumn: 'customer_id',
        });
      }
    }
    if (entry.table === 'customer_contracts') {
      const parent = customerByKey.get(entry.key);
      if (parent) {
        store.cascadeChildren.push({
          id: entry.id,
          parentId: parent.id,
          childTable: 'customer_contracts',
          parentColumn: 'customer_id',
        });
      }
    }
    if (entry.table === 'customer_contract_items') {
      const contractKey = entry.key.replace(/-item\d+$/, '');
      const contract = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
        (e) => e.table === 'customer_contracts' && e.key === contractKey,
      );
      if (contract) {
        store.cascadeChildren.push({
          id: entry.id,
          parentId: contract.id,
          childTable: 'customer_contract_items',
          parentColumn: 'contract_id',
        });
      }
    }
  }

  const contracts = HML_HARD_DELETE_EXPECTED_ENTRIES.filter(
    (e) => e.table === 'customer_contracts',
  );
  const vehicles = HML_HARD_DELETE_EXPECTED_ENTRIES.filter(
    (e) => e.table === 'vehicles',
  );

  store.customerHistory = [
    ...customers.map((customer) => ({
      id: `ch-${customer.id.slice(0, 8)}-create`,
      company_id: store.companyId,
      customer_id: customer.id,
      contract_id: null as string | null,
    })),
    ...contracts.flatMap((contract) => {
      const customer = customerByKey.get(contract.key);
      if (!customer) return [];
      return [
        {
          id: `ch-${contract.id.slice(0, 8)}-contract`,
          company_id: store.companyId,
          customer_id: customer.id,
          contract_id: contract.id,
        },
        {
          id: `ch-${contract.id.slice(0, 8)}-update`,
          company_id: store.companyId,
          customer_id: customer.id,
          contract_id: contract.id,
        },
      ];
    }),
  ];

  store.vehicleHistory = vehicles.map((vehicle) => ({
    id: `vh-${vehicle.id.slice(0, 8)}-create`,
    company_id: store.companyId,
    vehicle_id: vehicle.id,
  }));
}
