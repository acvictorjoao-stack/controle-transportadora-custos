import {HML_HARD_DELETE_COMPANY_ID} from './constants';
import {expectedIdsByTable} from './expected-ids';
import type {
  CustomerHistoryRow,
  HistoryValidationResult,
  VehicleHistoryRow,
} from './types';

/**
 * Valida linhas candidatas de customer_history.
 * Cada linha precisa: company_id exato, customer_id na allowlist de clientes,
 * e contract_id nulo ou na allowlist de contratos. Nada mais.
 */
export function validateCustomerHistoryRows(
  rows: CustomerHistoryRow[],
  companyId: string = HML_HARD_DELETE_COMPANY_ID,
): HistoryValidationResult {
  const byTable = expectedIdsByTable();
  const customers = byTable.get('customers')!;
  const contracts = byTable.get('customer_contracts')!;
  const ids = new Set<string>();

  for (const row of rows) {
    if (row.company_id !== companyId) {
      return {ok: false, reason: 'customer_history_company_mismatch'};
    }
    if (!customers.has(row.customer_id)) {
      return {ok: false, reason: 'customer_history_customer_not_in_allowlist'};
    }
    if (row.contract_id != null && !contracts.has(row.contract_id)) {
      return {ok: false, reason: 'customer_history_contract_not_in_allowlist'};
    }
    if (ids.has(row.id)) {
      return {ok: false, reason: 'customer_history_duplicate_id'};
    }
    ids.add(row.id);
  }

  return {
    ok: true,
    customerHistoryIds: [...ids],
    vehicleHistoryIds: [],
  };
}

export function validateVehicleHistoryRows(
  rows: VehicleHistoryRow[],
  companyId: string = HML_HARD_DELETE_COMPANY_ID,
): HistoryValidationResult {
  const vehicles = expectedIdsByTable().get('vehicles')!;
  const ids = new Set<string>();

  for (const row of rows) {
    if (row.company_id !== companyId) {
      return {ok: false, reason: 'vehicle_history_company_mismatch'};
    }
    if (!vehicles.has(row.vehicle_id)) {
      return {ok: false, reason: 'vehicle_history_vehicle_not_in_allowlist'};
    }
    if (ids.has(row.id)) {
      return {ok: false, reason: 'vehicle_history_duplicate_id'};
    }
    ids.add(row.id);
  }

  return {
    ok: true,
    customerHistoryIds: [],
    vehicleHistoryIds: [...ids],
  };
}

/**
 * Junta as duas validações. Histórico vazio é permitido (já limpo ou nunca gerado).
 * Histórico com vínculo fora da allowlist sempre aborta.
 */
export function validateHistoryBundle(
  customerRows: CustomerHistoryRow[],
  vehicleRows: VehicleHistoryRow[],
  companyId: string = HML_HARD_DELETE_COMPANY_ID,
): HistoryValidationResult {
  const customers = validateCustomerHistoryRows(customerRows, companyId);
  if (!customers.ok) return customers;
  const vehicles = validateVehicleHistoryRows(vehicleRows, companyId);
  if (!vehicles.ok) return vehicles;

  return {
    ok: true,
    customerHistoryIds: customers.customerHistoryIds,
    vehicleHistoryIds: vehicles.vehicleHistoryIds,
  };
}

/**
 * Descoberta alinhada ao SQL: company + (customer_id OR contract_id) na allowlist.
 * Validação posterior (validateHistoryBundle) ainda exige customer_id na allowlist.
 */
export function filterDiscoverableCustomerHistory(
  allRows: CustomerHistoryRow[],
  companyId: string = HML_HARD_DELETE_COMPANY_ID,
): {candidates: CustomerHistoryRow[]; rejected: CustomerHistoryRow[]} {
  const byTable = expectedIdsByTable();
  const customers = byTable.get('customers')!;
  const contracts = byTable.get('customer_contracts')!;
  const candidates: CustomerHistoryRow[] = [];
  const rejected: CustomerHistoryRow[] = [];

  for (const row of allRows) {
    const linked =
      row.company_id === companyId &&
      (customers.has(row.customer_id) ||
        (row.contract_id != null && contracts.has(row.contract_id)));
    if (linked) candidates.push(row);
    else rejected.push(row);
  }
  return {candidates, rejected};
}

export function filterDiscoverableVehicleHistory(
  allRows: VehicleHistoryRow[],
  companyId: string = HML_HARD_DELETE_COMPANY_ID,
): {candidates: VehicleHistoryRow[]; rejected: VehicleHistoryRow[]} {
  const vehicles = expectedIdsByTable().get('vehicles')!;
  const candidates: VehicleHistoryRow[] = [];
  const rejected: VehicleHistoryRow[] = [];

  for (const row of allRows) {
    const linked = row.company_id === companyId && vehicles.has(row.vehicle_id);
    if (linked) candidates.push(row);
    else rejected.push(row);
  }
  return {candidates, rejected};
}
