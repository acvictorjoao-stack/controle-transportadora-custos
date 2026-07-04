import type {SupabaseClient} from '@supabase/supabase-js';

import type {FuelRecord} from '@/features/fuel/types';
import type {MaintenanceRecord} from '@/features/maintenance/types';
import type {Tire} from '@/features/tires/types';
import type {Trip} from '@/features/trips/types';

import {
  createFinancialEntry,
  getCategoryBySlug,
  listFinancialEntriesByRelation,
  softDeleteFinancialEntry,
} from '../queries/financial-entries';

async function resolveVehicleCostCenter(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string | null,
): Promise<string | null> {
  if (!vehicleId) return null;

  const {data} = await supabase
    .from('financial_cost_centers')
    .select('id')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .eq('center_type', 'vehicle')
    .is('deleted_at', null)
    .maybeSingle();

  return data?.id ?? null;
}

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
  const entries = await listFinancialEntriesByRelation(supabase, companyId, relation);

  for (const entry of entries) {
    if (entry.entryStatus === 'reversed') continue;
    try {
      await softDeleteFinancialEntry(supabase, companyId, entry.id, profileId);
    } catch {
      // Financial integration must not block source record deletion
    }
  }
}

export async function onFuelRecordCreated(
  supabase: SupabaseClient,
  companyId: string,
  record: FuelRecord,
  profileId: string,
): Promise<void> {
  const existing = await listFinancialEntriesByRelation(supabase, companyId, {
    fuelRecordId: record.id,
  });
  if (existing.length > 0) return;

  const category = await getCategoryBySlug(supabase, companyId, 'combustivel');
  const costCenterId = await resolveVehicleCostCenter(supabase, companyId, record.vehicleId);

  await createFinancialEntry(
    supabase,
    companyId,
    {
      branchId: record.branchId,
      vehicleId: record.vehicleId,
      driverId: record.driverId,
      tripId: record.tripId,
      categoryId: category?.id ?? null,
      costCenterId,
      entryType: 'expense',
      entryStatus: 'paid',
      description: `Abastecimento — ${record.stationName ?? record.vehiclePlate ?? record.id}`,
      referenceNumber: null,
      amount: record.totalAmount,
      currency: 'BRL',
      entryDate: record.fueledAt.slice(0, 10),
      dueDate: null,
      notes: record.notes,
    },
    profileId,
    {
      fuel_record_id: record.id,
      source_module: 'fuel',
      is_system_generated: true,
      paid_at: record.fueledAt,
    },
  );
}

export async function onFuelRecordUpdated(
  supabase: SupabaseClient,
  companyId: string,
  record: FuelRecord,
  profileId: string,
): Promise<void> {
  const existing = await listFinancialEntriesByRelation(supabase, companyId, {
    fuelRecordId: record.id,
  });

  if (existing.length === 0) {
    await onFuelRecordCreated(supabase, companyId, record, profileId);
    return;
  }

  const entry = existing[0];
  if (!entry.isSystemGenerated || entry.entryStatus === 'reversed') return;

  const costCenterId = await resolveVehicleCostCenter(supabase, companyId, record.vehicleId);

  await supabase
    .from('financial_entries')
    .update({
      amount: record.totalAmount,
      entry_date: record.fueledAt.slice(0, 10),
      vehicle_id: record.vehicleId,
      driver_id: record.driverId,
      trip_id: record.tripId,
      branch_id: record.branchId,
      cost_center_id: costCenterId,
      paid_at: record.fueledAt,
      updated_by: profileId,
    })
    .eq('id', entry.id)
    .eq('company_id', companyId);
}

