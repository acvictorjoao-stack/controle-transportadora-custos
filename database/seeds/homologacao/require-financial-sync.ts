import type {SupabaseClient} from '@supabase/supabase-js';

import type {FuelRecord} from '@/features/fuel/types';
import type {MaintenanceRecord} from '@/features/maintenance/types';
import type {Tire} from '@/features/tires/types';
import type {Trip} from '@/features/trips/types';

import {expectedInstallmentsFromPayment} from './expected-plan';
import type {HmlExecutionTracker} from './execution-report';

/**
 * Valida lançamentos financeiros já persistidos pelos hooks de domínio / sync de folha.
 * Não reexecuta hooks operacionais (evita chamada duplicada para “compensar” falha silenciosa).
 * Folha: o caller passa `runPayrollSync` exatamente uma vez; depois só verificamos o banco.
 */

export type HmlFinancialPersistFn = (input: {
  entity: string;
  key: string;
  id: string;
  relatedIds: string[];
  expectedFinancialEntries: number;
  phase: string;
}) => void;

async function listFinancialIdsBySource(
  supabase: SupabaseClient,
  companyId: string,
  sourceModule: string,
  sourceId: string,
): Promise<string[]> {
  const {data, error} = await supabase
    .from('financial_entries')
    .select('id, source_id, source_module')
    .eq('company_id', companyId)
    .eq('source_module', sourceModule)
    .eq('source_id', sourceId)
    .is('deleted_at', null)
    .neq('entry_status', 'reversed')
    .neq('entry_type', 'reversal');

  if (error) {
    throw new Error(`Falha ao verificar lançamentos (${sourceModule}): ${error.message}`);
  }

  const ids: string[] = [];
  for (const row of data ?? []) {
    if (row.source_id !== sourceId || row.source_module !== sourceModule) {
      throw new Error(
        `Lançamento financeiro com vínculo incorreto para ${sourceModule}/${sourceId}.`,
      );
    }
    if (typeof row.id === 'string' && row.id) ids.push(row.id);
  }
  return ids;
}

