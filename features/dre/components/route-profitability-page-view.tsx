'use client';

import * as React from 'react';

import {PageTemplate} from '@/components/layout/page-template';
import {ROUTES} from '@/constants/routes/paths';
import type {BreadcrumbItem} from '@/types/global/navigation';
import type {RouteRankingRow} from '@/features/organization/dashboard/utils/rankings';

import {RouteProfitabilityDashboard} from './route-profitability-dashboard';
import type {PeriodChartPoint} from './revenue-cost-profit-chart';
import type {
  OperationalDreByRouteData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreVehicleGroup,
} from '../types';
import type {PeriodDelta} from '../utils/period-comparison';

const DEFAULT_CRUMBS: BreadcrumbItem[] = [
  {label: 'Dashboard', href: ROUTES.dashboard},
  {label: 'Rentabilidade por Rota'},
];

export interface RouteProfitabilityPageViewProps {
  dre: OperationalDreData;
  byRoute: OperationalDreByRouteData;
  byCustomerGroups?: OperationalDreCustomerGroup[];
  byVehicleGroups?: OperationalDreVehicleGroup[];
  filterOptions: OperationalDreFilterOptions;
  initialFilters: OperationalDreFilters;
  chartPoints: PeriodChartPoint[];
  rankingRows: RouteRankingRow[];
  comparisons: Array<[string, PeriodDelta]>;
  error?: string | null;
}

function RouteProfitabilityPageView({
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
}: RouteProfitabilityPageViewProps) {
  const [breadcrumbItems, setBreadcrumbItems] =
    React.useState<BreadcrumbItem[]>(DEFAULT_CRUMBS);

  const comparisonMap = React.useMemo(
    () => new Map(comparisons),
    [comparisons],
  );

  return (
    <PageTemplate
      title="Rentabilidade por Rota"
      description="Inteligência operacional: indicadores, ranking e drill-down por rota."
      breadcrumbItems={breadcrumbItems}
    >
      <RouteProfitabilityDashboard
        dre={dre}
        byRoute={byRoute}
        byCustomerGroups={byCustomerGroups}
        byVehicleGroups={byVehicleGroups}
        filterOptions={filterOptions}
        initialFilters={initialFilters}
        chartPoints={chartPoints}
        rankingRows={rankingRows}
        comparisons={comparisonMap}
        error={error}
        onBreadcrumbTrailChange={setBreadcrumbItems}
      />
    </PageTemplate>
  );
}

export {RouteProfitabilityPageView};
