import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import type {
  OperationalDreCustomerGroup,
  OperationalDreRouteGroup,
  OperationalDreVehicleGroup,
} from '@/features/dre/types';

import type {
  AnalyticsExportPayload,
  AnalyticsRelatedInsight,
  SharedAnalyticsFilters,
} from '../types';
import {buildCrossNavHref} from './shared-filters';

function topByProfit<T extends {dimensionKey: string; label: string; totalProfit: number}>(
  groups: T[],
): T | null {
  if (groups.length === 0) return null;
  return [...groups].sort((a, b) => b.totalProfit - a.totalProfit)[0] ?? null;
}

function topByTrips<T extends {dimensionKey: string; label: string; tripCount: number}>(
  groups: T[],
): T | null {
  if (groups.length === 0) return null;
  return [...groups].sort((a, b) => b.tripCount - a.tripCount)[0] ?? null;
}

/**
 * Derivado em memória a partir dos grupos já carregados pelo bundle DRE.
 * Não dispara novas consultas.
 */
export function buildRelatedInsights(input: {
  filters: SharedAnalyticsFilters;
  customers?: OperationalDreCustomerGroup[];
  routes?: OperationalDreRouteGroup[];
  vehicles?: OperationalDreVehicleGroup[];
  branchLabel?: string | null;
}): AnalyticsRelatedInsight[] {
  const {filters, customers = [], routes = [], vehicles = [], branchLabel} =
    input;
  const insights: AnalyticsRelatedInsight[] = [];

  const topCustomer = topByProfit(customers);
  if (topCustomer?.dimensionKey && topCustomer.dimensionKey !== '__none__') {
    insights.push({
      id: 'top-customer',
      title: 'Maior Cliente desta Rota',
      label: topCustomer.label,
      subtitle: `Lucro ${formatCurrencyBr(topCustomer.totalProfit)}`,
      href: buildCrossNavHref('rentabilidade-clientes', filters, {
        customerId: topCustomer.dimensionKey,
      }),
    });
  }

  const topVehicle = topByTrips(vehicles);
  if (topVehicle?.dimensionKey && topVehicle.dimensionKey !== '__none__') {
    insights.push({
      id: 'top-vehicle',
      title: 'Veículo mais utilizado',
      label: topVehicle.label,
      subtitle: `${topVehicle.tripCount.toLocaleString('pt-BR')} viagens`,
      href: buildCrossNavHref('rentabilidade-veiculos', filters, {
        vehicleId: topVehicle.dimensionKey,
      }),
    });
  }

  const topProfitVehicle = topByProfit(vehicles);
  if (
    topProfitVehicle?.dimensionKey &&
    topProfitVehicle.dimensionKey !== '__none__' &&
    topProfitVehicle.dimensionKey !== topVehicle?.dimensionKey
  ) {
    insights.push({
      id: 'top-profit-vehicle',
      title: 'Veículo com maior lucro',
      label: topProfitVehicle.label,
      subtitle: formatCurrencyBr(topProfitVehicle.totalProfit),
      href: buildCrossNavHref('rentabilidade-veiculos', filters, {
        vehicleId: topProfitVehicle.dimensionKey,
      }),
    });
  }

  insights.push({
    id: 'top-driver',
    title: 'Motorista com maior lucro',
    label: 'Ver motoristas',
    subtitle: 'Análise por motorista',
    href: buildCrossNavHref('rentabilidade-motoristas', filters),
  });

  const topRoute = topByProfit(routes);
  if (topRoute?.dimensionKey && topRoute.dimensionKey !== '__none__') {
    insights.push({
      id: 'top-route',
      title: 'Rota mais lucrativa',
      label: topRoute.label,
      subtitle:
        topRoute.marginPercent == null
          ? formatCurrencyBr(topRoute.totalProfit)
          : `Margem ${formatPercent(topRoute.marginPercent)}`,
      href: buildCrossNavHref('rentabilidade-rotas', filters, {
        routeId: topRoute.dimensionKey,
      }),
    });
  }

  insights.push({
    id: 'branch',
    title: 'Filial responsável',
    label: branchLabel?.trim() || (filters.branchId ? 'Filial filtrada' : 'Todas as filiais'),
    subtitle: 'Inteligência operacional',
    href: buildCrossNavHref('inteligencia', filters),
  });

  return insights;
}

export function buildRankingExportPayload(input: {
  title: string;
  columns: Array<{id: string; header: string}>;
  rows: Array<Record<string, string | number | null | undefined>>;
  kpis?: Array<{label: string; value: string}>;
}): AnalyticsExportPayload {
  return {
    title: input.title,
    columns: input.columns,
    rows: input.rows,
    kpis: input.kpis,
  };
}
