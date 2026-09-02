/** Identificadores estáveis da empresa de demonstração. */
export const DEMO_COMPANY_SLUG = 'demo-fleetcontrol-transportes';
export const DEMO_COMPANY_TAX_ID = '00.000.000/0001-91';
export const DEMO_COMPANY_LEGAL_NAME = 'FleetControl Demo Transportes Ltda.';
export const DEMO_COMPANY_TRADE_NAME = 'DEMO - FleetControl Transportes';
export const DEMO_COMPANY_EMAIL = 'demo@fleetcontrol.local';

export const DEMO_INTEGRATION_SOURCE = 'demo_seed';
export const DEMO_SETTINGS_FLAG = 'is_demo_company';

/** Quantidades alvo da massa de demonstração. */
export const DEMO_COUNTS = {
  branches: 3,
  vehicles: 10,
  drivers: 8,
  employees: 7,
  customers: 20,
  routes: 18,
  trips: 150,
  fuelRecords: 75,
  maintenanceRecords: 25,
  tires: 12,
  payrollMonths: 6,
} as const;

/** Centros de custo extras além do seed padrão do banco. */
export const DEMO_EXTRA_COST_CENTERS = [
  {code: 'FINANCEIRO', name: 'Financeiro', description: 'Custos financeiros e bancários'},
  {code: 'FROTA', name: 'Frota', description: 'Gestão e custos da frota'},
  {code: 'MANUTENCAO', name: 'Manutenção', description: 'Custos de manutenção veicular'},
] as const;

/** Cargos customizados (não duplicar os system semeados pela migration 091). */
export const DEMO_CUSTOM_POSITIONS = [
  {
    code: 'ANALISTA_FINANCEIRO',
    name: 'Analista Financeiro',
    description: 'Análises e controles financeiros',
  },
  {
    code: 'ANALISTA_ADMINISTRATIVO',
    name: 'Analista Administrativo',
    description: 'Rotinas administrativas',
  },
  {
    code: 'ASSISTENTE_ADMINISTRATIVO',
    name: 'Assistente Administrativo',
    description: 'Apoio administrativo operacional',
  },
  {
    code: 'AUXILIAR_LOGISTICA',
    name: 'Auxiliar de Logística',
    description: 'Apoio logístico e expedição',
  },
  {
    code: 'SUPERVISOR_OPERACOES',
    name: 'Supervisor de Operações',
    description: 'Supervisão da operação de transportes',
  },
  {
    code: 'COORDENADOR_OPERACOES',
    name: 'Coordenador de Operações',
    description: 'Coordenação da operação de transportes',
  },
] as const;
