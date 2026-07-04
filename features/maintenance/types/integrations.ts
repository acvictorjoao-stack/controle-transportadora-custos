/**
 * Extension-point types for future FleetControl modules.
 * Populated by respective feature loaders when modules are implemented.
 */

export interface MaintenanceFinancialRecord {
  id: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  status: string;
}

export interface MaintenanceBiMetric {
  id: string;
  label: string;
  value: string;
  trend: string | null;
}

export interface MaintenanceTireRecord {
  id: string;
  position: string;
  brand: string | null;
  status: string;
}

export interface MaintenanceTelemetryPoint {
  id: string;
  recordedAt: string;
  odometerKm: number | null;
  engineHours: number | null;
}

export interface MaintenanceDriverAppEvent {
  id: string;
  eventType: string;
  recordedAt: string;
  payload: Record<string, unknown>;
}

export interface MaintenanceAiInsight {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

/** Sections loaded by integration modules into maintenance detail. */
export interface MaintenanceIntegrationSections {
  financial: MaintenanceFinancialRecord[];
  bi: MaintenanceBiMetric[];
  tires: MaintenanceTireRecord[];
  telemetry: MaintenanceTelemetryPoint[];
  driverApp: MaintenanceDriverAppEvent[];
  ai: MaintenanceAiInsight[];
}

export function emptyMaintenanceIntegrationSections(): MaintenanceIntegrationSections {
  return {
    financial: [],
    bi: [],
    tires: [],
    telemetry: [],
    driverApp: [],
    ai: [],
  };
}
