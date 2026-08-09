'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {buttonVariants} from '@/components/ui/button';
import {ROUTES} from '@/constants/routes/paths';
import {loadOperationalDreRouteTripsAction} from '@/features/dre/actions';
import {TripFinancialBreakdownLazy} from '@/features/financial/components/trip-financial-breakdown';
import {
  formatCurrencyBr,
  formatDateBr,
  formatPercent,
} from '@/features/financial/utils/financial-format';
import {VEHICLE_NATIVE_SELECT_CLASS} from '@/features/vehicles/utils/form-styles';
import {scheduleQueryUrlSync} from '@/lib/navigation/sync-query-url';
import {cn} from '@/lib/utils';

import type {
  OperationalDreByRouteData,
  OperationalDreFilters,
  OperationalDreRouteGroup,
  OperationalDreTripMetrics,
} from '../types';
import {buildOperationalDreUrl} from '../utils/list-url';
import type {PeriodDelta} from '../utils/period-comparison';
import {
  formatDeltaPercent,
  formatMarginPoints,
  isFavorableDelta,
} from '../utils/period-comparison';
import {
  AnalyticalExpandableTable,
  type AnalyticalExpandableColumn,
} from './analytical-expandable-table';

export interface OperationalDreRouteCostsProps {
  data: OperationalDreByRouteData;
  filters: OperationalDreFilters;
  /** Base path for period filter URL sync (default: DRE page). */
  basePath?: string;
  /** Comparativos vs período anterior, indexados por dimensionKey. */
  comparisons?: Map<string, PeriodDelta>;
  onActiveTrailChange?: (trail: {
    group: OperationalDreRouteGroup | null;
    detail: OperationalDreTripMetrics | null;
  }) => void;
}

function formatMoney(value: number): string {
  return formatCurrencyBr(value);
}

function formatRatio(value: number | null, suffix: string): string {
  if (value === null) return '—';
  return `${formatCurrencyBr(value)}${suffix}`;
}

function resultClass(value: number): string | undefined {
  return value < 0 ? 'text-destructive' : undefined;
}

/**
 * Seção "Custos por Rota" — tabela analítica expansível com dimensão `route`.
 * Terceiro nível: TripFinancialBreakdown (lazy) sob cada viagem.
 * Filtro de período local sincronizado com a DRE (URL).
 */
