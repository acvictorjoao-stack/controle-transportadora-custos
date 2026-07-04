/**
 * Extension-point types for future FleetControl modules.
 * Populated by respective feature loaders when modules are implemented.
 */

export interface VehicleDriverAssignment {
  driverId: string;
  driverName: string;
  assignedAt: string;
  unassignedAt: string | null;
}

export interface VehicleTripRecord {
  id: string;
  startedAt: string;
  endedAt: string | null;
  origin: string | null;
  destination: string | null;
  distanceKm: number | null;
  driverId: string | null;
}

export interface VehicleFuelRecord {
  id: string;
  filledAt: string;
  odometerKm: number | null;
  liters: number;
  totalCost: number | null;
  station: string | null;
}

export interface VehicleMaintenanceRecord {
  id: string;
  scheduledAt: string | null;
  completedAt: string | null;
  type: string;
  description: string | null;
  totalCost: number | null;
  status: string;
}

export interface VehicleTireRecord {
  id: string;
  position: string;
  brand: string | null;
  installedAt: string;
  treadDepthMm: number | null;
  status: string;
}

export interface VehicleCostRecord {
  id: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  sourceModule: 'financeiro' | 'manutencao' | 'abastecimento' | 'pneus' | 'viagem' | 'other';
}

export interface VehicleMileageRecord {
  date: string;
  odometerKm: number;
  source: 'vehicle' | 'trip' | 'fuel' | 'maintenance';
}

/** Sections loaded by integration modules into vehicle detail. */
export interface VehicleIntegrationSections {
  drivers: VehicleDriverAssignment[];
  trips: VehicleTripRecord[];
  fuelRecords: VehicleFuelRecord[];
  maintenances: VehicleMaintenanceRecord[];
  tires: VehicleTireRecord[];
  costs: VehicleCostRecord[];
}

/** Empty integration sections — default until modules are wired. */
export function emptyVehicleIntegrationSections(): VehicleIntegrationSections {
  return {
    drivers: [],
    trips: [],
    fuelRecords: [],
    maintenances: [],
    tires: [],
    costs: [],
  };
}
