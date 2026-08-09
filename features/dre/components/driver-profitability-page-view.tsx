'use client';

import * as React from 'react';

import {PageTemplate} from '@/components/layout/page-template';
import {ROUTES} from '@/constants/routes/paths';
import type {DriverRankingRow} from '@/features/organization/dashboard/utils/rankings';
import type {BreadcrumbItem} from '@/types/global/navigation';

import type {
  OperationalDreByDriverData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreRouteGroup,
  OperationalDreVehicleGroup,
} from '../types';
import type {PeriodDelta} from '../utils/period-comparison';
import {
  DriverProfitabilityDashboard,
  type DriverBarChartPoint,
} from './driver-profitability-dashboard';
import type {PeriodChartPoint} from './revenue-cost-profit-chart';

const DEFAULT_CRUMBS: BreadcrumbItem[] = [
  {label: 'Dashboard', href: ROUTES.dashboard},
  {label: 'Rentabilidade por Motorista'},
];

export interface DriverProfitabilityPageViewProps {
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
  comparisons: Array<[string, PeriodDelta]>;
  error?: string | null;
}

function DriverProfitabilityPageView({
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
}: DriverProfitabilityPageViewProps) {
  const [breadcrumbItems, setBreadcrumbItems] =
    React.useState<BreadcrumbItem[]>(DEFAULT_CRUMBS);

  const comparisonMap = React.useMemo(
    () => new Map(comparisons),
    [comparisons],
  );

  return (
    <PageTemplate
      title="Rentabilidade por Motorista"
      description="Analise a rentabilidade individual de cada motorista no período."
      breadcrumbItems={breadcrumbItems}
    >
      <DriverProfitabilityDashboard
        dre={dre}
        byDriver={byDriver}
        byCustomerGroups={byCustomerGroups}
        byRouteGroups={byRouteGroups}
        byVehicleGroups={byVehicleGroups}
        filterOptions={filterOptions}
        initialFilters={initialFilters}
        chartPoints={chartPoints}
        profitByDriverPoints={profitByDriverPoints}
        rankingRows={rankingRows}
        comparisons={comparisonMap}
        error={error}
        onBreadcrumbTrailChange={setBreadcrumbItems}
      />
    </PageTemplate>
  );
}

export {DriverProfitabilityPageView};
