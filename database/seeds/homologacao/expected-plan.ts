import {
  buildHmlFuelDefinitions,
  buildHmlMaintenanceDefinitions,
  buildHmlTireDefinitions,
  buildHmlTripDefinitions,
} from './catalog';
import {HML_COUNTS} from './constants';
import type {HmlExpectedPlan, HmlOperationType, HmlRecordKind} from './types';

export const HML_MANIFEST_DISCLAIMER =
  'O manifesto/relatório local NÃO é um log transacional do banco. ' +
  'Cada operação comita isoladamente via PostgREST; não há rollback global nem resume cross-run. ' +
  'Após falha parcial, não repetir --execute automaticamente: empty-guards abortam até recuperação manual.';

/**
 * Critérios explícitos de sucesso / divergência (grandezas equivalentes).
 *
 * Sucesso exige igualdade em TODAS as linhas:
 * - primaryExecuted === primary
 * - auxiliaryExecuted === auxiliary
 * - statusUpdatesExecuted === statusUpdates
 * - financialIntegrationCallsExecuted === financialIntegrationCalls
 * - financialEntriesCreatedExecuted === financialEntriesCreated
 * - ignoredOptional === 0 (nenhum item obrigatório ignorado)
 * - abortedPhase === null
 *
 * Divergência: qualquer diferença ≠ 0 nas comparações acima.
 * NÃO comparar financialEntriesCreated com financialIntegrationCalls (unidades diferentes).
 */
export const HML_SUCCESS_CRITERIA = {
  comparePrimary: true,
  compareAuxiliary: true,
  compareStatusUpdates: true,
  compareFinancialIntegrationCalls: true,
  compareFinancialEntriesCreated: true,
  requireZeroIgnoredOptional: true,
  requireNoAbort: true,
} as const;

export const HML_PHASE_ORDER = [
  'branches',
  'cost_centers',
  'positions',
  'suppliers',
  'customers',
  'vehicles',
  'drivers',
  'routes',
  'employees',
  'trips',
  'trip_children',
  'fuel',
  'maintenance',
  'tires',
  'payroll',
  'accounts_payable',
  'accounts_receivable',
  'manual_financial',
] as const;

export type HmlPhaseId = (typeof HML_PHASE_ORDER)[number];

function line(
  phase: string,
  table: string,
  kind: HmlRecordKind,
  operation: HmlOperationType,
  expectedCount: number,
  metric:
    | 'primary'
    | 'auxiliary'
    | 'status_update'
    | 'financial_integration_call'
    | 'financial_entry' = kind === 'financial_integration'
      ? 'financial_integration_call'
      : kind === 'status_update'
        ? 'status_update'
        : kind === 'auxiliary'
          ? 'auxiliary'
          : 'primary',
) {
  return {phase, table, kind, operation, expectedCount, metric};
}

/**
 * Regra alinhada a `resolveSchedule` em operation-financial.service:
 * cash → 1 lançamento; credit → installmentCount (≥1).
 */
export function expectedInstallmentsFromPayment(
  paymentType: 'cash' | 'credit' | string | null | undefined,
  installmentCount?: number | null,
): number {
  if (paymentType === 'credit') {
    return Math.max(1, Math.floor(installmentCount ?? 1));
  }
  return 1;
}

/** Parcelas financeiras esperadas a partir das definições de combustível. */
export function countExpectedFuelFinancialEntries(
  defs = buildHmlFuelDefinitions(),
): number {
  return defs.reduce(
    (sum, item) =>
      sum + expectedInstallmentsFromPayment(item.paymentType, item.paymentType === 'credit' ? 2 : 1),
    0,
  );
}

export function countExpectedMaintenanceFinancialEntries(
  defs = buildHmlMaintenanceDefinitions(),
): number {
  return defs.reduce(
    (sum, item) =>
      sum + expectedInstallmentsFromPayment(item.paymentType, item.paymentType === 'credit' ? 2 : 1),
    0,
  );
}

export function countExpectedTireFinancialEntries(
  defs = buildHmlTireDefinitions(),
): number {
  return defs.reduce((sum, item) => {
    const credit = item.purchaseValue > 2800;
    return (
      sum + expectedInstallmentsFromPayment(credit ? 'credit' : 'cash', credit ? 2 : 1)
    );
  }, 0);
}

export function countExpectedTripFreightFinancialEntries(
  defs = buildHmlTripDefinitions(),
): number {
  return defs.filter((trip) => trip.status === 'completed' && trip.freight > 0).length;
}

export function countExpectedPayrollFinancialEntries(): number {
  return (2 + HML_COUNTS.employees) * HML_COUNTS.payrollCompetences;
}

