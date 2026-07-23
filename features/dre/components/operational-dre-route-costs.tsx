'use client';

import Link from 'next/link';
import * as React from 'react';

import {buttonVariants} from '@/components/ui/button';
import {ROUTES} from '@/constants/routes/paths';
import {loadOperationalDreRouteTripsAction} from '@/features/dre/actions';
import {
  formatCurrencyBr,
  formatDateBr,
  formatPercent,
} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

import type {
  OperationalDreByRouteData,
  OperationalDreFilters,
  OperationalDreRouteGroup,
  OperationalDreTripMetrics,
} from '../types';
import {
  AnalyticalExpandableTable,
  type AnalyticalExpandableColumn,
} from './analytical-expandable-table';

export interface OperationalDreRouteCostsProps {
  data: OperationalDreByRouteData;
  filters: OperationalDreFilters;
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
 * Seção "Custos por Rota" — usa a tabela expansível genérica com dimensão `route`.
 */
function OperationalDreRouteCosts({
  data,
  filters,
}: OperationalDreRouteCostsProps) {
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
        cell: (row) => (
          <span className="font-medium">{row.route.label}</span>
        ),
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
    [],
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

  return (
    <AnalyticalExpandableTable
      title="Custos por Rota"
      groups={data.groups}
      getGroupKey={(group) => group.dimensionKey}
      groupColumns={groupColumns}
      detailColumns={detailColumns}
      getDetailKey={(trip) => trip.id}
      loadDetails={loadDetails}
      expansionStorageKey="dre-route-expanded"
      dataRevision={filtersKey}
      emptyTitle="Sem custos por rota"
      emptyDescription="Viagens concluídas no período aparecerão agrupadas por rota."
      detailEmptyTitle="Nenhuma viagem nesta rota para o filtro atual."
    />
  );
}

export {OperationalDreRouteCosts};