export async function onMaintenanceRecordCreated(
  supabase: SupabaseClient,
  companyId: string,
  record: MaintenanceRecord,
  profileId: string,
): Promise<void> {
  const amount = record.finalAmount ?? record.totalCost ?? record.estimatedAmount ?? 0;
  const existing = await listFinancialEntriesByRelation(supabase, companyId, {
    maintenanceRecordId: record.id,
  });

  const entryStatus = record.maintenanceStatus === 'completed' ? 'paid' : 'pending';
  const entryDate = (record.completedAt ?? record.openedAt).slice(0, 10);
  const tireId =
    record.maintenanceType === 'tires'
      ? await resolveTireIdForMaintenance(supabase, companyId, record.id)
      : null;

  if (existing.length > 0) {
    const entry = existing[0];
    if (entry.entryStatus === 'reversed') return;
    if (amount <= 0) return;

    await supabase
      .from('financial_entries')
      .update({
        amount,
        entry_status: entryStatus,
        entry_date: entryDate,
        vehicle_id: record.vehicleId,
        driver_id: record.driverId,
        trip_id: record.tripId,
        branch_id: record.branchId,
        paid_at: record.completedAt,
        tire_id: tireId ?? entry.tireId,
        updated_by: profileId,
      })
      .eq('id', entry.id)
      .eq('company_id', companyId);
    return;
  }

  if (amount <= 0) return;

  const category = await getCategoryBySlug(supabase, companyId, 'manutencao');
  const costCenterId = await resolveVehicleCostCenter(supabase, companyId, record.vehicleId);

  await createFinancialEntry(
    supabase,
    companyId,
    {
      branchId: record.branchId,
      vehicleId: record.vehicleId,
      driverId: record.driverId,
      tripId: record.tripId,
      categoryId: category?.id ?? null,
      costCenterId,
      entryType: 'expense',
      entryStatus,
      description: `Manutenção — ${record.description ?? record.vehiclePlate ?? record.id}`,
      referenceNumber: record.externalId,
      amount,
      currency: 'BRL',
      entryDate,
      dueDate: null,
      notes: record.notes,
    },
    profileId,
    {
      maintenance_record_id: record.id,
      tire_id: tireId,
      source_module: 'maintenance',
      is_system_generated: true,
      paid_at: record.completedAt,
    },
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

  const existing = await listFinancialEntriesByRelation(supabase, companyId, {
    tireId: tire.id,
  });

  const category = await getCategoryBySlug(supabase, companyId, 'pneus');
  const costCenterId = await resolveVehicleCostCenter(supabase, companyId, tire.vehicleId);

  if (existing.length === 0) {
    await createFinancialEntry(
      supabase,
      companyId,
      {
        branchId: tire.branchId,
        vehicleId: tire.vehicleId,
        driverId: null,
        tripId: null,
        categoryId: category?.id ?? null,
        costCenterId,
        entryType: 'expense',
        entryStatus: 'paid',
        description: `Pneu — ${tire.brand ?? ''} ${tire.model ?? ''}`.trim(),
        referenceNumber: tire.serialNumber,
        amount: accumulatedCost,
        currency: 'BRL',
        entryDate: tire.purchaseDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        dueDate: null,
        notes: null,
      },
      profileId,
      {
        tire_id: tire.id,
        maintenance_record_id: tire.maintenanceRecordId,
        source_module: 'tires',
        is_system_generated: true,
        metadata: {accumulated_cost: accumulatedCost},
      },
    );
    return;
  }

  const entry = existing[0];
  if (entry.entryStatus === 'reversed') return;

  await supabase
    .from('financial_entries')
    .update({
      amount: accumulatedCost,
      maintenance_record_id: tire.maintenanceRecordId,
      metadata: {...(entry.metadata ?? {}), accumulated_cost: accumulatedCost},
      updated_by: profileId,
    })
    .eq('id', entry.id)
    .eq('company_id', companyId);
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
  const revenue = totalRevenue > 0
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
        amount: revenue,
        currency: 'BRL',
        entryDate: (trip.arrivedAt ?? new Date().toISOString()).slice(0, 10),
        dueDate: null,
        notes: null,
      },
      profileId,
      {
        source_module: 'trips',
        is_system_generated: true,
        paid_at: trip.arrivedAt,
        customer_id: trip.customerId,
        customer_contract_id: trip.customerContractId,
      },
    );
  }
}
