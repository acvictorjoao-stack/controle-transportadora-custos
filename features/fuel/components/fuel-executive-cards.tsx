import {StatCard} from '@/components/data-display/stat-card';

import type {FuelExecutiveIndicators, FuelExecutiveVehicleHighlight, FuelConsumptionFleetSummary} from '../types';
import {formatCurrencyBr, formatKmPerLiter, formatPercentage} from '../utils/fuel-format';

export interface FuelExecutiveCardsProps {
  fleet: FuelConsumptionFleetSummary;
  executive: FuelExecutiveIndicators;
}

function formatCostPerKm(value: number | null): string {
  if (value === null) return '—';
  return `${formatCurrencyBr(value)}/km`;
}

function highlightSubtitle(highlight: FuelExecutiveVehicleHighlight | null): string {
  return highlight ? `Veículo ${highlight.plate}` : 'Sem dados suficientes';
}

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

/**
 * "Indicadores Executivos" cards for the Fuel Consumption Dashboard (RC
 * 26.6.7). Every value is rendered exactly as received from
 * `FuelExecutiveIndicators` / `FuelConsumptionFleetSummary` — no rate, sum
 * or ratio is computed here.
 */
function FuelExecutiveCards({fleet, executive}: FuelExecutiveCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        title="Melhor Rendimento"
        value={formatKmPerLiter(executive.bestEfficiencyVehicle?.value ?? null)}
        subtitle={highlightSubtitle(executive.bestEfficiencyVehicle)}
      />
      <StatCard
        title="Pior Rendimento"
        value={formatKmPerLiter(executive.worstEfficiencyVehicle?.value ?? null)}
        subtitle={highlightSubtitle(executive.worstEfficiencyVehicle)}
      />
      <StatCard
        title="Maior Custo Operacional"
        value={formatCostPerKm(executive.highestCostVehicle?.value ?? null)}
        subtitle={highlightSubtitle(executive.highestCostVehicle)}
      />
      <StatCard
        title="Menor Custo Operacional"
        value={formatCostPerKm(executive.lowestCostVehicle?.value ?? null)}
        subtitle={highlightSubtitle(executive.lowestCostVehicle)}
      />
      <StatCard
        title="Consumo Operacional"
        value={formatPercentage(executive.operationalConsumptionPercentage)}
        subtitle="% da distância total"
      />
      <StatCard
        title="Períodos Processados"
        value={formatCount(fleet.periodCount)}
        subtitle="Quantidade"
      />
    </div>
  );
}

export {FuelExecutiveCards};
