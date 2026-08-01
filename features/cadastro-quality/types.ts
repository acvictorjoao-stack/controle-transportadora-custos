import type {RouteOperationalStatus} from '@/features/routes/types';

export interface CadastroQualityRouteItem {
  id: string;
  name: string;
  code: string | null;
  origin: string;
  destination: string;
  operationalStatus: RouteOperationalStatus;
  leadTimeDays: number | null;
  leadTimeMinutes: number | null;
  companyName: string;
  customerName: string | null;
}

export interface CadastroQualitySummary {
  missingLeadTime: number;
  inactive: number;
  totalRoutes: number;
}

export interface CadastroQualityData {
  companyName: string;
  summary: CadastroQualitySummary;
  withoutLeadTime: CadastroQualityRouteItem[];
  inactive: CadastroQualityRouteItem[];
}

export const INSUFFICIENT_FORECAST_DATA_MESSAGE =
  'Dados insuficientes para calcular previsão.';
