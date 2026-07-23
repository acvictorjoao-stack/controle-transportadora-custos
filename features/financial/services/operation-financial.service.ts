import type {SupabaseClient} from '@supabase/supabase-js';

import {resolveCostCenter} from '@/features/cost-centers/services';

import type {OperationPaymentType} from '../constants/operation-financial';
import {
  createFinancialEntry,
  getFinancialEntryById,
  listFinancialEntriesByRelation,
  softDeleteFinancialEntry,
  getCategoryBySlug,
} from '../queries/financial-entries';
import type {FinancialEntry} from '../types';
import {
  buildInstallmentSchedule,
  DEFAULT_INSTALLMENT_INTERVAL_DAYS,
  formatInstallmentLabel,
  type InstallmentScheduleItem,
} from '../utils/installment-schedule';

export interface OperationFinancialRelationIds {
  fuelRecordId?: string | null;
  maintenanceRecordId?: string | null;
  tireId?: string | null;
  tripId?: string | null;
}

export interface CreateFinancialEntryFromOperationInput {
  sourceModule: string;
  sourceId: string;
  paymentType: OperationPaymentType;
  amount: number;
  entryDate: string;
  dueDate?: string | null;
  /** Number of Contas a Pagar parcels when paymentType = credit. */
  installmentCount?: number | null;
  /** Days between installment due dates (default 30). */
  installmentIntervalDays?: number | null;
  description: string;
  categorySlug: string;
  supplierId?: string | null;
  supplier?: string | null;
  branchId?: string | null;
  vehicleId?: string | null;
  driverId?: string | null;
  tripId?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  paidAt?: string | null;
  costCenterId?: string | null;
  metadata?: Record<string, unknown>;
  relations?: OperationFinancialRelationIds;
}

async function resolveOperationCostCenterId(
  supabase: SupabaseClient,
  companyId: string,
  input: Pick<CreateFinancialEntryFromOperationInput, 'costCenterId' | 'sourceModule'>,
): Promise<string | null> {
  if (input.costCenterId) return input.costCenterId;
  return resolveCostCenter(supabase, companyId, {
    sourceModule: input.sourceModule,
  });
}

function resolveCashPayment(input: CreateFinancialEntryFromOperationInput): {
  entryStatus: 'paid';
  dueDate: null;
  paidAt: string;
} {
  return {
    entryStatus: 'paid',
    dueDate: null,
    paidAt: input.paidAt ?? `${input.entryDate.slice(0, 10)}T12:00:00.000Z`,
  };
}

function buildRelationExtra(relations?: OperationFinancialRelationIds): Record<string, unknown> {
  if (!relations) return {};
  return {
    fuel_record_id: relations.fuelRecordId ?? null,
    maintenance_record_id: relations.maintenanceRecordId ?? null,
    tire_id: relations.tireId ?? null,
  };
}

function resolveInstallmentNumber(entry: FinancialEntry): number {
  if (typeof entry.installmentNumber === 'number' && entry.installmentNumber >= 1) {
    return entry.installmentNumber;
  }
  const meta = entry.metadata?.installment_number;
  if (typeof meta === 'number' && meta >= 1) return meta;
  return 1;
}

function buildInstallmentDescription(
  baseDescription: string,
  installmentNumber: number,
  installmentTotal: number,
): string {
  if (installmentTotal <= 1) return baseDescription;
  return `${baseDescription} — ${formatInstallmentLabel(installmentNumber, installmentTotal)}`;
}

function resolveSchedule(
  input: CreateFinancialEntryFromOperationInput,
): InstallmentScheduleItem[] {
  if (input.paymentType !== 'credit') {
    return [{number: 1, amount: input.amount, dueDate: input.entryDate.slice(0, 10)}];
  }

  const dueDate = input.dueDate?.slice(0, 10) ?? null;
  if (!dueDate) {
    throw new Error('Informe o vencimento para pagamento a prazo.');
  }

  const count = Math.max(1, Math.floor(input.installmentCount ?? 1));
  const intervalDays =
    input.installmentIntervalDays && input.installmentIntervalDays > 0
      ? Math.floor(input.installmentIntervalDays)
      : DEFAULT_INSTALLMENT_INTERVAL_DAYS;

  return buildInstallmentSchedule({
    totalAmount: input.amount,
    installmentCount: count,
    firstDueDate: dueDate,
    intervalDays,
  });
}

