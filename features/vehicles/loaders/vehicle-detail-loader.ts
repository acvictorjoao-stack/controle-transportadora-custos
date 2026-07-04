import type {SupabaseClient} from '@supabase/supabase-js';

import {
  getVehicleById,
  listVehicleDocuments,
  listVehicleHistory,
} from '../queries/vehicles';
import type {Vehicle, VehicleDetailData} from '../types';
import {
  emptyVehicleIntegrationSections,
  type VehicleIntegrationSections,
  type VehicleMileageRecord,
} from '../types/integrations';

export type VehicleDetailSectionLoader = (
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
) => Promise<Partial<VehicleIntegrationSections>>;

/** Registry for future module loaders (motoristas, viagens, etc.). */
const integrationLoaders: VehicleDetailSectionLoader[] = [];

export function registerVehicleDetailLoader(loader: VehicleDetailSectionLoader): void {
  integrationLoaders.push(loader);
}

function buildInitialMileage(vehicle: Vehicle): VehicleMileageRecord[] {
  return [
    {
      date: vehicle.createdAt,
      odometerKm: vehicle.initialOdometerKm,
      source: 'vehicle',
    },
    {
      date: vehicle.updatedAt,
      odometerKm: vehicle.currentOdometerKm,
      source: 'vehicle',
    },
  ];
}

async function loadIntegrationSections(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<VehicleIntegrationSections> {
  const base = emptyVehicleIntegrationSections();

  if (integrationLoaders.length === 0) {
    return base;
  }

  const results = await Promise.all(
    integrationLoaders.map((loader) => loader(supabase, companyId, vehicleId)),
  );

  return results.reduce<VehicleIntegrationSections>(
    (acc, section) => ({
      drivers: section.drivers ?? acc.drivers,
      trips: section.trips ?? acc.trips,
      fuelRecords: section.fuelRecords ?? acc.fuelRecords,
      maintenances: section.maintenances ?? acc.maintenances,
      tires: section.tires ?? acc.tires,
      costs: section.costs ?? acc.costs,
    }),
    base,
  );
}

export async function composeVehicleDetail(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<VehicleDetailData | null> {
  const vehicle = await getVehicleById(supabase, companyId, vehicleId);
  if (!vehicle) return null;

  const [history, documents, integrations] = await Promise.all([
    listVehicleHistory(supabase, companyId, vehicleId),
    listVehicleDocuments(supabase, companyId, vehicleId),
    loadIntegrationSections(supabase, companyId, vehicleId),
  ]);

  return {
    vehicle,
    history,
    documents,
    mileage: buildInitialMileage(vehicle),
    ...integrations,
  };
}
