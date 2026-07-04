/**
 * Extension-point types for future FleetControl modules.
 * Populated by respective feature loaders when modules are implemented.
 */

export interface TireFinancialRecord {
  id: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  status: string;
}

export interface TireBiMetric {
  id: string;
  label: string;
  value: string;
  trend: string | null;
}

export interface TireTelemetryPoint {
  id: string;
  recordedAt: string;
  odometerKm: number | null;
  pressurePsi: number | null;
}

export interface TireDriverAppEvent {
  id: string;
  eventType: string;
  recordedAt: string;
  payload: Record<string, unknown>;
}

export interface TireAiInsight {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface TireMaintenanceLink {
  id: string;
  maintenanceType: string;
  openedAt: string;
  status: string;
}

/** Sections loaded by integration modules into tire detail. */
export interface TireIntegrationSections {
  financial: TireFinancialRecord[];
  bi: TireBiMetric[];
  maintenance: TireMaintenanceLink[];
  telemetry: TireTelemetryPoint[];
  driverApp: TireDriverAppEvent[];
  ai: TireAiInsight[];
}

export function emptyTireIntegrationSections(): TireIntegrationSections {
  return {
    financial: [],
    bi: [],
    maintenance: [],
    telemetry: [],
    driverApp: [],
    ai: [],
  };
}