async function listExistingOperationEntries(
  supabase: SupabaseClient,
  companyId: string,
  input: Pick<CreateFinancialEntryFromOperationInput, 'sourceModule' | 'sourceId' | 'relations'>,
): Promise<FinancialEntry[]> {
  const relations = input.relations ?? {};
  const limit = 120;

  if (relations.fuelRecordId) {
    return listFinancialEntriesByRelation(
      supabase,
      companyId,
      {fuelRecordId: relations.fuelRecordId},
      {limit},
    );
  }
  if (relations.maintenanceRecordId) {
    return listFinancialEntriesByRelation(
      supabase,
      companyId,
      {maintenanceRecordId: relations.maintenanceRecordId},
      {limit},
    );
  }
  if (relations.tireId) {
    return listFinancialEntriesByRelation(
      supabase,
      companyId,
      {tireId: relations.tireId},
      {limit},
    );
  }

  const {data, error} = await supabase
    .from('financial_entries')
    .select('id')
    .eq('company_id', companyId)
    .eq('source_module', input.sourceModule)
    .eq('source_id', input.sourceId)
    .is('deleted_at', null)
    .neq('entry_status', 'reversed')
    .order('created_at', {ascending: true})
    .limit(limit);

  if (error || !data?.length) return [];

  const entries = await Promise.all(
    data.map((row) => getFinancialEntryById(supabase, companyId, row.id)),
  );
  return entries.filter((entry): entry is FinancialEntry => entry != null);
}

async function createInstallmentEntry(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateFinancialEntryFromOperationInput,
  profileId: string,
  installment: InstallmentScheduleItem,
  installmentTotal: number,
  categoryId: string | null,
  costCenterId: string | null,
): Promise<FinancialEntry> {
  const isCredit = input.paymentType === 'credit';
  const payment = isCredit
    ? {entryStatus: 'pending' as const, dueDate: installment.dueDate, paidAt: null}
    : resolveCashPayment(input);

  return createFinancialEntry(
    supabase,
    companyId,
    {
      branchId: input.branchId ?? null,
      vehicleId: input.vehicleId ?? null,
      driverId: input.driverId ?? null,
      tripId: input.tripId ?? null,
      categoryId,
      costCenterId,
      entryType: 'expense',
      entryStatus: payment.entryStatus,
      description: buildInstallmentDescription(
        input.description,
        installment.number,
        installmentTotal,
      ),
      referenceNumber: input.referenceNumber ?? null,
      supplierId: input.supplierId ?? null,
      supplier: input.supplier ?? null,
      client: null,
      amount: installment.amount,
      currency: 'BRL',
      entryDate: input.entryDate.slice(0, 10),
      dueDate: payment.dueDate,
      notes: input.notes ?? null,
    },
    profileId,
    {
      ...buildRelationExtra(input.relations),
      source_module: input.sourceModule,
      source_id: input.sourceId,
      is_system_generated: true,
      paid_at: payment.paidAt,
      installment_number: installment.number,
      installment_total: installmentTotal,
      metadata: {
        ...(input.metadata ?? {}),
        payment_type: input.paymentType,
        installment_number: installment.number,
        installment_total: installmentTotal,
        installment_interval_days:
          input.installmentIntervalDays ?? DEFAULT_INSTALLMENT_INTERVAL_DAYS,
      },
    },
  );
}

async function syncInstallmentEntry(
  supabase: SupabaseClient,
  companyId: string,
  existing: FinancialEntry,
  input: CreateFinancialEntryFromOperationInput,
  profileId: string,
  installment: InstallmentScheduleItem,
  installmentTotal: number,
  costCenterId: string | null,
): Promise<FinancialEntry | null> {
  if (existing.entryStatus === 'reversed') return existing;
  if (!existing.isSystemGenerated) return existing;

  const isCredit = input.paymentType === 'credit';
  const payment = isCredit
    ? {entryStatus: 'pending' as const, dueDate: installment.dueDate, paidAt: null}
    : resolveCashPayment(input);

  // Preserve settlement done in Contas a Pagar / Fluxo de Caixa.
  const alreadyPaid = existing.entryStatus === 'paid';
  const entryStatus = alreadyPaid ? 'paid' : payment.entryStatus;
  const dueDate = alreadyPaid ? existing.dueDate : payment.dueDate;
  const paidAt = alreadyPaid ? existing.paidAt : payment.paidAt;

  const {error} = await supabase
    .from('financial_entries')
    .update({
      amount: installment.amount,
      entry_status: entryStatus,
      entry_date: input.entryDate.slice(0, 10),
      due_date: dueDate,
      paid_at: paidAt,
      description: buildInstallmentDescription(
        input.description,
        installment.number,
        installmentTotal,
      ),
      reference_number: input.referenceNumber ?? existing.referenceNumber,
      supplier_id: input.supplierId ?? existing.supplierId,
      supplier: input.supplier ?? existing.supplier,
      notes: input.notes ?? existing.notes,
      vehicle_id: input.vehicleId ?? null,
      driver_id: input.driverId ?? null,
      trip_id: input.tripId ?? null,
      branch_id: input.branchId ?? null,
      cost_center_id: costCenterId,
      source_module: input.sourceModule,
      source_id: input.sourceId,
      installment_number: installment.number,
      installment_total: installmentTotal,
      ...buildRelationExtra(input.relations),
      metadata: {
        ...(existing.metadata ?? {}),
        ...(input.metadata ?? {}),
        payment_type: input.paymentType,
        installment_number: installment.number,
        installment_total: installmentTotal,
        installment_interval_days:
          input.installmentIntervalDays ?? DEFAULT_INSTALLMENT_INTERVAL_DAYS,
      },
      updated_by: profileId,
    })
    .eq('id', existing.id)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(error.message);
  }

  return getFinancialEntryById(supabase, companyId, existing.id);
}