async function listTripRevenueIds(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<string[]> {
  const bySource = await listFinancialIdsBySource(supabase, companyId, 'trips', tripId);
  if (bySource.length > 0) return bySource;

  const {data, error} = await supabase
    .from('financial_entries')
    .select('id, trip_id, entry_type')
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .eq('entry_type', 'revenue')
    .is('deleted_at', null);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => row.trip_id === tripId)
    .map((row) => row.id as string)
    .filter(Boolean);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function assertExactCount(
  ids: string[],
  expected: number,
  label: string,
  sourceId: string,
): void {
  if (ids.length !== expected) {
    throw new Error(
      `${label}: esperado ${expected} lançamento(s) financeiro(s) para ${sourceId}, encontrado(s) ${ids.length}.`,
    );
  }
}

function recordFinancialSuccess(
  tracker: HmlExecutionTracker,
  persist: HmlFinancialPersistFn | undefined,
  input: {
    phase: string;
    entity: string;
    key: string;
    id: string;
    relatedIds: string[];
    expectedFinancialEntries: number;
  },
): void {
  tracker.recordSuccess({
    phase: input.phase,
    entity: input.entity,
    key: input.key,
    table: 'financial_entries',
    kind: 'financial_integration',
    operation: 'sync',
    id: input.id,
    relatedIds: input.relatedIds,
    expectedFinancialEntries: input.expectedFinancialEntries,
  });
  persist?.({
    entity: input.entity,
    key: input.key,
    id: input.id,
    relatedIds: input.relatedIds,
    expectedFinancialEntries: input.expectedFinancialEntries,
    phase: input.phase,
  });
}

function failFinancial(
  tracker: HmlExecutionTracker,
  phase: string,
  entity: string,
  key: string,
  sourceId: string,
  expected: number,
  error: unknown,
): never {
  const message = errorMessage(error);
  tracker.recordFailure({
    phase,
    entity,
    key,
    table: 'financial_entries',
    kind: 'financial_integration',
    operation: 'sync',
    id: sourceId,
    expectedFinancialEntries: expected,
    error: message,
  });
  tracker.abort(phase, `Integração financeira obrigatória (${key}) falhou: ${message}`);
}

/** Assert-only: combustível (hook já rodou no create do domínio). */
export async function assertFuelFinancialSync(
  supabase: SupabaseClient,
  companyId: string,
  record: FuelRecord,
  tracker: HmlExecutionTracker,
  key: string,
  persist?: HmlFinancialPersistFn,
): Promise<string[]> {
  const phase = 'fuel';
  const expected = expectedInstallmentsFromPayment(
    record.paymentType,
    record.installmentCount,
  );
  try {
    if (record.totalAmount <= 0) {
      throw new Error(`Abastecimento ${record.id} sem valor financeiro.`);
    }
    const ids = await listFinancialIdsBySource(supabase, companyId, 'fuel', record.id);
    assertExactCount(ids, expected, 'Combustível', record.id);
    recordFinancialSuccess(tracker, persist, {
      phase,
      entity: 'financial_integration_fuel',
      key,
      id: ids[0]!,
      relatedIds: ids,
      expectedFinancialEntries: expected,
    });
    return ids;
  } catch (error) {
    failFinancial(
      tracker,
      phase,
      'financial_integration_fuel',
      key,
      record.id,
      expected,
      error,
    );
  }
}

/** Assert-only: manutenção. */
export async function assertMaintenanceFinancialSync(
  supabase: SupabaseClient,
  companyId: string,
  record: MaintenanceRecord,
  tracker: HmlExecutionTracker,
  key: string,
  persist?: HmlFinancialPersistFn,
): Promise<string[]> {
  const phase = 'maintenance';
  const amount = record.finalAmount ?? record.totalCost ?? record.estimatedAmount ?? 0;
  const expected =
    amount > 0
      ? expectedInstallmentsFromPayment(record.paymentType, record.installmentCount)
      : 0;
  try {
    const ids = await listFinancialIdsBySource(
      supabase,
      companyId,
      'maintenance',
      record.id,
    );
    assertExactCount(ids, expected, 'Manutenção', record.id);
    if (expected === 0) {
      recordFinancialSuccess(tracker, persist, {
        phase,
        entity: 'financial_integration_maintenance',
        key,
        id: record.id,
        relatedIds: [],
        expectedFinancialEntries: 0,
      });
      return [];
    }
    recordFinancialSuccess(tracker, persist, {
      phase,
      entity: 'financial_integration_maintenance',
      key,
      id: ids[0]!,
      relatedIds: ids,
      expectedFinancialEntries: expected,
    });
    return ids;
  } catch (error) {
    failFinancial(
      tracker,
      phase,
      'financial_integration_maintenance',
      key,
      record.id,
      expected,
      error,
    );
  }
}

/** Assert-only: pneus. */
export async function assertTireFinancialSync(
  supabase: SupabaseClient,
  companyId: string,
  tire: Tire,
  tracker: HmlExecutionTracker,
  key: string,
  persist?: HmlFinancialPersistFn,
): Promise<string[]> {
  const phase = 'tires';
  const amount = (tire.purchaseValue ?? 0) + (tire.totalRecapCost ?? 0);
  const expected =
    amount > 0
      ? expectedInstallmentsFromPayment(tire.paymentType, tire.installmentCount)
      : 0;
  try {
    const ids = await listFinancialIdsBySource(supabase, companyId, 'tires', tire.id);
    assertExactCount(ids, expected, 'Pneu', tire.id);
    if (expected === 0) {
      recordFinancialSuccess(tracker, persist, {
        phase,
        entity: 'financial_integration_tire',
        key,
        id: tire.id,
        relatedIds: [],
        expectedFinancialEntries: 0,
      });
      return [];
    }
    recordFinancialSuccess(tracker, persist, {
      phase,
      entity: 'financial_integration_tire',
      key,
      id: ids[0]!,
      relatedIds: ids,
      expectedFinancialEntries: expected,
    });
    return ids;
  } catch (error) {
    failFinancial(
      tracker,
      phase,
      'financial_integration_tire',
      key,
      tire.id,
      expected,
      error,
    );
  }
}

/** Assert-only: frete de viagem concluída (hook já disparado em completeTrip). */
export async function assertTripCompletedFinancialSync(
  supabase: SupabaseClient,
  companyId: string,
  trip: Trip,
  tracker: HmlExecutionTracker,
  key: string,
  persist?: HmlFinancialPersistFn,
): Promise<string[]> {
  const phase = 'trips';
  const freight = trip.actualFreightValue ?? trip.contractedFreightValue ?? 0;
  const expected = freight > 0 ? 1 : 0;
  try {
    const ids = await listTripRevenueIds(supabase, companyId, trip.id);
    assertExactCount(ids, expected, 'Viagem', trip.id);
    if (expected === 0) {
      recordFinancialSuccess(tracker, persist, {
        phase,
        entity: 'financial_integration_trip',
        key,
        id: trip.id,
        relatedIds: [],
        expectedFinancialEntries: 0,
      });
      return [];
    }
    recordFinancialSuccess(tracker, persist, {
      phase,
      entity: 'financial_integration_trip',
      key,
      id: ids[0]!,
      relatedIds: ids,
      expectedFinancialEntries: expected,
    });
    return ids;
  } catch (error) {
    failFinancial(
      tracker,
      phase,
      'financial_integration_trip',
      key,
      trip.id,
      expected,
      error,
    );
  }
}

/**
 * Folha: executa o sync oficial uma única vez (não há hook automático no create),
 * depois valida exatamente 1 lançamento (regra do payroll-financial.service).
 */
export async function runAndAssertPayrollFinancialSync(
  supabase: SupabaseClient,
  companyId: string,
  payrollExpenseId: string,
  runPayrollSync: () => Promise<void>,
  tracker: HmlExecutionTracker,
  key: string,
  persist?: HmlFinancialPersistFn,
): Promise<string[]> {
  const phase = 'payroll';
  const expected = 1;
  try {
    await runPayrollSync();
    const ids = await listFinancialIdsBySource(
      supabase,
      companyId,
      'payroll',
      payrollExpenseId,
    );
    assertExactCount(ids, expected, 'Folha', payrollExpenseId);
    recordFinancialSuccess(tracker, persist, {
      phase,
      entity: 'financial_integration_payroll',
      key,
      id: ids[0]!,
      relatedIds: ids,
      expectedFinancialEntries: expected,
    });
    return ids;
  } catch (error) {
    failFinancial(
      tracker,
      phase,
      'financial_integration_payroll',
      key,
      payrollExpenseId,
      expected,
      error,
    );
  }
}

/** @deprecated Use assert* / runAndAssert* — mantido só se algum import antigo restar. */
export const requireFuelFinancialSync = assertFuelFinancialSync;
export const requireMaintenanceFinancialSync = assertMaintenanceFinancialSync;
export const requireTireFinancialSync = assertTireFinancialSync;
export const requireTripCompletedFinancialSync = assertTripCompletedFinancialSync;
export const requirePayrollFinancialSync = runAndAssertPayrollFinancialSync;
