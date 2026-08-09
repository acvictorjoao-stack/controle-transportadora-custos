'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

import {DataTable} from '@/components/data-display/data-table';
import {StatCard} from '@/components/data-display/stat-card';
import {TableContainer} from '@/components/data-display/table-container';
import {Section} from '@/components/layout/section';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Skeleton} from '@/components/ui/skeleton';
import {
  AnalyticsShell,
  buildContextualAnalyticsBreadcrumbs,
  buildCrossNavHref,
  buildRankingExportPayload,
  buildRelatedInsights,
} from '@/features/analytics-nav';
import {ROUTES} from '@/constants/routes/paths';
import {
  formatCurrencyBr,
  formatPercent,
} from '@/features/financial/utils/financial-format';
import type {DriverRankingRow} from '@/features/organization/dashboard/utils/rankings';
import {VEHICLE_NATIVE_SELECT_CLASS} from '@/features/vehicles/utils/form-styles';
import type {BreadcrumbItem} from '@/types/global/navigation';

import type {
  OperationalDreByDriverData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreDriverGroup,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreRouteGroup,
  OperationalDreTripMetrics,
  OperationalDreVehicleGroup,
} from '../types';
import type {PeriodDelta} from '../utils/period-comparison';
import {OperationalDreDriverCosts} from './operational-dre-driver-costs';
import {OperationalDreFiltersBar} from './operational-dre-filters';
import type {PeriodChartPoint} from './revenue-cost-profit-chart';

const DimensionBarChart = dynamic(
  () => import('./dimension-bar-chart').then((m) => m.DimensionBarChart),
  {loading: () => <Skeleton className="h-56 w-full rounded-xl" />},
);
const RevenueCostProfitChart = dynamic(
  () =>
    import('./revenue-cost-profit-chart').then((m) => m.RevenueCostProfitChart),
  {loading: () => <Skeleton className="h-64 w-full rounded-xl" />},
);

export interface DriverBarChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface DriverProfitabilityDashboardProps {
  dre: OperationalDreData;
  byDriver: OperationalDreByDriverData;
  byCustomerGroups?: OperationalDreCustomerGroup[];
  byRouteGroups?: OperationalDreRouteGroup[];
  byVehicleGroups?: OperationalDreVehicleGroup[];
  filterOptions: OperationalDreFilterOptions;
  initialFilters: OperationalDreFilters;
  chartPoints: PeriodChartPoint[];
  profitByDriverPoints: DriverBarChartPoint[];
  rankingRows: DriverRankingRow[];
  comparisons: Map<string, PeriodDelta>;
  error?: string | null;
  onBreadcrumbTrailChange?: (items: BreadcrumbItem[]) => void;
}

type DriverSortKey =
  | 'profit'
  | 'revenue'
  | 'costs'
  | 'margin'
  | 'trips'
  | 'km'
  | 'revenuePerTrip'
  | 'costPerTrip';

function formatRatio(value: number | null, suffix = ''): string {
  if (value === null) return '—';
  return `${formatCurrencyBr(value)}${suffix}`;
}

