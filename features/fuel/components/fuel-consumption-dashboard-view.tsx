'use client';

import {Gauge} from 'lucide-react';

import {EmptyState} from '@/components/common/empty-state';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {Alert, AlertDescription} from '@/components/ui/alert';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import type {FuelConsumptionDashboardData, FuelConsumptionDashboardFilters} from '../types';
import {FuelDashboardCards} from './fuel-dashboard-cards';
import {FuelDashboardFilters} from './fuel-dashboard-filters';
import {FuelMonthlyChart} from './fuel-monthly-chart';
import {FuelVehicleTable} from './fuel-vehicle-table';

export interface FuelConsumptionDashboardViewProps {
  data: FuelConsumptionDashboardData;
  branches: BranchSelectOption[];
  vehicles: VehicleSelectOption[];
  initialFilters: FuelConsumptionDashboardFilters;
  error: string | null;
}

/**
 * Fuel Consumption Dashboard (RC 26.6.6). This view only renders the
 * `FuelConsumptionDashboardData` produced by the loader — it never queries,
 * never touches the Consumption Engine, and never recalculates any total,
 * average or rate.
 */
function FuelConsumptionDashboardView({
  data,
  branches,
  vehicles,
  initialFilters,
  error,
}: FuelConsumptionDashboardViewProps) {
  const hasProcessedPeriods = data.fleet.periodCount > 0;

  return (
    <PageTemplate
      title="Dashboard de Consumo de Combustível"
      description="Indicadores de consumo, custo e distância consolidados pelo Consumption Summary"
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-6">
        <Section title="Filtros">
          <FuelDashboardFilters
            branches={branches}
            vehicles={vehicles}
            initialFilters={initialFilters}
          />
        </Section>

        {hasProcessedPeriods ? (
          <>
            <Section title="Indicadores da frota">
              <FuelDashboardCards fleet={data.fleet} />
            </Section>

            <Section title="Consumo mensal">
              <FuelMonthlyChart data={data.monthly} />
            </Section>

            <Section title="Resumo por veículo">
              <FuelVehicleTable rows={data.vehicles} />
            </Section>
          </>
        ) : (
          <EmptyState
            icon={<Gauge className="size-6" />}
            title="Nenhum período de consumo processado"
            description="Assim que houver abastecimentos suficientes para calcular períodos de consumo, os indicadores aparecerão aqui."
          />
        )}
      </div>
    </PageTemplate>
  );
}

export {FuelConsumptionDashboardView};
