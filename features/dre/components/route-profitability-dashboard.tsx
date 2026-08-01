'use client';

import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {StatCard} from '@/components/data-display/stat-card';
import {TableContainer} from '@/components/data-display/table-container';
import {Section} from '@/components/layout/section';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {
  AnalyticsShell,
  buildContextualAnalyticsBreadcrumbs,
  buildCrossNavHref,
  buildRankingExportPayload,
  buildRelatedInsights,
} from '@/features/analytics-nav';
import {ROUTES} from '@/constants/routes/paths';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {
  formatMarginStatus,
  type MarginStatus,
} from '@/features/organization/dashboard/utils/margin-status';
import type {RouteRankingRow} from '@/features/organization/dashboard/utils/rankings';
import type {BreadcrumbItem} from '@/types/global/navigation';

import type {
  OperationalDreByRouteData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreRouteGroup,
  OperationalDreTripMetrics,
  OperationalDreVehicleGroup,
} from '../types';
import type {PeriodDelta} from '../utils/period-comparison';
import type {PeriodChartPoint} from './revenue-cost-profit-chart';
import {OperationalDreFiltersBar} from './operational-dre-filters';
import {OperationalDreRouteCosts} from './operational-dre-route-costs';
import dynamic from 'next/dynamic';
import {Skeleton} from '@/components/ui/skeleton';

const RevenueCostProfitChart = dynamic(
  () =>
    import('./revenue-cost-profit-chart').then((m) => m.RevenueCostProfitChart),
  {loading: () => <Skeleton className="h-64 w-full rounded-xl" />},
);

export interface RouteProfitabilityDashboardProps {
  dre: OperationalDreData;
  byRoute: OperationalDreByRouteData;
  byCustomerGroups?: OperationalDreCustomerGroup[];
  byVehicleGroups?: OperationalDreVehicleGroup[];
  filterOptions: OperationalDreFilterOptions;
  initialFilters: OperationalDreFilters;
  chartPoints: PeriodChartPoint[];
  rankingRows: RouteRankingRow[];
  comparisons: Map<string, PeriodDelta>;
  error?: string | null;
  onBreadcrumbTrailChange?: (items: BreadcrumbItem[]) => void;
}

function formatRatio(value: number | null, suffix: string): string {
  if (value === null) return '—';
  return `${formatCurrencyBr(value)}${suffix}`;
}

function averageMargin(groups: OperationalDreRouteGroup[]): number {
  const withMargin = groups.filter((group) => group.marginPercent != null);
  if (withMargin.length === 0) return 0;
  const sum = withMargin.reduce(
    (acc, group) => acc + (group.marginPercent ?? 0),
    0,
  );
  return sum / withMargin.length;
}

/**
 * Dashboard especializado de Rentabilidade por Rota (RC 27.6.0).
 */
