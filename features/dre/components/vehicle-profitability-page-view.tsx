'use client';

import * as React from 'react';

import {PageTemplate} from '@/components/layout/page-template';
import {ROUTES} from '@/constants/routes/paths';
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
} from '../types';
import type {PeriodDelta} from '../utils/period-comparison';
import type {PeriodChartPoint} from './revenue-cost-profit-chart';
import {
  VehicleProfitabilityDashboard,
  type VehicleBarChartPoint,
} from './vehicle-profitability-dashboard';

const DEFAULT_CRUMBS: BreadcrumbItem[] = [
  {label: 'Dashboard', href: ROUTES.dashboard},
  {label: 'Rentabilidade por Veículo'},
];

export interface VehicleProfitabilityPageViewProps {
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
  comparisons: Array<[string, PeriodDelta]>;
  error?: string | null;
}

function VehicleProfitabilityPageView({
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
}: VehicleProfitabilityPageViewProps) {
  const [breadcrumbItems, setBreadcrumbItems] =
    React.useState<BreadcrumbItem[]>(DEFAULT_CRUMBS);

  const comparisonMap = React.useMemo(
    () => new Map(comparisons),
    [comparisons],
  );

  return (
    <PageTemplate
      title="Rentabilidade por Veículo"
      description="Identifique qual veículo gera mais dinheiro para a operação."
      breadcrumbItems={breadcrumbItems}
    >
      <VehicleProfitabilityDashboard
        dre={dre}
        byVehicle={byVehicle}
        byCustomerGroups={byCustomerGroups}
        byRouteGroups={byRouteGroups}
        filterOptions={filterOptions}
        initialFilters={initialFilters}
        chartPoints={chartPoints}
        revenueByVehiclePoints={revenueByVehiclePoints}
        costByVehiclePoints={costByVehiclePoints}
        profitByVehiclePoints={profitByVehiclePoints}
        rankingRows={rankingRows}
        highlights={highlights}
        comparisons={comparisonMap}
        error={error}
        onBreadcrumbTrailChange={setBreadcrumbItems}
      />
    </PageTemplate>
  );
}

export {VehicleProfitabilityPageView};
