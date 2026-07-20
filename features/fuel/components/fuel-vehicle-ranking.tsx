import Link from 'next/link';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {ROUTES} from '@/constants/routes/paths';

import type {FuelVehicleRankingRow} from '../types';
import {formatCurrencyBr, formatKmPerLiter, formatLiters, formatPercentage} from '../utils/fuel-format';

export interface FuelVehicleRankingProps {
  rows: FuelVehicleRankingRow[];
}

function formatKm(value: number): string {
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})} km`;
}

function formatCostPerKm(value: number | null): string {
  if (value === null) return '—';
  return `${formatCurrencyBr(value)}/km`;
}

/**
 * "Eficiência dos veículos" ranking table for the Fuel Consumption
 * Dashboard (RC 26.6.7). `rows` already arrive sorted by `averageKmPerLiter`
 * descending with their `position` assigned by the loader — this component
 * only renders them.
 */
function FuelVehicleRanking({rows}: FuelVehicleRankingProps) {
  const columns = [
    {
      id: 'position',
      header: '#',
      cell: (row: FuelVehicleRankingRow) => (
        <span className="font-financial text-sm font-medium">{row.position}</span>
      ),
    },
    {
      id: 'vehicle',
      header: 'Veículo',
      cell: (row: FuelVehicleRankingRow) => (
        <Link
          href={ROUTES.veiculoDetail(row.vehicleId)}
          className="text-sm font-medium hover:underline"
        >
          {row.plate}
        </Link>
      ),
    },
    {
      id: 'kmPerLiter',
      header: 'km/L',
      cell: (row: FuelVehicleRankingRow) => formatKmPerLiter(row.averageKmPerLiter),
    },
    {
      id: 'costPerKm',
      header: 'R$/km',
      cell: (row: FuelVehicleRankingRow) => formatCostPerKm(row.averageCostPerKm),
    },
    {
      id: 'distance',
      header: 'Distância',
      cell: (row: FuelVehicleRankingRow) => formatKm(row.totalDistanceKm),
    },
    {
      id: 'liters',
      header: 'Litros',
      cell: (row: FuelVehicleRankingRow) => formatLiters(row.totalLiters),
    },
    {
      id: 'cost',
      header: 'Custo',
      cell: (row: FuelVehicleRankingRow) => formatCurrencyBr(row.totalFuelCost),
    },
    {
      id: 'operationalPercentage',
      header: '% Operacional',
      cell: (row: FuelVehicleRankingRow) => formatPercentage(row.operationalPercentage),
    },
  ];

  return (
    <TableContainer>
      <DataTable
        columns={columns}
        data={rows}
        getRowKey={(row) => row.vehicleId}
        emptyTitle="Nenhum veículo com eficiência calculada"
        emptyDescription="Assim que houver km/L calculado para algum veículo, o ranking aparecerá aqui."
      />
    </TableContainer>
  );
}

export {FuelVehicleRanking};