function RouteProfitabilityDashboard({
  dre,
  byRoute,
  byCustomerGroups = [],
  byVehicleGroups = [],
  filterOptions,
  initialFilters,
  chartPoints,
  rankingRows,
  comparisons,
  error = null,
  onBreadcrumbTrailChange,
}: RouteProfitabilityDashboardProps) {
  const handleTrailChange = React.useCallback(
    (trail: {
      group: OperationalDreRouteGroup | null;
      detail: OperationalDreTripMetrics | null;
    }) => {
      if (!onBreadcrumbTrailChange) return;

      const crumbTrail = [];
      if (trail.group?.route.id) {
        crumbTrail.push({
          type: 'route' as const,
          id: trail.group.route.id,
          label: trail.group.label,
        });
      }
      if (trail.detail) {
        crumbTrail.push({
          type: 'trip' as const,
          id: trail.detail.id,
          label: trail.detail.tripNumber,
        });
      }

      onBreadcrumbTrailChange(
        buildContextualAnalyticsBreadcrumbs({
          moduleLabel: 'Rentabilidade por Rota',
          moduleHref: ROUTES.dashboardRentabilidadeRotas,
          filters: initialFilters,
          trail: crumbTrail,
        }),
      );
    },
    [initialFilters, onBreadcrumbTrailChange],
  );

  const avgMargin = averageMargin(byRoute.groups);
  const profitClass =
    dre.result.operatingProfit < 0 ? 'text-destructive' : undefined;

  const branchLabel =
    filterOptions.branches.find((b) => b.id === initialFilters.branchId)
      ?.name ?? null;

  const insights = React.useMemo(
    () =>
      buildRelatedInsights({
        filters: initialFilters,
        customers: byCustomerGroups,
        routes: byRoute.groups,
        vehicles: byVehicleGroups,
        branchLabel,
      }),
    [
      branchLabel,
      byCustomerGroups,
      byRoute.groups,
      byVehicleGroups,
      initialFilters,
    ],
  );

  const exportPayload = React.useMemo(
    () =>
      buildRankingExportPayload({
        title: 'Rentabilidade por Rota',
        kpis: [
          {
            label: 'Receita Total',
            value: formatCurrencyBr(dre.revenues.totalRevenue),
          },
          {
            label: 'Lucro Total',
            value: formatCurrencyBr(dre.result.operatingProfit),
          },
          {label: 'Margem Média', value: formatPercent(avgMargin)},
        ],
        columns: [
          {id: 'status', header: 'Status'},
          {id: 'name', header: 'Rota'},
          {id: 'revenue', header: 'Receita'},
          {id: 'costs', header: 'Custos'},
          {id: 'profit', header: 'Lucro'},
          {id: 'margin', header: 'Margem'},
        ],
        rows: rankingRows.map((row) => ({
          status: formatMarginStatus(row.status as MarginStatus),
          name: row.name,
          revenue: row.revenue,
          costs: row.costs,
          profit: row.profit,
          margin: row.marginPercent,
        })),
      }),
    [avgMargin, dre, rankingRows],
  );

  const crossLinks = React.useMemo(
    () => [
      {
        label: 'Abrir Clientes',
        href: buildCrossNavHref('rentabilidade-clientes', initialFilters),
      },
      {
        label: 'Abrir Veículos',
        href: buildCrossNavHref('rentabilidade-veiculos', initialFilters),
      },
      {
        label: 'Abrir DRE',
        href: buildCrossNavHref('dre', initialFilters),
      },
      {
        label: 'Abrir Inteligência',
        href: buildCrossNavHref('inteligencia', initialFilters),
      },
    ],
    [initialFilters],
  );

  return (
    <AnalyticsShell
      filters={initialFilters}
      currentModule="rentabilidade-rotas"
      basePath={ROUTES.dashboardRentabilidadeRotas}
      filenameBase="rentabilidade-rotas"
      exportPayload={exportPayload}
      insights={insights}
      crossLinks={crossLinks}
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <OperationalDreFiltersBar
        options={filterOptions}
        initialFilters={initialFilters}
        basePath={ROUTES.dashboardRentabilidadeRotas}
      />

      <Section
        title="Indicadores"
        description="Consolidado operacional das rotas no período."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <StatCard
            title="Receita Total"
            value={formatCurrencyBr(dre.revenues.totalRevenue)}
          />
          <StatCard
            title="Custos Totais"
            value={formatCurrencyBr(dre.costs.totalOperatingCosts)}
          />
          <StatCard
            title="Lucro Total"
            value={
              <span className={profitClass}>
                {formatCurrencyBr(dre.result.operatingProfit)}
              </span>
            }
          />
          <StatCard title="Margem Média" value={formatPercent(avgMargin)} />
          <StatCard
            title="Receita por KM"
            value={formatRatio(dre.indicators.revenuePerKm, '/km')}
          />
          <StatCard
            title="Custo por KM"
            value={formatRatio(dre.indicators.costPerKm, '/km')}
          />
          <StatCard
            title="Lucro por KM"
            value={formatRatio(dre.indicators.profitPerKm, '/km')}
          />
        </div>
      </Section>

      <RevenueCostProfitChart points={chartPoints} />

      <Section title="Ranking de Rotas" description="Classificação por lucratividade.">
        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'status',
                header: 'Status',
                cell: (row: RouteRankingRow) =>
                  formatMarginStatus(row.status as MarginStatus),
              },
              {
                id: 'route',
                header: 'Rota',
                cell: (row: RouteRankingRow) => row.name,
              },
              {
                id: 'revenue',
                header: 'Receita',
                cell: (row: RouteRankingRow) => formatCurrencyBr(row.revenue),
              },
              {
                id: 'costs',
                header: 'Custos',
                cell: (row: RouteRankingRow) => formatCurrencyBr(row.costs),
              },
              {
                id: 'profit',
                header: 'Lucro',
                cell: (row: RouteRankingRow) => (
                  <span className={row.profit < 0 ? 'text-destructive' : undefined}>
                    {formatCurrencyBr(row.profit)}
                  </span>
                ),
              },
              {
                id: 'margin',
                header: 'Margem',
                cell: (row: RouteRankingRow) =>
                  row.marginPercent == null
                    ? '—'
                    : formatPercent(row.marginPercent),
              },
            ]}
            data={rankingRows}
            getRowKey={(row) => row.id}
              emptyTitle="Nenhum registro encontrado"
              emptyDescription="Ajuste os filtros para visualizar o ranking."
          />
        </TableContainer>
      </Section>

      <Section
        title="Drill-down operacional"
        description="Rota → Viagens → Resumo financeiro → Categorias → Lançamentos."
      >
        <OperationalDreRouteCosts
          data={byRoute}
          filters={initialFilters}
          basePath={ROUTES.dashboardRentabilidadeRotas}
          comparisons={comparisons}
          onActiveTrailChange={handleTrailChange}
        />
      </Section>
    </AnalyticsShell>
  );
}

export {RouteProfitabilityDashboard};
