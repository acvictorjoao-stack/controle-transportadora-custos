import {ArrowDown} from 'lucide-react';

import {StatCard} from '@/components/data-display/stat-card';

import type {FuelConsumptionFleetSummary, FuelExecutiveIndicators, FuelExecutiveVehicleHighlight} from '../types';
import {formatKmPerLiter} from '../utils/fuel-format';

export interface FuelComparisonProps {
  fleet: FuelConsumptionFleetSummary;
  executive: FuelExecutiveIndicators;
}

function highlightSubtitle(highlight: FuelExecutiveVehicleHighlight | null): string {
  return highlight ? `Veículo ${highlight.plate}` : 'Sem dados suficientes';
}

/**
 * "Comparativo" section for the Fuel Consumption Dashboard (RC 26.6.7):
 * best vehicle vs. fleet average vs. worst vehicle, by km/L. Every value is
 * rendered exactly as received from `FuelExecutiveIndicators` /
 * `FuelConsumptionFleetSummary`.
 */
function FuelComparison({fleet, executive}: FuelComparisonProps) {
  return (
    <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:gap-4">
      <StatCard
        className="flex-1"
        title="Melhor Veículo"
        value={formatKmPerLiter(executive.bestEfficiencyVehicle?.value ?? null)}
        subtitle={highlightSubtitle(executive.bestEfficiencyVehicle)}
      />
      <ArrowDown className="mx-auto size-5 shrink-0 text-muted-foreground md:-rotate-90" />
      <StatCard
        className="flex-1"
        title="Média da Frota"
        value={formatKmPerLiter(fleet.averageKmPerLiter)}
        subtitle="Consolidado da frota"
      />
      <ArrowDown className="mx-auto size-5 shrink-0 text-muted-foreground md:-rotate-90" />
      <StatCard
        className="flex-1"
        title="Pior Veículo"
        value={formatKmPerLiter(executive.worstEfficiencyVehicle?.value ?? null)}
        subtitle={highlightSubtitle(executive.worstEfficiencyVehicle)}
      />
    </div>
  );
}

export {FuelComparison};
