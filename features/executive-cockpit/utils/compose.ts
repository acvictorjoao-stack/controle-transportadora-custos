import type {OperationalDreData} from '@/features/dre/types';
import type {
  OperationalDreCustomerGroup,
  OperationalDreRouteGroup,
  OperationalDreVehicleGroup,
} from '@/features/dre/types';
import type {OperationalDreFilters} from '@/features/dre/types';
import type {CadastroQualityRouteItem} from '@/features/cadastro-quality/types';

import type {
  CockpitPeriodPreset,
  ExecutiveCockpitData,
  ExecutiveCockpitPreferences,
  ExecutiveGoals,
} from '../types';
import {DEFAULT_EXECUTIVE_GOALS} from '../types';
import {buildGoalProgress, buildOperationalScore} from './goals-and-score';
import {buildExecutiveInsights} from './insights';
import {yearAgoPeriodFilters} from './period';
import {
  buildFavoriteCharts,
  buildPeriodComparisonDelta,
  buildSmartKpis,
  snapshotFromSources,
} from './snapshot';
import {buildTrends} from './trends';
import {previousPeriodFilters} from '@/features/organization/dashboard/utils/period';

export interface ComposeCockpitInput {
  periodPreset: CockpitPeriodPreset;
  period: OperationalDreFilters;
  dre: OperationalDreData;
  previousDre: OperationalDreData;
  yearAgoDre: OperationalDreData | null;
  routes: OperationalDreRouteGroup[];
  previousRoutes: OperationalDreRouteGroup[];
  customers: OperationalDreCustomerGroup[];
  previousCustomers: OperationalDreCustomerGroup[];
  vehicles: OperationalDreVehicleGroup[];
  slaPercent: number | null;
  previousSlaPercent: number | null;
  yearAgoSlaPercent: number | null;
  averageLeadTimeMinutes: number | null;
  previousAverageLeadTimeMinutes: number | null;
  yearAgoAverageLeadTimeMinutes: number | null;
  openOccurrences: number;
  previousOpenOccurrences: number;
  yearAgoOpenOccurrences: number;
  goals: ExecutiveGoals;
  preferences: ExecutiveCockpitPreferences;
  routesWithoutLeadTime?: CadastroQualityRouteItem[];
}

/**
 * Composição pura do cockpit — sem I/O.
 * Reutiliza resultados de DRE + inteligência operacional já carregados.
 */
export function composeExecutiveCockpit(
  input: ComposeCockpitInput,
): ExecutiveCockpitData {
  const goals: ExecutiveGoals = {
    ...DEFAULT_EXECUTIVE_GOALS,
    ...input.goals,
  };

  const previousPeriod = previousPeriodFilters(input.period);
  const yearAgoPeriod = yearAgoPeriodFilters(input.period);

  const snapshot = snapshotFromSources({
    dre: input.dre,
    slaPercent: input.slaPercent,
    averageLeadTimeMinutes: input.averageLeadTimeMinutes,
    openOccurrences: input.openOccurrences,
  });

  const previousSnapshot = snapshotFromSources({
    dre: input.previousDre,
    slaPercent: input.previousSlaPercent,
    averageLeadTimeMinutes: input.previousAverageLeadTimeMinutes,
    openOccurrences: input.previousOpenOccurrences,
  });

  const yearAgoSnapshot = input.yearAgoDre
    ? snapshotFromSources({
        dre: input.yearAgoDre,
        slaPercent: input.yearAgoSlaPercent,
        averageLeadTimeMinutes: input.yearAgoAverageLeadTimeMinutes,
        openOccurrences: input.yearAgoOpenOccurrences,
      })
    : null;

  const goalsProgress = buildGoalProgress(snapshot, goals);
  const score = buildOperationalScore(snapshot, goalsProgress, goals);
  const routesWithoutLeadTime = input.routesWithoutLeadTime ?? [];

  const insights = buildExecutiveInsights({
    dre: input.dre,
    previousDre: input.previousDre,
    routes: input.routes,
    previousRoutes: input.previousRoutes,
    customers: input.customers,
    previousCustomers: input.previousCustomers,
    vehicles: input.vehicles,
  });

  if (routesWithoutLeadTime.length > 0) {
    insights.unshift({
      id: 'routes-missing-lead-time',
      title: `${routesWithoutLeadTime.length} rota${
        routesWithoutLeadTime.length === 1 ? '' : 's'
      } sem Lead Time configurado`,
      cause: 'Cadastros incompletos afetam SLA, atrasos e score operacional.',
      suggestion: 'Abra Qualidade dos Cadastros e regularize as rotas pendentes.',
      severity: 'warning',
    });
  }

  return {
    periodPreset: input.periodPreset,
    period: input.period,
    previousPeriod,
    yearAgoPeriod,
    snapshot,
    previousSnapshot,
    yearAgoSnapshot,
    kpis: buildSmartKpis(snapshot, previousSnapshot, goals),
    goals: goalsProgress,
    goalsConfig: goals,
    trends: buildTrends(snapshot, previousSnapshot),
    insights: insights.slice(0, 8),
    score,
    comparison: {
      vsPrevious: buildPeriodComparisonDelta(snapshot, previousSnapshot),
      vsYearAgo: yearAgoSnapshot
        ? buildPeriodComparisonDelta(snapshot, yearAgoSnapshot)
        : null,
    },
    favoriteCharts: buildFavoriteCharts(
      input.preferences.favoriteCharts,
      snapshot,
      previousSnapshot,
    ),
    preferences: input.preferences,
    routesWithoutLeadTime,
  };
}