/** Uma chamada de sync por registro operacional (não por parcela). */
export function countExpectedFinancialIntegrationCalls(): number {
  return (
    HML_COUNTS.fuelRecords +
    HML_COUNTS.maintenanceRecords +
    HML_COUNTS.tires +
    countExpectedTripFreightFinancialEntries() +
    countExpectedPayrollFinancialEntries()
  );
}

export function countExpectedFinancialEntriesCreated(): number {
  return (
    countExpectedFuelFinancialEntries() +
    countExpectedMaintenanceFinancialEntries() +
    countExpectedTireFinancialEntries() +
    countExpectedTripFreightFinancialEntries() +
    countExpectedPayrollFinancialEntries()
  );
}

export function countExpectedTripStatusUpdates(
  defs = buildHmlTripDefinitions(),
): {starts: number; completes: number; cancels: number} {
  return {
    starts: defs.filter((t) => t.status === 'in_progress' || t.status === 'completed').length,
    completes: defs.filter((t) => t.status === 'completed').length,
    cancels: defs.filter((t) => t.status === 'cancelled').length,
  };
}

/**
 * Plano esperado da carga HML.
 * `financial_integration` = chamadas de sync (hooks/asserts).
 * `financialEntriesCreated` (totals) = linhas em financial_entries geradas pelas integrações.
 */
export function buildHmlExpectedPlan(): HmlExpectedPlan {
  const tripStatus = countExpectedTripStatusUpdates();
  const fuelFe = countExpectedFuelFinancialEntries();
  const maintenanceFe = countExpectedMaintenanceFinancialEntries();
  const tireFe = countExpectedTireFinancialEntries();
  const tripFe = countExpectedTripFreightFinancialEntries();
  const payrollFe = countExpectedPayrollFinancialEntries();
  const contractItems = HML_COUNTS.contracts * HML_COUNTS.contractItemsPerContract;
  const apPaid = Math.max(0, HML_COUNTS.accountsPayable - 7);
  const arReceived = Math.max(0, HML_COUNTS.accountsReceivable - 7);
  const financialCalls = countExpectedFinancialIntegrationCalls();
  const financialEntries = countExpectedFinancialEntriesCreated();

  const phases = [
    line('branches', 'branches', 'primary', 'insert', HML_COUNTS.newBranches),
    line('cost_centers', 'cost_centers', 'primary', 'insert', HML_COUNTS.costCenters),
    line('positions', 'positions', 'primary', 'insert', HML_COUNTS.positions),
    line('suppliers', 'suppliers', 'primary', 'insert', HML_COUNTS.suppliers),
    line('customers', 'customers', 'primary', 'insert', HML_COUNTS.customers),
    line('customers', 'customer_addresses', 'auxiliary', 'insert', HML_COUNTS.customerAddresses),
    line('customers', 'customer_contacts', 'auxiliary', 'insert', HML_COUNTS.customerContacts),
    line('customers', 'customer_contracts', 'primary', 'insert', HML_COUNTS.contracts),
    line('customers', 'customer_contract_items', 'auxiliary', 'insert', contractItems),
    line('vehicles', 'vehicles', 'primary', 'insert', HML_COUNTS.vehicles),
    line('drivers', 'drivers', 'primary', 'insert', HML_COUNTS.drivers),
    line('routes', 'routes', 'primary', 'insert', HML_COUNTS.routes),
    line('employees', 'employees', 'primary', 'insert', HML_COUNTS.employees),
    line('trips', 'trips', 'primary', 'insert', HML_COUNTS.trips),
    line('trips', 'trips', 'status_update', 'update', tripStatus.starts),
    line('trips', 'trips', 'status_update', 'update', tripStatus.completes),
    line('trips', 'trips', 'status_update', 'update', tripStatus.cancels),
    line('trips', 'financial_entries', 'financial_integration', 'sync', tripFe),
    line('trip_children', 'trip_expenses', 'auxiliary', 'insert', HML_COUNTS.tripExpenses),
    line('trip_children', 'trip_stops', 'auxiliary', 'insert', HML_COUNTS.tripStops),
    line('trip_children', 'trip_occurrences', 'auxiliary', 'insert', HML_COUNTS.tripOccurrences),
    line('trip_children', 'trip_checklists', 'auxiliary', 'insert', HML_COUNTS.tripChecklists),
    line('fuel', 'fuel_records', 'primary', 'insert', HML_COUNTS.fuelRecords),
    line('fuel', 'financial_entries', 'financial_integration', 'sync', HML_COUNTS.fuelRecords),
    line('maintenance', 'maintenance_records', 'primary', 'insert', HML_COUNTS.maintenanceRecords),
    line('maintenance', 'maintenance_parts', 'auxiliary', 'insert', HML_COUNTS.maintenanceParts),
    line(
      'maintenance',
      'maintenance_services',
      'auxiliary',
      'insert',
      HML_COUNTS.maintenanceServices,
    ),
    line(
      'maintenance',
      'financial_entries',
      'financial_integration',
      'sync',
      HML_COUNTS.maintenanceRecords,
    ),
    line('tires', 'tires', 'primary', 'insert', HML_COUNTS.tires),
    line('tires', 'tire_movements', 'auxiliary', 'insert', HML_COUNTS.tireMovements),
    line('tires', 'tire_inspections', 'auxiliary', 'insert', HML_COUNTS.tireInspections),
    line('tires', 'tire_recaps', 'auxiliary', 'insert', HML_COUNTS.tireRecaps),
    line('tires', 'financial_entries', 'financial_integration', 'sync', HML_COUNTS.tires),
    line('payroll', 'payroll_expenses', 'primary', 'insert', payrollFe),
    line('payroll', 'financial_entries', 'financial_integration', 'sync', payrollFe),
    line('accounts_payable', 'financial_entries', 'primary', 'insert', HML_COUNTS.accountsPayable),
    line('accounts_payable', 'financial_entries', 'status_update', 'update', apPaid),
    line(
      'accounts_receivable',
      'financial_entries',
      'primary',
      'insert',
      HML_COUNTS.accountsReceivable,
    ),
    line('accounts_receivable', 'financial_entries', 'status_update', 'update', arReceived),
    line(
      'manual_financial',
      'financial_entries',
      'primary',
      'insert',
      HML_COUNTS.manualFinancialEntries,
    ),
  ];

  const totals = {
    primary: 0,
    auxiliary: 0,
    statusUpdates: 0,
    financialIntegrationCalls: 0,
    financialEntriesCreated: financialEntries,
    /** Entradas de manifesto = primary + auxiliary + status + sync calls (1 por integração). */
    manifestTracked: 0,
  };

  for (const item of phases) {
    if (item.kind === 'primary') totals.primary += item.expectedCount;
    else if (item.kind === 'auxiliary') totals.auxiliary += item.expectedCount;
    else if (item.kind === 'status_update') totals.statusUpdates += item.expectedCount;
    else totals.financialIntegrationCalls += item.expectedCount;
  }

  totals.manifestTracked =
    totals.primary +
    totals.auxiliary +
    totals.statusUpdates +
    totals.financialIntegrationCalls;

  if (totals.financialIntegrationCalls !== financialCalls) {
    throw new Error(
      `Plano HML inconsistente: financialIntegrationCalls=${totals.financialIntegrationCalls} vs ${financialCalls}.`,
    );
  }

  // Referência documental das parcelas (não entra em manifestoTracked).
  void fuelFe;
  void maintenanceFe;
  void tireFe;

  return {
    disclaimer: HML_MANIFEST_DISCLAIMER,
    successCriteria: HML_SUCCESS_CRITERIA,
    phases,
    totals,
  };
}

