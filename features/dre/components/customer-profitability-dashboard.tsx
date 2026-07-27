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
import type {
  CustomerRankingRow,
  TopCustomerRankingItem,
} from '@/features/organization/dashboard/utils/rankings';
import type {BreadcrumbItem} from '@/types/global/navigation';
import {cn} from '@/lib/utils';

import type {
  OperationalDreByCustomerData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreRouteGroup,
  OperationalDreTripMetrics,
  OperationalDreVehicleGroup,
} from '../types';
import type {PeriodDelta} from '../utils/period-comparison';
import {
  formatCompactDeltaPercent,
  isFavorableDelta,
} from '../utils/period-comparison';
import {CustomerSideRankingCard} from './customer-side-ranking-card';
import {DimensionBarChart} from './dimension-bar-chart';
import type {PeriodChartPoint} from './revenue-cost-profit-chart';
import {OperationalDreCustomerCosts} from './operational-dre-customer-costs';
import {OperationalDreFiltersBar} from './operational-dre-filters';
import {RevenueCostProfitChart} from './revenue-cost-profit-chart';

export interface CustomerBarChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface CustomerProfitabilityDashboardProps {
  dre: OperationalDreData;
  byCustomer: OperationalDreByCustomerData;
  byRouteGroups?: OperationalDreRouteGroup[];
  byVehicleGroups?: OperationalDreVehicleGroup[];
  filterOptions: OperationalDreFilterOptions;
  initialFilters: OperationalDreFilters;
  chartPoints: PeriodChartPoint[];
  profitByCustomerPoints: CustomerBarChartPoint[];
  topCustomersChartPoints: CustomerBarChartPoint[];
  rankingRows: CustomerRankingRow[];
  topCustomers: TopCustomerRankingItem[];
  lossMakingCustomers: TopCustomerRankingItem[];
  comparisons: Map<string, PeriodDelta>;
  periodComparison: PeriodDelta;
  error?: string | null;
  onBreadcrumbTrailChange?: (items: BreadcrumbItem[]) => void;
}

function formatRatio(value: number | null): string {
  if (value === null) return '—';
  return formatCurrencyBr(value);
}

function averageMargin(groups: OperationalDreCustomerGroup[]): number {
  const withMargin = groups.filter((group) => group.marginPercent != null);
  if (withMargin.length === 0) return 0;
  const sum = withMargin.reduce(
    (acc, group) => acc + (group.marginPercent ?? 0),
    0,
  );
  return sum / withMargin.length;
}

function DeltaSubtitle({
  value,
  invertGood = false,
}: {
  value: number | null;
  invertGood?: boolean;
}) {
  const favorable = isFavorableDelta(value, invertGood);
  return (
    <span
      className={cn(
        'font-financial',
        favorable === true
          ? 'text-emerald-600'
          : favorable === false
            ? 'text-destructive'
            : undefined,
      )}
    >
      {formatCompactDeltaPercent(value)} vs período anterior
    </span>
  );
}

/**
 * Dashboard especializado de Rentabilidade por Cliente (RC 27.4.0 + 27.6.0).
 */
