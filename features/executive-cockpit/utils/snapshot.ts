import type {OperationalDreData} from '@/features/dre/types';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {formatCompactDeltaPercent} from '@/features/dre/utils/period-comparison';

import type {
  CockpitChartId,
  CockpitMetricSnapshot,
  ExecutiveGoals,
  FavoriteChartPoint,
  PeriodComparisonDelta,
  SmartKpiCard,
} from '../types';
import {
  EXECUTIVE_GOAL_LABELS,
} from '../types';
import {formatCompactDelta, formatGoalValue, percentChange} from './format';
import {
  classifyAgainstGoal,
  progressAgainstGoal,
  SEMAPHORE_EMOJI,
  statusLabelFor,
} from './semaphore';

export function snapshotFromSources(input: {
  dre: OperationalDreData;
  slaPercent: number | null;
  averageLeadTimeMinutes: number | null;
  openOccurrences: number;
}): CockpitMetricSnapshot {
  const {dre} = input;
  return {
    receita: dre.revenues.totalRevenue,
    lucro: dre.result.operatingProfit,
    margem: dre.result.operatingMarginPercent,
    custos: dre.costs.totalOperatingCosts,
    sla: input.slaPercent,
    leadTime: input.averageLeadTimeMinutes,
    custoKm: dre.indicators.costPerKm,
    receitaKm: dre.indicators.revenuePerKm,
    lucroKm: dre.indicators.profitPerKm,
    ocorrencias: input.openOccurrences,
    tripCount: dre.indicators.tripCount,
    totalKm: dre.indicators.totalKm,
  };
}

export function buildSmartKpis(
  snapshot: CockpitMetricSnapshot,
  previous: CockpitMetricSnapshot,
  goals: ExecutiveGoals,
): SmartKpiCard[] {
  const defs: Array<{
    id: SmartKpiCard['id'];
    metric: 'receita' | 'lucro' | 'margem' | 'sla' | 'leadTime';
    value: number | null;
    previousValue: number | null;
    format: (v: number | null) => string;
  }> = [
    {
      id: 'receita',
      metric: 'receita',
      value: snapshot.receita,
      previousValue: previous.receita,
      format: (v) => formatGoalValue('receita', v),
    },
    {
      id: 'lucro',
      metric: 'lucro',
      value: snapshot.lucro,
      previousValue: previous.lucro,
      format: (v) => formatGoalValue('lucro', v),
    },
    {
      id: 'margem',
      metric: 'margem',
      value: snapshot.margem,
      previousValue: previous.margem,
      format: (v) => formatGoalValue('margem', v),
    },
    {
      id: 'sla',
      metric: 'sla',
      value: snapshot.sla,
      previousValue: previous.sla,
      format: (v) => formatGoalValue('sla', v),
    },
    {
      id: 'leadTime',
      metric: 'leadTime',
      value: snapshot.leadTime,
      previousValue: previous.leadTime,
      format: (v) => formatGoalValue('leadTime', v),
    },
  ];

  return defs.map((def) => {
    const goal = goals[def.metric] ?? null;
    const status = classifyAgainstGoal(def.value, goal, def.metric);
    return {
      id: def.id,
      label: EXECUTIVE_GOAL_LABELS[def.metric],
      value: def.value,
      formattedValue: def.format(def.value),
      status,
      statusLabel: statusLabelFor(status, def.metric),
      emoji: SEMAPHORE_EMOJI[status],
      deltaVsPrevious: percentChange(def.value, def.previousValue),
      goal,
      progressPercent: progressAgainstGoal(def.value, goal, def.metric),
    };
  });
}

export function buildPeriodComparisonDelta(
  current: CockpitMetricSnapshot,
  previous: CockpitMetricSnapshot | null | undefined,
): PeriodComparisonDelta {
  if (!previous) {
    return {
      receita: null,
      lucro: null,
      margem: null,
      custos: null,
      sla: null,
      leadTime: null,
    };
  }

  return {
    receita: percentChange(current.receita, previous.receita),
    lucro: percentChange(current.lucro, previous.lucro),
    margem:
      current.margem != null && previous.margem != null
        ? current.margem - previous.margem
        : null,
    custos: percentChange(current.custos, previous.custos),
    sla: percentChange(current.sla, previous.sla),
    leadTime: percentChange(current.leadTime, previous.leadTime),
  };
}

export function buildFavoriteCharts(
  chartIds: CockpitChartId[],
  current: CockpitMetricSnapshot,
  previous: CockpitMetricSnapshot,
): FavoriteChartPoint[] {
  const map: Record<
    CockpitChartId,
    {
      label: string;
      current: number | null;
      previous: number | null;
      format: (v: number | null) => string;
    }
  > = {
    receita: {
      label: 'Receita',
      current: current.receita,
      previous: previous.receita,
      format: (v) => (v == null ? '—' : formatCurrencyBr(v)),
    },
    margem: {
      label: 'Margem',
      current: current.margem,
      previous: previous.margem,
      format: (v) => (v == null ? '—' : formatPercent(v)),
    },
    custos: {
      label: 'Custos',
      current: current.custos,
      previous: previous.custos,
      format: (v) => (v == null ? '—' : formatCurrencyBr(v)),
    },
    sla: {
      label: 'SLA',
      current: current.sla,
      previous: previous.sla,
      format: (v) => (v == null ? '—' : formatPercent(v)),
    },
  };

  return chartIds.map((id) => {
    const item = map[id];
    return {
      id,
      label: item.label,
      current: item.current,
      previous: item.previous,
      deltaPercent: percentChange(item.current, item.previous),
      formattedCurrent: item.format(item.current),
    };
  });
}

export {formatCompactDelta, formatCompactDeltaPercent};
