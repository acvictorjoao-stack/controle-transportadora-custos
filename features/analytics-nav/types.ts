import type {OperationalDreFilters} from '@/features/dre/types';
import {ROUTES} from '@/constants/routes/paths';

/** Filtros compartilhados entre dashboards analíticos (RC 27.6.0). */
export type SharedAnalyticsFilters = OperationalDreFilters;

export type AnalyticsModuleId =
  | 'dashboard'
  | 'executivo'
  | 'dre'
  | 'rentabilidade-clientes'
  | 'rentabilidade-rotas'
  | 'rentabilidade-veiculos'
  | 'rentabilidade-motoristas'
  | 'inteligencia'
  | 'viagens'
  | 'financeiro'
  | 'ocorrencias';

export interface AnalyticsNavLink {
  id: AnalyticsModuleId;
  label: string;
  href: string;
  description?: string;
}

export interface AnalyticsRelatedInsight {
  id: string;
  title: string;
  label: string;
  href: string;
  subtitle?: string;
}

export interface AnalyticsExportColumn {
  id: string;
  header: string;
}

export interface AnalyticsExportRow {
  [key: string]: string | number | null | undefined;
}

export interface AnalyticsExportPayload {
  title: string;
  columns: AnalyticsExportColumn[];
  rows: AnalyticsExportRow[];
  kpis?: Array<{label: string; value: string}>;
}

export interface AnalyticsContextEntity {
  type: 'customer' | 'route' | 'vehicle' | 'driver' | 'branch' | 'trip';
  id: string;
  label: string;
}

export const ANALYTICS_MODULE_PATHS: Record<
  Exclude<AnalyticsModuleId, 'dashboard'>,
  string
> = {
  executivo: ROUTES.dashboardExecutivo,
  dre: ROUTES.dashboardDre,
  'rentabilidade-clientes': ROUTES.dashboardRentabilidadeClientes,
  'rentabilidade-rotas': ROUTES.dashboardRentabilidadeRotas,
  'rentabilidade-veiculos': ROUTES.dashboardRentabilidadeVeiculos,
  'rentabilidade-motoristas': ROUTES.dashboardRentabilidadeMotoristas,
  inteligencia: ROUTES.dashboardInteligencia,
  viagens: ROUTES.viagens,
  financeiro: ROUTES.financeiro,
  ocorrencias: ROUTES.viagens,
};
