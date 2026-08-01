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
import {formatCurrencyBr} from '@/features/financial/utils/financial-format';
import type {
  VehicleHighlightItem,
  VehicleRankingRow,
} from '@/features/organization/dashboard/utils/rankings';
import type {BreadcrumbItem} from '@/types/global/navigation';

import type {
  OperationalDreByVehicleData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreRouteGroup,
  OperationalDreTripMetrics,
  OperationalDreVehicleGroup,
} from '../types';
import type {PeriodDelta} from '../utils/period-comparison';
import {OperationalDreFiltersBar} from './operational-dre-filters';
import {OperationalDreVehicleCosts} from './operational-dre-vehicle-costs';
import type {PeriodChartPoint} from './revenue-cost-profit-chart';
import {VehicleHighlightCard} from './vehicle-highlight-card';
import dynamic from 'next/dynamic';
import {Skeleton} from '@/components/ui/skeleton';

const DimensionBarChart = dynamic(
  () => import('./dimension-bar-chart').then((m) => m.DimensionBarChart),
  {loading: () => <Skeleton className="h-56 w-full rounded-xl" />},
);
const RevenueCostProfitChart = dynamic(
  () =>
    import('./revenue-cost-profit-chart').then((m) => m.RevenueCostProfitChart),
  {loading: () => <Skeleton className="h-64 w-full rounded-xl" />},
);

export interface VehicleBarChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface VehicleProfitabilityDashboardProps {
  dre: OperationalDreData;
  byVehicle: OperationalDreByVehicleData;
  byCustomerGroups?: OperationalDreCustomerGroup[];
  byRouteGroups?: OperationalDreRouteGroup[];
  filterOptions: OperationalDreFilterOptions;
  initialFilters: OperationalDreFilters;
  chartPoints: PeriodChartPoint[];
  revenueByVehiclePoints: VehicleBarChartPoint[];
  costByVehiclePoints: VehicleBarChartPoint[];
  profitByVehiclePoints: VehicleBarChartPoint[];
  rankingRows: VehicleRankingRow[];
  highlights: {
    highestRevenue: VehicleHighlightItem | null;
    highestProfit: VehicleHighlightItem | null;
    highestCost: VehicleHighlightItem | null;
    lowestProfitability: VehicleHighlightItem | null;
  };
  comparisons: Map<string, PeriodDelta>;
  error?: string | null;
  onBreadcrumbTrailChange?: (items: BreadcrumbItem[]) => void;
}

function formatRatio(value: number | null, suffix = ''): string {
  if (value === null) return '—';
  return `${formatCurrencyBr(value)}${suffix}`;
}

