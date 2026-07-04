import type {SupabaseClient} from '@supabase/supabase-js';

import {registerDriverDetailLoader} from '@/features/drivers/loaders';
import {registerFuelDetailLoader} from '@/features/fuel/loaders';
import {registerMaintenanceDetailLoader} from '@/features/maintenance/loaders';
import {registerTireDetailLoader} from '@/features/tires/loaders';
import {registerTripDetailLoader} from '@/features/trips/loaders';
import {registerVehicleDetailLoader} from '@/features/vehicles/loaders';

import {listFinancialEntriesByRelation} from '../queries/financial-entries';
import {
  toFuelFinancialRecord,
  toVehicleCostRecord,
} from '../services/mappers';

async function loadFuelFinancial(
  supabase: SupabaseClient,
  companyId: string,
  fuelRecordId: string,
) {
  const entries = await listFinancialEntriesByRelation(supabase, companyId, {fuelRecordId});
  return {financial: entries.map(toFuelFinancialRecord)};
}

async function loadMaintenanceFinancial(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
) {
  const entries = await listFinancialEntriesByRelation(supabase, companyId, {
    maintenanceRecordId,
  });
  return {
    financial: entries.map((entry) => ({
      id: entry.id,
      date: entry.entryDate,
      category: entry.categoryName ?? '—',
      description: entry.description,
      amount: entry.amount,
      status: entry.entryStatus,
    })),
  };
}

async function loadTireFinancial(
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
) {
  const entries = await listFinancialEntriesByRelation(supabase, companyId, {tireId});
  return {
    financial: entries.map((entry) => ({
      id: entry.id,
      date: entry.entryDate,
      category: entry.categoryName ?? '—',
      description: entry.description,
      amount: entry.amount,
      status: entry.entryStatus,
    })),
  };
}

async function loadTripFinancial(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
) {
  const entries = await listFinancialEntriesByRelation(supabase, companyId, {tripId});
  return {
    financial: entries.map((entry) => ({
      id: entry.id,
      date: entry.entryDate,
      category: entry.categoryName ?? '—',
      description: entry.description,
      amount: entry.amount,
      status: entry.entryStatus,
    })),
  };
}

async function loadVehicleFinancial(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
) {
  const entries = await listFinancialEntriesByRelation(supabase, companyId, {vehicleId});
  return {costs: entries.map(toVehicleCostRecord)};
}

async function loadDriverFinancial(
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
) {
  const entries = await listFinancialEntriesByRelation(supabase, companyId, {driverId});
  return {
    costs: entries.map((entry) => ({
      id: entry.id,
      date: entry.entryDate,
      category: entry.categoryName ?? '—',
      description: entry.description,
      amount: entry.amount,
      sourceModule: 'financeiro' as const,
    })),
  };
}

registerFuelDetailLoader(loadFuelFinancial);
registerMaintenanceDetailLoader(loadMaintenanceFinancial);
registerTireDetailLoader(loadTireFinancial);
registerTripDetailLoader(loadTripFinancial);
registerVehicleDetailLoader(loadVehicleFinancial);
registerDriverDetailLoader(loadDriverFinancial);