function CustomerProfitabilityDashboard({
  dre,
  byCustomer,
  byRouteGroups = [],
  byVehicleGroups = [],
  filterOptions,
  initialFilters,
  chartPoints,
  profitByCustomerPoints,
  topCustomersChartPoints,
  rankingRows,
  topCustomers,
  lossMakingCustomers,
  comparisons,
  periodComparison,
  error = null,
  onBreadcrumbTrailChange,
}: CustomerProfitabilityDashboardProps) {
  const handleTrailChange = React.useCallback(
    (trail: {
      group: OperationalDreCustomerGroup | null;
      detail: OperationalDreTripMetrics | null;
    }) => {
      if (!onBreadcrumbTrailChange) return;

      const crumbTrail = [];
      if (trail.group?.customer.id) {
        crumbTrail.push({
          type: 'customer' as const,
          id: trail.group.customer.id,
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
          moduleLabel: 'Rentabilidade por Cliente',
          moduleHref: ROUTES.dashboardRentabilidadeClientes,
          filters: initialFilters,
          trail: crumbTrail,
        }),
      );
    },
    [initialFilters, onBreadcrumbTrailChange],
  );

  const avgMargin = averageMargin(byCustomer.groups);
  const customerCount = byCustomer.groups.length;
  const ticketMedio =
    customerCount > 0 ? dre.revenues.totalRevenue / customerCount : null;
  const profitClass =
    dre.result.operatingProfit < 0 ? 'text-destructive' : undefined;

  const branchLabel =
    filterOptions.branches.find((b) => b.id === initialFilters.branchId)
      ?.name ?? null;

  const insights = React.useMemo(
    () =>
      buildRelatedInsights({
        filters: initialFilters,
        customers: byCustomer.groups,
        routes: byRouteGroups,
        vehicles: byVehicleGroups,
        branchLabel,
      }),
    [
      branchLabel,
      byCustomer.groups,
      byRouteGroups,
      byVehicleGroups,
      initialFilters,
    ],
  );

  const exportPayload = React.useMemo(
    () =>
      buildRankingExportPayload({
        title: 'Rentabilidade por Cliente',
        kpis: [
          {
            label: 'Receita Total',
            value: formatCurrencyBr(dre.revenues.totalRevenue),
          },
          {
            label: 'Lucro Operacional',
            value: formatCurrencyBr(dre.result.operatingProfit),
          },
          {label: 'Margem Média', value: formatPercent(avgMargin)},
          {
            label: 'Clientes',
            value: customerCount.toLocaleString('pt-BR'),
          },
        ],
        columns: [
          {id: 'name', header: 'Cliente'},
          {id: 'revenue', header: 'Receita'},
          {id: 'costs', header: 'Custos'},
          {id: 'profit', header: 'Lucro'},
          {id: 'margin', header: 'Margem'},
          {id: 'trips', header: 'Viagens'},
          {id: 'status', header: 'Status'},
        ],
        rows: rankingRows.map((row) => ({
          name: row.name,
          revenue: row.revenue,
          costs: row.costs,
          profit: row.profit,
          margin: row.marginPercent,
          trips: row.tripCount,
          status: formatMarginStatus(row.status as MarginStatus),
        })),
      }),
    [avgMargin, customerCount, dre, rankingRows],
  );

  const crossLinks = React.useMemo(
    () => [
      {
        label: 'Abrir Rotas',
        href: buildCrossNavHref('rentabilidade-rotas', initialFilters),
      },
      {
        label: 'Abrir Veículos',
        href: buildCrossNavHref('rentabilidade-veiculos', initialFilters),
      },
      {
        label: 'Abrir Inteligência Operacional',
        href: buildCrossNavHref('inteligencia', initialFilters),
      },
    ],
    [initialFilters],
  );

  return (
    <AnalyticsShell
      filters={initialFilters}
      currentModule="rentabilidade-clientes"
      basePath={ROUTES.dashboardRentabilidadeClientes}
      filenameBase="rentabilidade-clientes"
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
        basePath={ROUTES.dashboardRentabilidadeClientes}
      />

      <Section
        title="Indicadores"
        description="Quanto cada cliente realmente deixa de lucro no período."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
          <StatCard
            title="Receita Total"
            value={formatCurrencyBr(dre.revenues.totalRevenue)}
            subtitle={
              <DeltaSubtitle value={periodComparison.revenuePercent} />
            }
          />
          <StatCard
            title="Custos Totais"
            value={formatCurrencyBr(dre.costs.totalOperatingCosts)}
            subtitle={
              <DeltaSubtitle
                value={periodComparison.costPercent}
                invertGood
              />
            }
          />
          <StatCard
            title="Lucro Operacional"
            value={
              <span className={profitClass}>
                {formatCurrencyBr(dre.result.operatingProfit)}
              </span>
            }
            subtitle={
              <DeltaSubtitle value={periodComparison.profitPercent} />
            }
          />
          <StatCard title="Margem Média" value={formatPercent(avgMargin)} />
          <StatCard
            title="Número de Clientes"
            value={customerCount.toLocaleString('pt-BR')}
          />
          <StatCard title="Ticket Médio" value={formatRatio(ticketMedio)} />
          <StatCard
            title="Receita Média por Viagem"
            value={formatRatio(dre.indicators.revenuePerTrip)}
          />
          <StatCard
            title="Lucro Médio por Viagem"
            value={formatRatio(dre.indicators.profitPerTrip)}
          />
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueCostProfitChart
            points={chartPoints}
            title="Receita × Custos"
            description="Evolução operacional no período"
          />
        </div>
        <CustomerSideRankingCard
          title="Top 10 Clientes Mais Lucrativos"
          description="Maiores lucros no período"
          customers={topCustomers}
          emptyMessage="Nenhum cliente lucrativo no período."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Section
            title="Ranking de Clientes"
            description="Classificação por lucratividade real."
          >
            <TableContainer>
              <DataTable
                columns={[
                  {
                    id: 'customer',
                    header: 'Cliente',
                    cell: (row: CustomerRankingRow) => row.name,
                  },
                  {
                    id: 'revenue',
                    header: 'Receita',
                    cell: (row: CustomerRankingRow) =>
                      formatCurrencyBr(row.revenue),
                  },
                  {
                    id: 'costs',
                    header: 'Custos',
                    cell: (row: CustomerRankingRow) =>
                      formatCurrencyBr(row.costs),
                  },
                  {
                    id: 'profit',
                    header: 'Lucro',
                    cell: (row: CustomerRankingRow) => (
                      <span
                        className={
                          row.profit < 0 ? 'text-destructive' : undefined
                        }
                      >
                        {formatCurrencyBr(row.profit)}
                      </span>
                    ),
                  },
                  {
                    id: 'margin',
                    header: 'Margem',
                    cell: (row: CustomerRankingRow) =>
                      row.marginPercent == null
                        ? '—'
                        : formatPercent(row.marginPercent),
                  },
                  {
                    id: 'trips',
                    header: 'Viagens',
                    cell: (row: CustomerRankingRow) =>
                      row.tripCount.toLocaleString('pt-BR'),
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (row: CustomerRankingRow) =>
                      formatMarginStatus(row.status as MarginStatus),
                  },
                ]}
                data={rankingRows}
                getRowKey={(row) => row.id}
              emptyTitle="Nenhum registro encontrado"
              emptyDescription="Ajuste os filtros para visualizar o ranking."
              />
            </TableContainer>
          </Section>
        </div>
        <CustomerSideRankingCard
          title="Clientes com Prejuízo"
          description="Apenas clientes com margem negativa"
          customers={lossMakingCustomers}
          emptyMessage="Nenhum cliente com margem negativa no período."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DimensionBarChart
          title="Lucro por Cliente"
          description="Resultado operacional dos principais clientes"
          points={profitByCustomerPoints}
          valueLabel="Lucro"
        />
        <DimensionBarChart
          title="Top Clientes"
          description="Top 10 por lucro no período"
          points={topCustomersChartPoints}
          valueLabel="Lucro"
        />
      </div>

      <Section
        title="Drill-down operacional"
        description="Cliente → Viagens → Custos → Categorias financeiras → Lançamentos."
      >
        <OperationalDreCustomerCosts
          data={byCustomer}
          filters={initialFilters}
          basePath={ROUTES.dashboardRentabilidadeClientes}
          comparisons={comparisons}
          onActiveTrailChange={handleTrailChange}
        />
      </Section>
    </AnalyticsShell>
  );
}

export {CustomerProfitabilityDashboard};
