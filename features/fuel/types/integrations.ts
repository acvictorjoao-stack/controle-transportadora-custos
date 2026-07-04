/**
 * Extension-point types for future FleetControl modules.
 * Populated by respective feature loaders when modules are implemented.
 */

export interface FuelFinancialRecord {
  id: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  status: string;
}

export interface FuelBiMetric {
  id: string;
  label: string;
  value: string;
  trend: string | null;
}

export interface FuelTelemetryPoint {
  id: string;
  recordedAt: string;
  odometerKm: number | null;
  fuelLevelPercent: number | null;
}

export interface FuelDriverAppEvent {
  id: string;
  eventType: string;
  recordedAt: string;
  payload: Record<string, unknown>;
}

export interface FuelAiInsight {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

/** Sections loaded by integration modules into fuel detail. */
export interface FuelIntegrationSections {
  financial: FuelFinancialRecord[];
  bi: FuelBiMetric[];
  telemetry: FuelTelemetryPoint[];
  driverApp: FuelDriverAppEvent[];
  ai: FuelAiInsight[];
}

export function emptyFuelIntegrationSections(): FuelIntegrationSections {
  return {
    financial: [],
    bi: [],
    telemetry: [],
    driverApp: [],
    ai: [],
  };
}