/**
 * Creates or syncs N financial entries (Contas a Pagar parcels when credit).
 * Amounts sum to the operational total — DRE/rateio see the full cost without
 * a separate parent row.
 */
export async function upsertFinancialInstallmentsFromOperation(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateFinancialEntryFromOperationInput,
  profileId: string,
): Promise<FinancialEntry[]> {
  if (input.amount <= 0) return [];

  const schedule = resolveSchedule(input);
  const installmentTotal = schedule.length;
  const category = await getCategoryBySlug(supabase, companyId, input.categorySlug);
  const costCenterId = await resolveOperationCostCenterId(supabase, companyId, input);
  const existing = (await listExistingOperationEntries(supabase, companyId, input)).filter(
    (entry) => entry.entryStatus !== 'reversed',
  );

  const byNumber = new Map<number, FinancialEntry>();
  for (const entry of existing) {
    const number = resolveInstallmentNumber(entry);
    if (!byNumber.has(number)) byNumber.set(number, entry);
  }

  const result: FinancialEntry[] = [];

  for (const installment of schedule) {
    const current = byNumber.get(installment.number);
    if (current) {
      const synced = await syncInstallmentEntry(
        supabase,
        companyId,
        current,
        input,
        profileId,
        installment,
        installmentTotal,
        costCenterId,
      );
      if (synced) result.push(synced);
      byNumber.delete(installment.number);
      continue;
    }

    const created = await createInstallmentEntry(
      supabase,
      companyId,
      input,
      profileId,
      installment,
      installmentTotal,
      category?.id ?? null,
      costCenterId,
    );
    result.push(created);
  }

  // Soft-delete parcels that are no longer part of the plan (e.g. 3 → 1).
  for (const leftover of byNumber.values()) {
    if (leftover.entryStatus === 'reversed') continue;
    try {
      await softDeleteFinancialEntry(supabase, companyId, leftover.id, profileId);
    } catch {
      // Financial integration must not block source record updates
    }
  }

  return result;
}

/**
 * Central entry-point for operational → financial integration.
 * Operational modules must not create financial_entries directly.
 * @returns First installment entry (compat with previous 1:1 callers).
 */
export async function createFinancialEntryFromOperation(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateFinancialEntryFromOperationInput,
  profileId: string,
): Promise<FinancialEntry | null> {
  const entries = await upsertFinancialInstallmentsFromOperation(
    supabase,
    companyId,
    input,
    profileId,
  );
  return entries[0] ?? null;
}

/**
 * @deprecated Prefer upsertFinancialInstallmentsFromOperation for multi-parcel plans.
 * Kept for single-entry sync callers.
 */
export async function syncFinancialEntryFromOperation(
  supabase: SupabaseClient,
  companyId: string,
  existing: FinancialEntry,
  input: CreateFinancialEntryFromOperationInput,
  profileId: string,
): Promise<FinancialEntry | null> {
  const costCenterId = await resolveOperationCostCenterId(supabase, companyId, input);
  const schedule = resolveSchedule(input);
  const installment = schedule[0];
  if (!installment) return existing;

  return syncInstallmentEntry(
    supabase,
    companyId,
    existing,
    input,
    profileId,
    installment,
    schedule.length,
    costCenterId,
  );
}

/** Upsert helper used by integration hooks (supports installment plans). */
export async function upsertFinancialEntryFromOperation(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateFinancialEntryFromOperationInput,
  profileId: string,
): Promise<FinancialEntry | null> {
  return createFinancialEntryFromOperation(supabase, companyId, input, profileId);
}

export async function deleteFinancialEntriesFromOperation(
  supabase: SupabaseClient,
  companyId: string,
  profileId: string,
  relation: OperationFinancialRelationIds,
): Promise<void> {
  const entries = await listFinancialEntriesByRelation(
    supabase,
    companyId,
    {
      fuelRecordId: relation.fuelRecordId ?? undefined,
      maintenanceRecordId: relation.maintenanceRecordId ?? undefined,
      tireId: relation.tireId ?? undefined,
    },
    {limit: 120},
  );

  for (const entry of entries) {
    if (entry.entryStatus === 'reversed') continue;
    try {
      await softDeleteFinancialEntry(supabase, companyId, entry.id, profileId);
    } catch {
      // Financial integration must not block source record deletion
    }
  }
}

export function resolveOperationPaymentType(
  value: string | null | undefined,
): OperationPaymentType {
  return value === 'credit' ? 'credit' : 'cash';
}