function formatKm(value: number): string {
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})} km`;
}

/**
 * Dashboard especializado de Rentabilidade por Veículo (RC 27.4.1 + 27.6.0).
 */
function VehicleProfitabilityDashboard({
  dre,
  byVehicle,
  byCustomerGroups = [],
  byRouteGroups = [],
  filterOptions,
  initialFilters,
  chartPoints,
  revenueByVehiclePoints,
  costByVehiclePoints,
  profitByVehiclePoints,
  rankingRows,
  highlights,
  comparisons,
  error = null,
  onBreadcrumbTrailChange,
}: VehicleProfitabilityDashboardProps) {
  const handleTrailChange = React.useCallback(
    (trail: {
      group: OperationalDreVehicleGroup | null;
      detail: OperationalDreTripMetrics | null;
    }) => {
      if (!onBreadcrumbTrailChange) return;

      const crumbTrail = [];
      if (trail.group?.vehicle.id) {
        crumbTrail.push({
          type: 'vehicle' as const,
          id: trail.group.vehicle.id,
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
          moduleLabel: 'Rentabilidade por Veículo',
          moduleHref: ROUTES.dashboardRentabilidadeVeiculos,
          filters: initialFilters,
          trail: crumbTrail,
        }),
      );
    },
    [initialFilters, onBreadcrumbTrailChange],
  );

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
        routes: byRouteGroups,
        vehicles: byVehicle.groups,
        branchLabel,
      }),
    [
      branchLabel,
      byCustomerGroups,
      byRouteGroups,
      byVehicle.groups,
      initialFilters,
    ],
  );

  const exportPayload = React.useMemo(
    () =>
      buildRankingExportPayload({
        title: 'Rentabilidade por Veículo',
        kpis: [
          {label: 'Receita', value: formatCurrencyBr(dre.revenues.totalRevenue)},
          {
            label: 'Lucro',
            value: formatCurrencyBr(dre.result.operatingProfit),
          },
          {label: 'KM Rodados', value: formatKm(dre.indicators.totalKm)},
        ],
        columns: [
          {id: 'name', header: 'Veículo'},
          {id: 'revenue', header: 'Receita'},
          {id: 'costs', header: 'Custos'},
          {id: 'profit', header: 'Lucro'},
          {id: 'km', header: 'KM'},
          {id: 'revenuePerKm', header: 'Receita/KM'},
          {id: 'profitPerKm', header: 'Lucro/KM'},
        ],
        rows: rankingRows.map((row) => ({
          name: row.name,
          revenue: row.revenue,
          costs: row.costs,
          profit: row.profit,
          km: row.totalKm,
          revenuePerKm: row.revenuePerKm,
          profitPerKm: row.profitPerKm,
        })),
      }),
    [dre, rankingRows],
  );

  const crossLinks = React.useMemo(
    () => [
      {
        label: 'Ver Rotas',
        href: buildCrossNavHref('rentabilidade-rotas', initialFilters),
      },
      {
        label: 'Ver Cliente',
        href: buildCrossNavHref('rentabilidade-clientes', initialFilters),
      },
      {
        label: 'Ver Viagens',
        href: buildCrossNavHref('viagens', initialFilters),
      },
      {
        label: 'Ver Financeiro',
        href: buildCrossNavHref('financeiro', initialFilters),
      },
    ],
    [initialFilters],
  );

  return (
    <AnalyticsShell
      filters={initialFilters}
      currentModule="rentabilidade-veiculos"
      basePath={ROUTES.dashboardRentabilidadeVeiculos}
      filenameBase="rentabilidade-veiculos"
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
        basePath={ROUTES.dashboardRentabilidadeVeiculos}
      />

      <Section
        title="Indicadores"
        description="Qual veículo gera mais dinheiro no período."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
          <StatCard
            title="Receita"
            value={formatCurrencyBr(dre.revenues.totalRevenue)}
          />
          <StatCard
            title="Custos"
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
          <StatCard title="KM Rodados" value={formatKm(dre.indicators.totalKm)} />
          <StatCard
            title="Receita/KM"
            value={formatRatio(dre.indicators.revenuePerKm, '/km')}
          />
          <StatCard
            title="Custo/KM"
            value={formatRatio(dre.indicators.costPerKm, '/km')}
          />
          <StatCard
            title="Lucro/KM"
            value={formatRatio(dre.indicators.profitPerKm, '/km')}
          />
          <StatCard
            title="Número de Viagens"
            value={dre.indicators.tripCount.toLocaleString('pt-BR')}
          />
        </div>
      </Section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <VehicleHighlightCard
          title="Maior Receita"
          description="Veículo com maior faturamento"
          item={highlights.highestRevenue}
          emptyMessage="Sem veículos no período."
        />
        <VehicleHighlightCard
          title="Maior Lucro"
          description="Veículo mais lucrativo"
          item={highlights.highestProfit}
          emptyMessage="Sem veículos no período."
        />
        <VehicleHighlightCard
          title="Maior Custo"
          description="Veículo com maior custo operacional"
          item={highlights.highestCost}
          emptyMessage="Sem veículos no período."
          valueTone="destructive"
        />
        <VehicleHighlightCard
          title="Menor Rentabilidade"
          description="Pior margem no período"
          item={highlights.lowestProfitability}
          emptyMessage="Sem veículos no período."
          valueTone="destructive"
        />
      </div>

      <RevenueCostProfitChart
        points={chartPoints}
        title="Receita × Custos × Lucro"
        description="Evolução operacional no período"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <DimensionBarChart
          title="Receita por veículo"
          description="Principais veículos por receita"
          points={revenueByVehiclePoints}
          valueLabel="Receita"
        />
        <DimensionBarChart
          title="Custos por veículo"
          description="Principais veículos por custo"
          points={costByVehiclePoints}
          valueLabel="Custos"
        />
        <DimensionBarChart
          title="Lucro por veículo"
          description="Principais veículos por lucro"
          points={profitByVehiclePoints}
          valueLabel="Lucro"
        />
      </div>

      <Section
        title="Ranking de Veículos"
        description="Classificação por lucratividade e eficiência por KM."
      >
        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'vehicle',
                header: 'Veículo',
                cell: (row: VehicleRankingRow) => row.name,
              },
              {
                id: 'revenue',
                header: 'Receita',
                cell: (row: VehicleRankingRow) => formatCurrencyBr(row.revenue),
              },
              {
                id: 'costs',
                header: 'Custos',
                cell: (row: VehicleRankingRow) => formatCurrencyBr(row.costs),
              },
              {
                id: 'profit',
                header: 'Lucro',
                cell: (row: VehicleRankingRow) => (
                  <span className={row.profit < 0 ? 'text-destructive' : undefined}>
                    {formatCurrencyBr(row.profit)}
                  </span>
                ),
              },
              {
                id: 'km',
                header: 'KM',
                cell: (row: VehicleRankingRow) =>
                  row.totalKm.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  }),
              },
              {
                id: 'revenuePerKm',
                header: 'Receita/KM',
                cell: (row: VehicleRankingRow) =>
                  formatRatio(row.revenuePerKm, '/km'),
              },
              {
                id: 'profitPerKm',
                header: 'Lucro/KM',
                cell: (row: VehicleRankingRow) =>
                  formatRatio(row.profitPerKm, '/km'),
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
        description="Veículo → Viagens → Abastecimentos → Manutenções → Pneus → Custos → Financeiro."
      >
        <OperationalDreVehicleCosts
          data={byVehicle}
          filters={initialFilters}
          basePath={ROUTES.dashboardRentabilidadeVeiculos}
          comparisons={comparisons}
          onActiveTrailChange={handleTrailChange}
        />
      </Section>
    </AnalyticsShell>
  );
}

export {VehicleProfitabilityDashboard};