function formatKm(value: number): string {
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})} km`;
}

function averageMargin(groups: OperationalDreDriverGroup[]): number {
  const withMargin = groups.filter((group) => group.marginPercent != null);
  if (withMargin.length === 0) return 0;
  const sum = withMargin.reduce(
    (acc, group) => acc + (group.marginPercent ?? 0),
    0,
  );
  return sum / withMargin.length;
}

function sortDriverRows(
  rows: DriverRankingRow[],
  sortKey: DriverSortKey,
): DriverRankingRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const pick = (row: DriverRankingRow): number => {
      switch (sortKey) {
        case 'revenue':
          return row.revenue;
        case 'costs':
          return row.costs;
        case 'margin':
          return row.marginPercent ?? Number.NEGATIVE_INFINITY;
        case 'trips':
          return row.tripCount;
        case 'km':
          return row.totalKm;
        case 'revenuePerTrip':
          return row.revenuePerTrip ?? Number.NEGATIVE_INFINITY;
        case 'costPerTrip':
          return row.costPerTrip ?? Number.NEGATIVE_INFINITY;
        case 'profit':
        default:
          return row.profit;
      }
    };
    return pick(b) - pick(a);
  });
  return sorted;
}

/**
 * Dashboard especializado de Rentabilidade por Motorista.
 */
function DriverProfitabilityDashboard({
  dre,
  byDriver,
  byCustomerGroups = [],
  byRouteGroups = [],
  byVehicleGroups = [],
  filterOptions,
  initialFilters,
  chartPoints,
  profitByDriverPoints,
  rankingRows,
  comparisons,
  error = null,
  onBreadcrumbTrailChange,
}: DriverProfitabilityDashboardProps) {
  const [sortKey, setSortKey] = React.useState<DriverSortKey>('profit');

  const handleTrailChange = React.useCallback(
    (trail: {
      group: OperationalDreDriverGroup | null;
      detail: OperationalDreTripMetrics | null;
    }) => {
      if (!onBreadcrumbTrailChange) return;

      const crumbTrail = [];
      if (trail.group?.driver.id) {
        crumbTrail.push({
          type: 'driver' as const,
          id: trail.group.driver.id,
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
          moduleLabel: 'Rentabilidade por Motorista',
          moduleHref: ROUTES.dashboardRentabilidadeMotoristas,
          filters: initialFilters,
          trail: crumbTrail,
        }),
      );
    },
    [initialFilters, onBreadcrumbTrailChange],
  );

  const profitClass =
    dre.result.operatingProfit < 0 ? 'text-destructive' : undefined;
  const avgMargin = averageMargin(byDriver.groups);

  const branchLabel =
    filterOptions.branches.find((b) => b.id === initialFilters.branchId)
      ?.name ?? null;

  const sortedRankingRows = React.useMemo(
    () => sortDriverRows(rankingRows, sortKey),
    [rankingRows, sortKey],
  );

  const insights = React.useMemo(
    () =>
      buildRelatedInsights({
        filters: initialFilters,
        customers: byCustomerGroups,
        routes: byRouteGroups,
        vehicles: byVehicleGroups,
        branchLabel,
      }),
    [
      branchLabel,
      byCustomerGroups,
      byRouteGroups,
      byVehicleGroups,
      initialFilters,
    ],
  );

  const exportPayload = React.useMemo(
    () =>
      buildRankingExportPayload({
        title: 'Rentabilidade por Motorista',
        kpis: [
          {
            label: 'Receita Total',
            value: formatCurrencyBr(dre.revenues.totalRevenue),
          },
          {
            label: 'Lucro',
            value: formatCurrencyBr(dre.result.operatingProfit),
          },
          {label: 'Margem Média', value: formatPercent(avgMargin)},
          {
            label: 'Viagens',
            value: dre.indicators.tripCount.toLocaleString('pt-BR'),
          },
        ],
        columns: [
          {id: 'name', header: 'Motorista'},
          {id: 'trips', header: 'Viagens'},
          {id: 'revenue', header: 'Receita'},
          {id: 'costs', header: 'Custos'},
          {id: 'profit', header: 'Lucro'},
          {id: 'margin', header: 'Margem'},
          {id: 'km', header: 'KM'},
          {id: 'revenuePerTrip', header: 'Receita/Viagem'},
          {id: 'costPerTrip', header: 'Custo/Viagem'},
        ],
        rows: sortedRankingRows.map((row) => ({
          name: row.name,
          trips: row.tripCount,
          revenue: row.revenue,
          costs: row.costs,
          profit: row.profit,
          margin: row.marginPercent,
          km: row.totalKm,
          revenuePerTrip: row.revenuePerTrip,
          costPerTrip: row.costPerTrip,
        })),
      }),
    [avgMargin, dre, sortedRankingRows],
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
        label: 'Abrir Rotas',
        href: buildCrossNavHref('rentabilidade-rotas', initialFilters),
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
      currentModule="rentabilidade-motoristas"
      basePath={ROUTES.dashboardRentabilidadeMotoristas}
      filenameBase="rentabilidade-motoristas"
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
        basePath={ROUTES.dashboardRentabilidadeMotoristas}
      />

      <Section
        title="Indicadores"
        description="Rentabilidade consolidada dos motoristas no período."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatCard
            title="Receita Total"
            value={formatCurrencyBr(dre.revenues.totalRevenue)}
          />
          <StatCard
            title="Custo Total"
            value={formatCurrencyBr(dre.costs.totalOperatingCosts)}
          />
          <StatCard
            title="Lucro"
            value={
              <span className={profitClass}>
                {formatCurrencyBr(dre.result.operatingProfit)}
              </span>
            }
          />
          <StatCard title="Margem %" value={formatPercent(avgMargin)} />
          <StatCard
            title="Quantidade de Viagens"
            value={dre.indicators.tripCount.toLocaleString('pt-BR')}
          />
          <StatCard title="KM Rodado" value={formatKm(dre.indicators.totalKm)} />
          <StatCard
            title="Receita por Viagem"
            value={formatRatio(dre.indicators.revenuePerTrip)}
          />
          <StatCard
            title="Custo por Viagem"
            value={formatRatio(dre.indicators.costPerTrip)}
          />
          <StatCard
            title="Lucro por Viagem"
            value={formatRatio(dre.indicators.profitPerTrip)}
          />
        </div>
      </Section>

      <RevenueCostProfitChart
        points={chartPoints}
        title="Receita × Custos × Lucro"
        description="Evolução operacional no período"
      />

      <DimensionBarChart
        title="Lucro por motorista"
        description="Principais motoristas por lucro"
        points={profitByDriverPoints}
        valueLabel="Lucro"
      />

      <Section
        title="Ranking de Motoristas"
        description="Classificação por indicadores de rentabilidade."
      >
        <div className="mb-3 flex justify-end">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Ordenar por
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as DriverSortKey)}
              className={VEHICLE_NATIVE_SELECT_CLASS}
              aria-label="Ordenar ranking"
            >
              <option value="profit">Lucro</option>
              <option value="revenue">Receita</option>
              <option value="costs">Custos</option>
              <option value="margin">Margem %</option>
              <option value="trips">Viagens</option>
              <option value="km">KM</option>
              <option value="revenuePerTrip">Receita/Viagem</option>
              <option value="costPerTrip">Custo/Viagem</option>
            </select>
          </label>
        </div>
        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'driver',
                header: 'Motorista',
                cell: (row: DriverRankingRow) => row.name,
              },
              {
                id: 'trips',
                header: 'Viagens',
                cell: (row: DriverRankingRow) =>
                  row.tripCount.toLocaleString('pt-BR'),
              },
              {
                id: 'revenue',
                header: 'Receita',
                cell: (row: DriverRankingRow) => formatCurrencyBr(row.revenue),
              },
              {
                id: 'costs',
                header: 'Custos',
                cell: (row: DriverRankingRow) => formatCurrencyBr(row.costs),
              },
              {
                id: 'profit',
                header: 'Lucro',
                cell: (row: DriverRankingRow) => (
                  <span className={row.profit < 0 ? 'text-destructive' : undefined}>
                    {formatCurrencyBr(row.profit)}
                  </span>
                ),
              },
              {
                id: 'margin',
                header: 'Margem %',
                cell: (row: DriverRankingRow) =>
                  row.marginPercent == null
                    ? '—'
                    : formatPercent(row.marginPercent),
              },
              {
                id: 'km',
                header: 'KM',
                cell: (row: DriverRankingRow) =>
                  row.totalKm.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  }),
              },
              {
                id: 'revenuePerTrip',
                header: 'Receita/Viagem',
                cell: (row: DriverRankingRow) =>
                  formatRatio(row.revenuePerTrip),
              },
              {
                id: 'costPerTrip',
                header: 'Custo/Viagem',
                cell: (row: DriverRankingRow) => formatRatio(row.costPerTrip),
              },
            ]}
            data={sortedRankingRows}
            getRowKey={(row) => row.id}
            emptyTitle="Nenhum registro encontrado"
            emptyDescription="Ajuste os filtros para visualizar o ranking."
          />
        </TableContainer>
      </Section>

      <Section
        title="Drill-down operacional"
        description="Motorista → Viagens → Resumo financeiro → Categorias → Lançamentos."
      >
        <OperationalDreDriverCosts
          data={byDriver}
          filters={initialFilters}
          basePath={ROUTES.dashboardRentabilidadeMotoristas}
          comparisons={comparisons}
          onActiveTrailChange={handleTrailChange}
        />
      </Section>
    </AnalyticsShell>
  );
}

export {DriverProfitabilityDashboard};
