'use client';

import * as React from 'react';

import {PageTemplate} from '@/components/layout/page-template';
import {ROUTES} from '@/constants/routes/paths';
import type {BreadcrumbItem} from '@/types/global/navigation';
import type {
  CustomerRankingRow,
  TopCustomerRankingItem,
} from '@/features/organization/dashboard/utils/rankings';

import {
  CustomerProfitabilityDashboard,
  type CustomerBarChartPoint,
} from './customer-profitability-dashboard';
import type {PeriodChartPoint} from './revenue-cost-profit-chart';
import type {
  OperationalDreByCustomerData,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreRouteGroup,
  OperationalDreVehicleGroup,
} from '../types';
import type {PeriodDelta} from '../utils/period-comparison';

const DEFAULT_CRUMBS: BreadcrumbItem[] = [
  {label: 'Dashboard', href: ROUTES.dashboard},
  {label: 'Rentabilidade por Cliente'},
];

export interface CustomerProfitabilityPageViewProps {
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
  comparisons: Array<[string, PeriodDelta]>;
  periodComparison: PeriodDelta;
  error?: string | null;
}

function CustomerProfitabilityPageView({
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
}: CustomerProfitabilityPageViewProps) {
  const [breadcrumbItems, setBreadcrumbItems] =
    React.useState<BreadcrumbItem[]>(DEFAULT_CRUMBS);

  const comparisonMap = React.useMemo(
    () => new Map(comparisons),
    [comparisons],
  );

  return (
    <PageTemplate
      title="Rentabilidade por Cliente"
      description="Identifique quais clientes realmente geram lucro para a empresa."
      breadcrumbItems={breadcrumbItems}
    >
      <CustomerProfitabilityDashboard
        dre={dre}
        byCustomer={byCustomer}
        byRouteGroups={byRouteGroups}
        byVehicleGroups={byVehicleGroups}
        filterOptions={filterOptions}
        initialFilters={initialFilters}
        chartPoints={chartPoints}
        profitByCustomerPoints={profitByCustomerPoints}
        topCustomersChartPoints={topCustomersChartPoints}
        rankingRows={rankingRows}
        topCustomers={topCustomers}
        lossMakingCustomers={lossMakingCustomers}
        comparisons={comparisonMap}
        periodComparison={periodComparison}
        error={error}
        onBreadcrumbTrailChange={setBreadcrumbItems}
      />
    </PageTemplate>
  );
}

export {CustomerProfitabilityPageView};
