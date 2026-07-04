/**
 * Extension-point types for future FleetControl modules.
 * Populated by respective feature loaders when modules are implemented.
 */

export interface DriverVehicleAssignment {
  vehicleId: string;
  plate: string;
  assignedAt: string;
  unassignedAt: string | null;
}

export interface DriverTripRecord {
  id: string;
  startedAt: string;
  endedAt: string | null;
  origin: string | null;
  destination: string | null;
  distanceKm: number | null;
  vehicleId: string | null;
}

export interface DriverFuelRecord {
  id: string;
  filledAt: string;
  liters: number;
  totalCost: number | null;
  station: string | null;
  vehicleId: string | null;
}

export interface DriverCostRecord {
  id: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  sourceModule: 'financeiro' | 'viagem' | 'abastecimento' | 'other';
}

export interface DriverInfractionRecord {
  id: string;
  occurredAt: string;
  description: string;
  amount: number | null;
  status: string;
}

export interface DriverTrainingRecord {
  id: string;
  completedAt: string | null;
  type: string;
  description: string | null;
  expiresAt: string | null;
  status: string;
}

export interface DriverVacationRecord {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface DriverTelemetryRecord {
  id: string;
  recordedAt: string;
  metric: string;
  value: number;
  unit: string | null;
}

/** Sections loaded by integration modules into driver detail. */
export interface DriverIntegrationSections {
  vehicles: DriverVehicleAssignment[];
  trips: DriverTripRecord[];
  fuelRecords: DriverFuelRecord[];
  costs: DriverCostRecord[];
  infractions: DriverInfractionRecord[];
  trainings: DriverTrainingRecord[];
  vacations: DriverVacationRecord[];
  telemetry: DriverTelemetryRecord[];
}

/** Empty integration sections — default until modules are wired. */
export function emptyDriverIntegrationSections(): DriverIntegrationSections {
  return {
    vehicles: [],
    trips: [],
    fuelRecords: [],
    costs: [],
    infractions: [],
    trainings: [],
    vacations: [],
    telemetry: [],
  };
}
