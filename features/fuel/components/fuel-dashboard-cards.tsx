import {StatCard} from '@/components/data-display/stat-card';

import type {FuelConsumptionFleetSummary} from '../types';
import {formatCurrencyBr, formatKmPerLiter, formatLiters} from '../utils/fuel-format';

export interface FuelDashboardCardsProps {
  fleet: FuelConsumptionFleetSummary;
}

function formatKm(value: number): string {
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})} km`;
}

function formatCostPerKm(value: number | null): string {
  if (value === null) return '—';
  return `${formatCurrencyBr(value)}/km`;
}

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

/**
 * Fleet KPI cards for the Fuel Consumption Dashboard. Every value is
 * rendered exactly as received from `FuelConsumptionFleetSummary` —
 * no distance, liter, cost or rate is computed here.
 */
function FuelDashboardCards({fleet}: FuelDashboardCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Consumo Médio" value={formatKmPerLiter(fleet.averageKmPerLiter)} subtitle="km/L" />
      <StatCard title="Custo Médio" value={formatCostPerKm(fleet.averageCostPerKm)} subtitle="R$/km" />
      <StatCard title="Distância Total" value={formatKm(fleet.totalDistanceKm)} subtitle="km" />
      <StatCard title="Litros Consumidos" value={formatLiters(fleet.totalLiters)} subtitle="L" />
      <StatCard title="Custo Total" value={formatCurrencyBr(fleet.totalFuelCost)} subtitle="R$" />
      <StatCard
        title="Distância Operacional"
        value={formatKm(fleet.operationalDistanceKm)}
        subtitle="km"
      />
      <StatCard
        title="Litros Operacionais"
        value={formatLiters(fleet.operationalLiters)}
        subtitle="L"
      />
      <StatCard
        title="Custo Operacional"
        value={formatCurrencyBr(fleet.operationalFuelCost)}
        subtitle="R$"
      />
      <StatCard
        title="Períodos Processados"
        value={formatCount(fleet.periodCount)}
        subtitle="Quantidade"
      />
    </div>
  );
}

export {FuelDashboardCards};