export function compareExecutedToExpected(
  expected: HmlExpectedPlan['totals'],
  executed: {
    primary: number;
    auxiliary: number;
    statusUpdates: number;
    financialIntegrationCalls: number;
    financialEntriesCreated: number;
    ignoredOptional: number;
  },
  abortedPhase: string | null,
): {
  ok: boolean;
  divergences: Array<{metric: string; expected: number; executed: number; delta: number}>;
} {
  const pairs: Array<[string, number, number]> = [
    ['primary', expected.primary, executed.primary],
    ['auxiliary', expected.auxiliary, executed.auxiliary],
    ['statusUpdates', expected.statusUpdates, executed.statusUpdates],
    [
      'financialIntegrationCalls',
      expected.financialIntegrationCalls,
      executed.financialIntegrationCalls,
    ],
    [
      'financialEntriesCreated',
      expected.financialEntriesCreated,
      executed.financialEntriesCreated,
    ],
    ['ignoredOptional', 0, executed.ignoredOptional],
  ];

  const divergences = pairs
    .filter(([, exp, got]) => exp !== got)
    .map(([metric, exp, got]) => ({
      metric,
      expected: exp,
      executed: got,
      delta: got - exp,
    }));

  if (abortedPhase) {
    divergences.push({
      metric: 'abortedPhase',
      expected: 0,
      executed: 1,
      delta: 1,
    });
  }

  return {ok: divergences.length === 0, divergences};
}
