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
  description: string;
  categorySlug: string;
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

function resolvePaymentStatus(input: CreateFinancialEntryFromOperationInput): {
  entryStatus: 'paid' | 'pending';
  dueDate: string | null;
  paidAt: string | null;
} {
  if (input.paymentType === 'credit') {
    const dueDate = input.dueDate?.slice(0, 10) ?? null;
    if (!dueDate) {
      throw new Error('Informe o vencimento para pagamento a prazo.');
    }
    return {entryStatus: 'pending', dueDate, paidAt: null};
  }

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

async function findExistingOperationEntry(
  supabase: SupabaseClient,
  companyId: string,
  input: Pick<CreateFinancialEntryFromOperationInput, 'sourceModule' | 'sourceId' | 'relations'>,
): Promise<FinancialEntry | null> {
  const relations = input.relations ?? {};

  const relationLookups: Array<Promise<FinancialEntry[]>> = [];
  if (relations.fuelRecordId) {
    relationLookups.push(
      listFinancialEntriesByRelation(supabase, companyId, {
        fuelRecordId: relations.fuelRecordId,
      }),
    );
  }
  if (relations.maintenanceRecordId) {
    relationLookups.push(
      listFinancialEntriesByRelation(supabase, companyId, {
        maintenanceRecordId: relations.maintenanceRecordId,
      }),
    );
  }
  if (relations.tireId) {
    relationLookups.push(
      listFinancialEntriesByRelation(supabase, companyId, {
        tireId: relations.tireId,
      }),
    );
  }

  if (relationLookups.length > 0) {
    const results = await Promise.all(relationLookups);
    for (const entries of results) {
      const active = entries.find((entry) => entry.entryStatus !== 'reversed');
      if (active) return active;
    }
  }

  const {data, error} = await supabase
    .from('financial_entries')
    .select('id')
    .eq('company_id', companyId)
    .eq('source_module', input.sourceModule)
    .eq('source_id', input.sourceId)
    .is('deleted_at', null)
    .neq('entry_status', 'reversed')
    .order('created_at', {ascending: false})
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) return null;
  return getFinancialEntryById(supabase, companyId, data.id);
}

/**
 * Central entry-point for operational → financial integration.
 * Operational modules must not create financial_entries directly.
 */
export async function createFinancialEntryFromOperation(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateFinancialEntryFromOperationInput,
  profileId: string,
): Promise<FinancialEntry | null> {
  if (input.amount <= 0) return null;

  const existing = await findExistingOperationEntry(supabase, companyId, input);
  if (existing) {
    return syncFinancialEntryFromOperation(supabase, companyId, existing, input, profileId);
  }

  const payment = resolvePaymentStatus(input);
  const category = await getCategoryBySlug(supabase, companyId, input.categorySlug);
  const costCenterId = await resolveOperationCostCenterId(supabase, companyId, input);

  return createFinancialEntry(
    supabase,
    companyId,
    {
      branchId: input.branchId ?? null,
      vehicleId: input.vehicleId ?? null,
      driverId: input.driverId ?? null,
      tripId: input.tripId ?? null,
      categoryId: category?.id ?? null,
      costCenterId,
      entryType: 'expense',
      entryStatus: payment.entryStatus,
      description: input.description,
      referenceNumber: input.referenceNumber ?? null,
      supplier: input.supplier ?? null,
      client: null,
      amount: input.amount,
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
      metadata: {
        ...(input.metadata ?? {}),
        payment_type: input.paymentType,
      },
    },
  );
}

/**
 * Sync an existing system-generated entry from an operational record update.
 */
export async function syncFinancialEntryFromOperation(
  supabase: SupabaseClient,
  companyId: string,
  existing: FinancialEntry,
  input: CreateFinancialEntryFromOperationInput,
  profileId: string,
): Promise<FinancialEntry | null> {
  if (existing.entryStatus === 'reversed') return existing;
  if (!existing.isSystemGenerated) return existing;
  if (input.amount <= 0) return existing;

  const payment = resolvePaymentStatus(input);
  const costCenterId = await resolveOperationCostCenterId(supabase, companyId, input);

  // Preserve settlement done in Contas a Pagar / Fluxo de Caixa.
  const alreadyPaid = existing.entryStatus === 'paid';
  const entryStatus = alreadyPaid ? 'paid' : payment.entryStatus;
  const dueDate = alreadyPaid ? existing.dueDate : payment.dueDate;
  const paidAt = alreadyPaid ? existing.paidAt : payment.paidAt;

  const {error} = await supabase
    .from('financial_entries')
    .update({
      amount: input.amount,
      entry_status: entryStatus,
      entry_date: input.entryDate.slice(0, 10),
      due_date: dueDate,
      paid_at: paidAt,
      description: input.description,
      reference_number: input.referenceNumber ?? existing.referenceNumber,
      supplier: input.supplier ?? existing.supplier,
      notes: input.notes ?? existing.notes,
      vehicle_id: input.vehicleId ?? null,
      driver_id: input.driverId ?? null,
      trip_id: input.tripId ?? null,
      branch_id: input.branchId ?? null,
      cost_center_id: costCenterId,
      source_module: input.sourceModule,
      source_id: input.sourceId,
      ...buildRelationExtra(input.relations),
      metadata: {
        ...(existing.metadata ?? {}),
        ...(input.metadata ?? {}),
        payment_type: input.paymentType,
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

/** Upsert helper used by integration hooks. */
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
  const entries = await listFinancialEntriesByRelation(supabase, companyId, {
    fuelRecordId: relation.fuelRecordId ?? undefined,
    maintenanceRecordId: relation.maintenanceRecordId ?? undefined,
    tireId: relation.tireId ?? undefined,
  });

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
