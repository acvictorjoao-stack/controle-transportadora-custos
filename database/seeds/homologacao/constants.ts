/** Identificadores e volumes da massa de homologação da empresa CADASTRO. */

export const HML_COMPANY_SLUG = 'primeira-empresa';
/** UUID fixo da empresa-alvo — slug sozinho não autoriza escrita. */
export const HML_AUTHORIZED_COMPANY_ID =
  '451a7940-a56b-425f-ae5f-e493d536591f' as const;
export const HML_REQUIRED_PLAN_SLUG = 'professional';
export const HML_MARKER = 'HML-SEED';
export const HML_NOTES_PREFIX = '[HML]';

/** Volumes alvo — exigem o plano Professional (50 veículos). */
export const HML_COUNTS = {
  newBranches: 2,
  costCenters: 3,
  positions: 2,
  customers: 5,
  customerAddresses: 3,
  customerContacts: 3,
  contracts: 3,
  contractItemsPerContract: 2,
  suppliers: 6,
  drivers: 10,
  vehicles: 10,
  routes: 8,
  trips: 20,
  tripExpenses: 10,
  tripStops: 4,
  tripOccurrences: 3,
  tripChecklists: 5,
  fuelRecords: 15,
  maintenanceRecords: 5,
  maintenanceParts: 4,
  maintenanceServices: 3,
  tires: 8,
  tireMovements: 8,
  tireInspections: 4,
  tireRecaps: 1,
  employees: 5,
  payrollCompetences: 3,
  accountsPayable: 10,
  accountsReceivable: 10,
  manualFinancialEntries: 20,
} as const;

/** Status que ocupam veículo/motorista (alinhado ao índice 095 e ao app). */
export const HML_TRIP_BUSY_STATUSES = [
  'planned',
  'scheduled',
  'loading',
  'in_progress',
  'delivering',
  'waiting',
] as const;

/** Tabelas em que a empresa deve estar vazia (exceto HQ / seeds de sistema). */
export const HML_EMPTY_MODULE_TABLES = [
  'vehicles',
  'drivers',
  'customers',
  'suppliers',
  'routes',
  'trips',
  'fuel_records',
  'maintenance_records',
  'tires',
  'employees',
  'payroll_expenses',
  'financial_entries',
  'customer_contracts',
] as const;

export const HML_MANIFEST_DIR = '.hml-seed';
export const HML_MANIFEST_FILE = 'manifest.json';
