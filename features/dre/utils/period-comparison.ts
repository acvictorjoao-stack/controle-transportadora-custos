import type {
  OperationalDreDimensionGroup,
  OperationalDreRouteGroup,
} from '@/features/dre/types';

export interface PeriodDelta {
  revenuePercent: number | null;
  costPercent: number | null;
  profitPercent: number | null;
  marginPoints: number | null;
}

export interface RoutePeriodComparison extends PeriodDelta {
  routeKey: string;
  label: string;
}

type PeriodComparable = Pick<
  OperationalDreDimensionGroup,
  'totalRevenue' | 'totalCost' | 'totalProfit' | 'marginPercent'
>;

export interface AggregatePeriodSnapshot {
  revenue: number;
  costs: number;
  profit: number;
  marginPercent?: number | null;
}

function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function compareDimensionPeriods(
  current: PeriodComparable,
  previous: PeriodComparable | undefined,
): PeriodDelta {
  if (!previous) {
    return {
      revenuePercent: null,
      costPercent: null,
      profitPercent: null,
      marginPoints: null,
    };
  }

  const marginPoints =
    current.marginPercent == null || previous.marginPercent == null
      ? null
      : current.marginPercent - previous.marginPercent;

  return {
    revenuePercent: percentChange(current.totalRevenue, previous.totalRevenue),
    costPercent: percentChange(current.totalCost, previous.totalCost),
    profitPercent: percentChange(current.totalProfit, previous.totalProfit),
    marginPoints,
  };
}

/** @deprecated Prefer `compareDimensionPeriods` — mantido para rotas. */
export function compareRoutePeriods(
  current: OperationalDreRouteGroup,
  previous: OperationalDreRouteGroup | undefined,
): PeriodDelta {
  return compareDimensionPeriods(current, previous);
}

export function buildDimensionComparisons(
  currentGroups: OperationalDreDimensionGroup[],
  previousGroups: OperationalDreDimensionGroup[],
): Map<string, PeriodDelta> {
  const previousByKey = new Map(
    previousGroups.map((group) => [group.dimensionKey, group]),
  );
  const result = new Map<string, PeriodDelta>();

  for (const group of currentGroups) {
    result.set(
      group.dimensionKey,
      compareDimensionPeriods(group, previousByKey.get(group.dimensionKey)),
    );
  }

  return result;
}

/** @deprecated Prefer `buildDimensionComparisons` — mantido para rotas. */
export function buildRouteComparisons(
  currentGroups: OperationalDreRouteGroup[],
  previousGroups: OperationalDreRouteGroup[],
): Map<string, PeriodDelta> {
  return buildDimensionComparisons(currentGroups, previousGroups);
}

export function compareAggregatePeriods(
  current: AggregatePeriodSnapshot,
  previous: AggregatePeriodSnapshot | null | undefined,
): PeriodDelta {
  if (!previous) {
    return {
      revenuePercent: null,
      costPercent: null,
      profitPercent: null,
      marginPoints: null,
    };
  }

  const marginPoints =
    current.marginPercent == null || previous.marginPercent == null
      ? null
      : current.marginPercent - previous.marginPercent;

  return {
    revenuePercent: percentChange(current.revenue, previous.revenue),
    costPercent: percentChange(current.costs, previous.costs),
    profitPercent: percentChange(current.profit, previous.profit),
    marginPoints,
  };
}

export function formatDeltaPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return 'Sem base anterior';
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  if (rounded === 0) return 'Estável vs período anterior';
  const direction = rounded > 0 ? 'acima' : 'abaixo';
  return `${abs}% ${direction} do período anterior`;
}

/** Formato compacto para KPIs: `+15%`, `-3%`, `—`. */
export function formatCompactDeltaPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  if (rounded === 0) return '0%';
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

export function formatMarginPoints(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return 'Sem base anterior';
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return 'Estável vs período anterior';
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })} pontos percentuais`;
}

export function isFavorableDelta(
  value: number | null,
  invertGood = false,
): boolean | null {
  if (value == null || !Number.isFinite(value) || value === 0) return null;
  return invertGood ? value < 0 : value > 0;
}