function OperationalDreRouteCosts({
  data,
  filters,
  basePath = ROUTES.dashboardDre,
  comparisons,
  onActiveTrailChange,
}: OperationalDreRouteCostsProps) {
  const router = useRouter();
  const filtersDateKey = `${filters.dateFrom ?? ''}|${filters.dateTo ?? ''}`;
  const [period, setPeriod] = React.useState({
    dateFrom: filters.dateFrom ?? '',
    dateTo: filters.dateTo ?? '',
  });
  const [syncedDateKey, setSyncedDateKey] = React.useState(filtersDateKey);

  if (syncedDateKey !== filtersDateKey) {
    setSyncedDateKey(filtersDateKey);
    setPeriod({
      dateFrom: filters.dateFrom ?? '',
      dateTo: filters.dateTo ?? '',
    });
  }

  React.useEffect(() => {
    return scheduleQueryUrlSync(router, () => {
      const nextFilters: OperationalDreFilters = {
        ...filters,
        dateFrom: period.dateFrom || undefined,
        dateTo: period.dateTo || undefined,
      };
      return buildOperationalDreUrl(nextFilters, basePath);
    });
  }, [basePath, period, filters, router]);

  const filtersKey = React.useMemo(
    () =>
      [
        filters.branchId ?? '',
        filters.customerId ?? '',
        filters.routeId ?? '',
        filters.costCenterId ?? '',
        filters.dateFrom ?? '',
        filters.dateTo ?? '',
      ].join('|'),
    [filters],
  );

  const groupColumns = React.useMemo<
    AnalyticalExpandableColumn<OperationalDreRouteGroup>[]
  >(
    () => [
      {
        id: 'route',
        header: 'Rota',
        cell: (row) => {
          const delta = comparisons?.get(row.dimensionKey);
          return (
            <div className="space-y-1">
              <span className="font-medium">{row.route.label}</span>
              {delta ? (
                <div className="grid gap-0.5 text-[11px] text-muted-foreground">
                  <ComparisonLine
                    label="Receita"
                    text={formatDeltaPercent(delta.revenuePercent)}
                    favorable={isFavorableDelta(delta.revenuePercent)}
                  />
                  <ComparisonLine
                    label="Custos"
                    text={formatDeltaPercent(delta.costPercent)}
                    favorable={isFavorableDelta(delta.costPercent, true)}
                  />
                  <ComparisonLine
                    label="Lucro"
                    text={formatDeltaPercent(delta.profitPercent)}
                    favorable={isFavorableDelta(delta.profitPercent)}
                  />
                  <ComparisonLine
                    label="Margem"
                    text={formatMarginPoints(delta.marginPoints)}
                    favorable={isFavorableDelta(delta.marginPoints)}
                  />
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'tripCount',
        header: 'Viagens',
        cell: (row) => row.tripCount.toLocaleString('pt-BR'),
      },
      {
        id: 'revenue',
        header: 'Receita Total',
        cell: (row) => formatMoney(row.totalRevenue),
      },
      {
        id: 'cost',
        header: 'Custos Totais',
        cell: (row) => formatMoney(row.totalCost),
      },
      {
        id: 'profit',
        header: 'Lucro',
        cell: (row) => (
          <span className={resultClass(row.totalProfit)}>
            {formatMoney(row.totalProfit)}
          </span>
        ),
      },
      {
        id: 'margin',
        header: 'Margem',
        cell: (row) =>
          row.marginPercent === null ? '—' : formatPercent(row.marginPercent),
      },
      {
        id: 'costPerKm',
        header: 'Custo/KM',
        cell: (row) => formatRatio(row.costPerKm, '/km'),
      },
      {
        id: 'revenuePerKm',
        header: 'Receita/KM',
        cell: (row) => formatRatio(row.revenuePerKm, '/km'),
      },
    ],
    [comparisons],
  );

  const detailColumns = React.useMemo<
    AnalyticalExpandableColumn<OperationalDreTripMetrics>[]
  >(
    () => [
      {
        id: 'date',
        header: 'Data',
        cell: (row) => formatDateBr(row.date),
      },
      {
        id: 'tripNumber',
        header: 'Viagem',
        cell: (row) => row.tripNumber,
      },
      {
        id: 'vehicle',
        header: 'Veículo',
        cell: (row) => row.vehicleLabel ?? '—',
      },
      {
        id: 'driver',
        header: 'Motorista',
        cell: (row) => row.driverLabel ?? '—',
      },
      {
        id: 'customer',
        header: 'Cliente',
        cell: (row) => row.customerLabel ?? '—',
      },
      {
        id: 'km',
        header: 'KM',
        cell: (row) =>
          row.distanceKm.toLocaleString('pt-BR', {maximumFractionDigits: 1}),
      },
      {
        id: 'revenue',
        header: 'Receita',
        cell: (row) => formatMoney(row.revenue),
      },
      {
        id: 'cost',
        header: 'Custos',
        cell: (row) => formatMoney(row.cost),
      },
      {
        id: 'profit',
        header: 'Lucro',
        cell: (row) => (
          <span className={resultClass(row.profit)}>{formatMoney(row.profit)}</span>
        ),
      },
      {
        id: 'margin',
        header: 'Margem',
        cell: (row) =>
          row.marginPercent === null ? '—' : formatPercent(row.marginPercent),
      },
      {
        id: 'actions',
        header: '',
        cell: (row) => (
          <Link
            href={ROUTES.viagemDetail(row.id)}
            className={cn(buttonVariants({variant: 'outline', size: 'sm'}))}
          >
            Ver detalhes
          </Link>
        ),
      },
    ],
    [],
  );

  const loadDetails = React.useCallback(
    async (group: OperationalDreRouteGroup) => {
      const result = await loadOperationalDreRouteTripsAction({
        dimensionKey: group.dimensionKey,
        filters,
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    [filters],
  );

  const renderDetailExpansion = React.useCallback(
    (trip: OperationalDreTripMetrics) => (
      <TripFinancialBreakdownLazy
        key={`${trip.id}|${filters.dateFrom ?? ''}|${filters.dateTo ?? ''}`}
        tripId={trip.id}
        tripLabel={trip.tripNumber}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
      />
    ),
    [filters.dateFrom, filters.dateTo],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            Custos por Rota
          </h3>
          <p className="text-xs text-muted-foreground">
            Análise detalhada por rota, viagem e lançamentos no período.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-80">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Data Inicial
            <input
              type="date"
              value={period.dateFrom}
              onChange={(e) =>
                setPeriod((prev) => ({...prev, dateFrom: e.target.value}))
              }
              className={VEHICLE_NATIVE_SELECT_CLASS}
              aria-label="Data Inicial"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Data Final
            <input
              type="date"
              value={period.dateTo}
              onChange={(e) =>
                setPeriod((prev) => ({...prev, dateTo: e.target.value}))
              }
              className={VEHICLE_NATIVE_SELECT_CLASS}
              aria-label="Data Final"
            />
          </label>
        </div>
      </div>

      <AnalyticalExpandableTable
        title=""
        groups={data.groups}
        getGroupKey={(group) => group.dimensionKey}
        groupColumns={groupColumns}
        detailColumns={detailColumns}
        getDetailKey={(trip) => trip.id}
        loadDetails={loadDetails}
        renderDetailExpansion={renderDetailExpansion}
        expansionStorageKey="dre-route-expanded"
        detailExpansionStorageKey="dre-trip-financial-expanded"
        dataRevision={filtersKey}
        emptyTitle="Sem custos por rota"
        emptyDescription="Viagens concluídas no período aparecerão agrupadas por rota."
        detailEmptyTitle="Nenhuma viagem nesta rota para o filtro atual."
        onActiveTrailChange={onActiveTrailChange}
      />
    </div>
  );
}

function ComparisonLine({
  label,
  text,
  favorable,
}: {
  label: string;
  text: string;
  favorable: boolean | null;
}) {
  return (
    <p>
      <span className="font-medium text-foreground/80">{label}: </span>
      <span
        className={
          favorable === true
            ? 'text-emerald-600'
            : favorable === false
              ? 'text-destructive'
              : undefined
        }
      >
        {text}
      </span>
    </p>
  );
}

export {OperationalDreRouteCosts};
