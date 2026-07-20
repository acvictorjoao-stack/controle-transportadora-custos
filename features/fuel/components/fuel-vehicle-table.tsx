'use client';

import Link from 'next/link';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {ROUTES} from '@/constants/routes/paths';

import type {FuelConsumptionVehicleRow} from '../types';
import {formatCurrencyBr, formatKmPerLiter, formatLiters} from '../utils/fuel-format';

export interface FuelVehicleTableProps {
  rows: FuelConsumptionVehicleRow[];
}

function formatKm(value: number): string {
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})} km`;
}

function formatCostPerKm(value: number | null): string {
  if (value === null) return '—';
  return `${formatCurrencyBr(value)}/km`;
}

function compareByKmPerLiterAscending(
  a: FuelConsumptionVehicleRow,
  b: FuelConsumptionVehicleRow,
): number {
  if (a.averageKmPerLiter === null && b.averageKmPerLiter === null) return 0;
  if (a.averageKmPerLiter === null) return 1;
  if (b.averageKmPerLiter === null) return -1;
  return a.averageKmPerLiter - b.averageKmPerLiter;
}

/**
 * Vehicle summary table for the Fuel Consumption Dashboard. Sorting is the
 * only operation performed on `rows` here — every displayed value already
 * comes computed from `VehicleConsumptionSummary`.
 */
function FuelVehicleTable({rows}: FuelVehicleTableProps) {
  const sortedRows = React.useMemo(
    () => [...rows].sort(compareByKmPerLiterAscending),
    [rows],
  );

  const columns = [
    {
      id: 'vehicle',
      header: 'Veículo',
      cell: (row: FuelConsumptionVehicleRow) => (
        <Link
          href={ROUTES.veiculoDetail(row.vehicleId)}
          className="text-sm font-medium hover:underline"
        >
          {row.plate}
        </Link>
      ),
    },
    {
      id: 'distance',
      header: 'Distância',
      cell: (row: FuelConsumptionVehicleRow) => formatKm(row.totalDistanceKm),
    },
    {
      id: 'liters',
      header: 'Litros',
      cell: (row: FuelConsumptionVehicleRow) => formatLiters(row.totalLiters),
    },
    {
      id: 'kmPerLiter',
      header: 'km/L',
      cell: (row: FuelConsumptionVehicleRow) => formatKmPerLiter(row.averageKmPerLiter),
    },
    {
      id: 'costPerKm',
      header: 'R$/km',
      cell: (row: FuelConsumptionVehicleRow) => formatCostPerKm(row.averageCostPerKm),
    },
    {
      id: 'operationalDistance',
      header: 'Distância Operacional',
      cell: (row: FuelConsumptionVehicleRow) => formatKm(row.operationalDistanceKm),
    },
    {
      id: 'operationalLiters',
      header: 'Litros Operacionais',
      cell: (row: FuelConsumptionVehicleRow) => formatLiters(row.operationalLiters),
    },
    {
      id: 'operationalCost',
      header: 'Custo Operacional',
      cell: (row: FuelConsumptionVehicleRow) => formatCurrencyBr(row.operationalFuelCost),
    },
    {
      id: 'periods',
      header: 'Períodos',
      cell: (row: FuelConsumptionVehicleRow) => row.periodCount.toLocaleString('pt-BR'),
    },
  ];

  return (
    <TableContainer>
      <DataTable
        columns={columns}
        data={sortedRows}
        getRowKey={(row) => row.vehicleId}
        emptyTitle="Nenhum veículo com consumo processado"
        emptyDescription="Assim que houver períodos de consumo calculados, eles aparecerão aqui."
      />
    </TableContainer>
  );
}

export {FuelVehicleTable};
