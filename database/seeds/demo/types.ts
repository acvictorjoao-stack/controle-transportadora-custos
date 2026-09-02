export interface DemoSeedSummary {
  companyId: string;
  branches: number;
  vehicles: number;
  drivers: number;
  employees: number;
  customers: number;
  suppliers: number;
  routes: number;
  trips: number;
  fuelRecords: number;
  maintenanceRecords: number;
  tires: number;
  payrollExpenses: number;
  financialEntries: number;
  created: boolean;
}

export interface DemoSeedContextMaps {
  branches: Map<string, string>;
  vehicles: Map<string, string>;
  drivers: Map<string, string>;
  employees: Map<string, string>;
  customers: Map<string, string>;
  suppliers: Map<string, string>;
  routes: Map<string, string>;
  positions: Map<string, string>;
  costCenters: Map<string, string>;
}
