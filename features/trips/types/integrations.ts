/**
 * Extension-point types for future FleetControl modules.
 * Populated by respective feature loaders when modules are implemented.
 */

export interface TripFinancialRecord {
  id: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  status: string;
}

export interface TripFuelRecord {
  id: string;
  filledAt: string;
  liters: number;
  totalCost: number | null;
  station: string | null;
}

export interface TripTireRecord {
  id: string;
  position: string;
  action: string;
  recordedAt: string;
}

export interface TripMaintenanceRecord {
  id: string;
  type: string;
  description: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
}

export interface TripBiMetric {
  id: string;
  label: string;
  value: string;
  trend: string | null;
}

export interface TripTelemetryPoint {
  id: string;
  recordedAt: string;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
}

export interface TripDriverAppEvent {
  id: string;
  eventType: string;
  recordedAt: string;
  payload: Record<string, unknown>;
}

export interface TripAiInsight {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

/** Sections loaded by integration modules into trip detail. */
export interface TripIntegrationSections {
  financial: TripFinancialRecord[];
  fuelRecords: TripFuelRecord[];
  tires: TripTireRecord[];
  maintenances: TripMaintenanceRecord[];
  bi: TripBiMetric[];
  telemetry: TripTelemetryPoint[];
  driverApp: TripDriverAppEvent[];
  ai: TripAiInsight[];
}

export function emptyTripIntegrationSections(): TripIntegrationSections {
  return {
    financial: [],
    fuelRecords: [],
    tires: [],
    maintenances: [],
    bi: [],
    telemetry: [],
    driverApp: [],
    ai: [],
  };
}
