export interface OperationalDreFilters {
  /** Unidade operacional (filial) — filtro "Empresa" na UI. */
  branchId?: string;
  customerId?: string;
  routeId?: string;
  costCenterId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface OperationalDreFilterOptions {
  branches: {id: string; name: string; code: string}[];
  customers: {id: string; name: string}[];
  routes: {id: string; name: string; code: string | null}[];
  costCenters: {id: string; name: string; code: string}[];
}

export interface OperationalDreRevenues {
  freightRevenue: number;
  totalRevenue: number;
}

export interface OperationalDreCosts {
  fuel: number;
  maintenance: number;
  tires: number;
  financial: number;
  accountsPayable: number;
  other: number;
  totalOperatingCosts: number;
}

export interface OperationalDreResult {
  operatingProfit: number;
  operatingMarginPercent: number;
}

export interface OperationalDreIndicators {
  revenuePerKm: number | null;
  costPerKm: number | null;
  profitPerKm: number | null;
  revenuePerTrip: number | null;
  costPerTrip: number | null;
  profitPerTrip: number | null;
  tripCount: number;
  totalKm: number;
  customersServed: number;
  routesUsed: number;
  vehiclesUsed: number;
}

export type OperationalDreAnalyticalCategory =
  | 'receita'
  | 'combustivel'
  | 'manutencao'
  | 'pneus'
  | 'financeiro'
  | 'contas_operacionais'
  | 'outros'
  | 'lucro';

export interface OperationalDreAnalyticalRow {
  category: OperationalDreAnalyticalCategory;
  label: string;
  value: number;
  percentOfRevenue: number | null;
}

export interface OperationalDreData {
  revenues: OperationalDreRevenues;
  costs: OperationalDreCosts;
  result: OperationalDreResult;
  indicators: OperationalDreIndicators;
  analyticalTable: OperationalDreAnalyticalRow[];
  /** Custos agregados por centro organizacional (OPERACIONAL, RH, …). */
  costCenterBreakdown: OperationalDreCostCenterBreakdown;
  filters: OperationalDreFilters;
}

/** Linha bruta de viagem concluída usada pelo calculator (sem I/O). */
export interface OperationalDreTripRow {
  id: string;
  branchId: string | null;
  customerId: string | null;
  routeId: string | null;
  vehicleId: string | null;
  contractedFreightValue: number | null;
  actualFreightValue: number | null;
  distanceKm: number;
}

/** Linha bruta de despesa financeira usada pelo calculator (sem I/O). */
export interface OperationalDreExpenseRow {
  id: string;
  amount: number;
  branchId: string | null;
  customerId: string | null;
  tripId: string | null;
  sourceModule: string | null;
  categorySlug: string | null;
  fuelRecordId: string | null;
  maintenanceRecordId: string | null;
  tireId: string | null;
  costCenterId: string | null;
  costCenterCode: string | null;
  costCenterName: string | null;
}

export interface OperationalDreCostCenterRow {
  costCenterId: string | null;
  code: string;
  name: string;
  value: number;
  percent: number | null;
}

export interface OperationalDreCostCenterBreakdown {
  byCode: Record<string, number>;
  ranking: OperationalDreCostCenterRow[];
  total: number;
}

export type OperationalDreCostBucket =
  | 'fuel'
  | 'maintenance'
  | 'tires'
  | 'financial'
  | 'accountsPayable'
  | 'other';
