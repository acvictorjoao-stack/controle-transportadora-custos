import type {SupabaseClient} from '@supabase/supabase-js';

import type {FuelRecord} from '@/features/fuel/types';
import type {MaintenanceRecord} from '@/features/maintenance/types';
import type {Tire} from '@/features/tires/types';
import type {Trip} from '@/features/trips/types';

import {
  createFinancialEntry,
  getCategoryBySlug,
} from '../queries/financial-entries';
import {
  deleteFinancialEntriesFromOperation,
  resolveOperationPaymentType,
  upsertFinancialEntryFromOperation,
} from './operation-financial.service';

async function resolveTireIdForMaintenance(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
): Promise<string | null> {
  const {data} = await supabase
    .from('tires')
    .select('id')
    .eq('company_id', companyId)
    .eq('maintenance_record_id', maintenanceRecordId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function onLinkedFinancialEntryDeleted(
  supabase: SupabaseClient,
  companyId: string,
  profileId: string,
  relation: {
    fuelRecordId?: string;
    maintenanceRecordId?: string;
    tireId?: string;
  },
): Promise<void> {
  await deleteFinancialEntriesFromOperation(supabase, companyId, profileId, relation);
}

export async function onFuelRecordCreated(
  supabase: SupabaseClient,
  companyId: string,
  record: FuelRecord,
  profileId: string,
): Promise<void> {
  const paymentType = resolveOperationPaymentType(record.paymentType);
  await upsertFinancialEntryFromOperation(
    supabase,
    companyId,
    {
      sourceModule: 'fuel',
      sourceId: record.id,
      paymentType,
      amount: record.totalAmount,
      entryDate: record.fueledAt.slice(0, 10),
      dueDate: record.paymentDueDate,
      installmentCount: record.installmentCount,
      installmentIntervalDays: record.installmentIntervalDays,
      description: `Abastecimento — ${record.stationName ?? record.vehiclePlate ?? record.id}`,
      categorySlug: 'combustivel',
      supplierId: record.supplierId,
      supplier: record.stationName,
      branchId: record.branchId,
      vehicleId: record.vehicleId,
      driverId: record.driverId,
      tripId: record.tripId,
      notes: record.notes,
      paidAt: record.fueledAt,
      relations: {fuelRecordId: record.id},
    },
    profileId,
  );
}

export async function onFuelRecordUpdated(
  supabase: SupabaseClient,
  companyId: string,
  record: FuelRecord,
  profileId: string,
): Promise<void> {
  await onFuelRecordCreated(supabase, companyId, record, profileId);
}

export async function onMaintenanceRecordCreated(
  supabase: SupabaseClient,
  companyId: string,
  record: MaintenanceRecord,
  profileId: string,
): Promise<void> {
  const amount = record.finalAmount ?? record.totalCost ?? record.estimatedAmount ?? 0;
  if (amount <= 0) return;

  const paymentType = resolveOperationPaymentType(record.paymentType);
  const entryDate = (record.completedAt ?? record.openedAt).slice(0, 10);
  const tireId =
    record.maintenanceType === 'tires'
      ? await resolveTireIdForMaintenance(supabase, companyId, record.id)
      : null;

  await upsertFinancialEntryFromOperation(
    supabase,
    companyId,
    {
      sourceModule: 'maintenance',
      sourceId: record.id,
      paymentType,
      amount,
      entryDate,
      dueDate: record.paymentDueDate,
      installmentCount: record.installmentCount,
      installmentIntervalDays: record.installmentIntervalDays,
      description: `Manutenção — ${record.description ?? record.vehiclePlate ?? record.id}`,
      categorySlug: 'manutencao',
      supplierId: record.supplierId,
      supplier: record.supplier,
      branchId: record.branchId,
      vehicleId: record.vehicleId,
      // RC 27.1 — custo de manutenção rateado por KM do veículo (sem vínculo de viagem)
      driverId: null,
      tripId: null,
      referenceNumber: record.externalId,
      notes: record.notes,
      paidAt: record.completedAt ?? record.openedAt,
      relations: {
        maintenanceRecordId: record.id,
        tireId,
      },
    },
    profileId,
  );
}

export async function onTireCostUpdated(
  supabase: SupabaseClient,
  companyId: string,
  tire: Tire,
  profileId: string,
): Promise<void> {
  const purchaseCost = tire.purchaseValue ?? 0;
  const accumulatedCost = purchaseCost + (tire.totalRecapCost ?? 0);
  if (accumulatedCost <= 0) return;

  const paymentType = resolveOperationPaymentType(tire.paymentType);

  await upsertFinancialEntryFromOperation(
    supabase,
    companyId,
    {
      sourceModule: 'tires',
      sourceId: tire.id,
      paymentType,
      amount: accumulatedCost,
      entryDate: tire.purchaseDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      dueDate: tire.paymentDueDate,
      installmentCount: tire.installmentCount,
      installmentIntervalDays: tire.installmentIntervalDays,
      description: `Pneu — ${tire.brand ?? ''} ${tire.model ?? ''}`.trim() || `Pneu — ${tire.id}`,
      categorySlug: 'pneus',
      supplierId: tire.supplierId,
      supplier: tire.supplier,
      branchId: tire.branchId,
      vehicleId: tire.vehicleId,
      referenceNumber: tire.serialNumber,
      paidAt: tire.purchaseDate
        ? `${tire.purchaseDate.slice(0, 10)}T12:00:00.000Z`
        : new Date().toISOString(),
      relations: {
        tireId: tire.id,
        maintenanceRecordId: tire.maintenanceRecordId,
      },
      metadata: {accumulated_cost: accumulatedCost},
    },
    profileId,
  );
}

export async function onTripCompleted(
  supabase: SupabaseClient,
  companyId: string,
  trip: Trip,
  profileId: string,
): Promise<void> {
  const {data: financialRows} = await supabase
    .from('financial_entries')
    .select('entry_type, amount')
    .eq('company_id', companyId)
    .eq('trip_id', trip.id)
    .is('deleted_at', null);

  const totalExpenses = (financialRows ?? [])
    .filter((row) => row.entry_type === 'expense')
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const totalRevenue = (financialRows ?? [])
    .filter((row) => row.entry_type === 'revenue')
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const metadataRevenue =
    typeof trip.metadata?.freight_value === 'number' ? trip.metadata.freight_value : 0;
  const revenue =
    totalRevenue > 0
      ? totalRevenue
      : (trip.contractedFreightValue ?? trip.actualFreightValue ?? metadataRevenue);

  const freightMargin =
    trip.contractedFreightValue !== null && trip.actualFreightValue !== null
      ? trip.actualFreightValue - trip.contractedFreightValue
      : revenue - totalExpenses;

  await supabase
    .from('trips')
    .update({
      actual_freight_value: trip.actualFreightValue ?? revenue,
      freight_margin: freightMargin,
      metadata: {
        ...(trip.metadata ?? {}),
        profitability: {
          revenue,
          expenses: totalExpenses,
          profit: revenue - totalExpenses,
          margin_percent: revenue > 0 ? ((revenue - totalExpenses) / revenue) * 100 : 0,
          calculated_at: new Date().toISOString(),
        },
        billing_ready: true,
      },
      updated_by: profileId,
    })
    .eq('id', trip.id)
    .eq('company_id', companyId);

  if (revenue > 0 && totalRevenue === 0) {
    const category = await getCategoryBySlug(supabase, companyId, 'receitas');
    await createFinancialEntry(
      supabase,
      companyId,
      {
        branchId: trip.branchId,
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
        tripId: trip.id,
        categoryId: category?.id ?? null,
        costCenterId: null,
        entryType: 'revenue',
        entryStatus: 'paid',
        description: `Receita viagem ${trip.tripNumber}`,
        referenceNumber: trip.tripNumber,
        supplierId: null,
        supplier: null,
        client: null,
        amount: revenue,
        currency: 'BRL',
        entryDate: (trip.arrivedAt ?? new Date().toISOString()).slice(0, 10),
        dueDate: null,
        notes: null,
      },
      profileId,
      {
        source_module: 'trips',
        source_id: trip.id,
        is_system_generated: true,
        paid_at: trip.arrivedAt,
        customer_id: trip.customerId,
        customer_contract_id: trip.customerContractId,
      },
    );
  }
}
