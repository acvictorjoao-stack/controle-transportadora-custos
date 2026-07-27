import type {OperationalDreFilters} from '@/features/dre/types';

import type {ExecutiveGoalMetric, ExecutiveGoals} from './goals';
import type {CockpitChartId, ExecutiveCockpitPreferences} from './preferences';

export type CockpitPeriodPreset = 'hoje' | 'semana' | 'mes' | 'ano';

export type SemaphoreStatus = 'acima' | 'atencao' | 'abaixo';

export type TrendDirection = 'up' | 'down' | 'stable';

export interface CockpitMetricSnapshot {
  receita: number;
  lucro: number;
  margem: number;
  custos: number;
  sla: number | null;
  leadTime: number | null;
  custoKm: number | null;
  receitaKm: number | null;
  lucroKm: number | null;
  ocorrencias: number;
  tripCount: number;
  totalKm: number;
}

export interface SmartKpiCard {
  id: ExecutiveGoalMetric | 'receita' | 'lucro' | 'margem' | 'sla' | 'leadTime';
  label: string;
  value: number | null;
  formattedValue: string;
  status: SemaphoreStatus;
  statusLabel: string;
  emoji: string;
  deltaVsPrevious: number | null;
  goal: number | null;
  progressPercent: number | null;
}

export interface GoalProgressItem {
  metric: ExecutiveGoalMetric;
  label: string;
  goal: number | null;
  actual: number | null;
  formattedGoal: string;
  formattedActual: string;
  progressPercent: number | null;
  status: SemaphoreStatus;
  unit: 'currency' | 'percent' | 'minutes' | 'perKm';
}

export interface TrendItem {
  id: string;
  label: string;
  direction: TrendDirection;
  message: string;
  deltaPercent: number | null;
  favorable: boolean | null;
}

export interface InsightItem {
  id: string;
  title: string;
  cause?: string;
  suggestion?: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface OperationalScore {
  value: number;
  label: string;
  breakdown: Array<{id: string; label: string; score: number; weight: number}>;
}

export interface PeriodComparisonDelta {
  receita: number | null;
  lucro: number | null;
  margem: number | null;
  custos: number | null;
  sla: number | null;
  leadTime: number | null;
}

export interface FavoriteChartPoint {
  id: CockpitChartId;
  label: string;
  current: number | null;
  previous: number | null;
  deltaPercent: number | null;
  formattedCurrent: string;
}

export interface ExecutiveCockpitData {
  periodPreset: CockpitPeriodPreset;
  period: OperationalDreFilters;
  previousPeriod: OperationalDreFilters;
  yearAgoPeriod: OperationalDreFilters | null;
  snapshot: CockpitMetricSnapshot;
  previousSnapshot: CockpitMetricSnapshot;
  yearAgoSnapshot: CockpitMetricSnapshot | null;
  kpis: SmartKpiCard[];
  goals: GoalProgressItem[];
  goalsConfig: ExecutiveGoals;
  trends: TrendItem[];
  insights: InsightItem[];
  score: OperationalScore;
  comparison: {
    vsPrevious: PeriodComparisonDelta;
    vsYearAgo: PeriodComparisonDelta | null;
  };
  favoriteCharts: FavoriteChartPoint[];
  preferences: ExecutiveCockpitPreferences;
}
