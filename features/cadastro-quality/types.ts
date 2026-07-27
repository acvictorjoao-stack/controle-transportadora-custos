import type {RouteOperationalStatus} from '@/features/routes/types';

export interface CadastroQualityRouteItem {
  id: string;
  name: string;
  code: string | null;
  origin: string;
  destination: string;
  operationalStatus: RouteOperationalStatus;
  leadTimeMinutes: number | null;
  unloadTimeMinutes: number | null;
  companyName: string;
  /** Rotas não possuem cliente direto — exibido como "—" quando inexistente. */
  customerName: string | null;
}

export interface CadastroQualitySummary {
  missingLeadTime: number;
  missingUnloadTime: number;
  inactive: number;
  totalRoutes: number;
}

export interface CadastroQualityData {
  companyName: string;
  summary: CadastroQualitySummary;
  withoutLeadTime: CadastroQualityRouteItem[];
  withoutUnloadTime: CadastroQualityRouteItem[];
  inactive: CadastroQualityRouteItem[];
}

export const INSUFFICIENT_FORECAST_DATA_MESSAGE =
  'Dados insuficientes para calcular previsão.';
