'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import type {FuelConsumptionDashboardFilters} from '../types';
import {buildFuelConsumptionDashboardUrl} from '../utils/consumption-dashboard-url';
import {FUEL_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface FuelDashboardFiltersProps {
  branches: BranchSelectOption[];
  vehicles: VehicleSelectOption[];
  initialFilters: FuelConsumptionDashboardFilters;
}

/**
 * Filters for the Fuel Consumption Dashboard. This component only ever
 * builds a `FuelConsumptionDashboardFilters` object and syncs it to the URL
 * — it never computes distances, liters, costs or rates.
 */
function FuelDashboardFilters({branches, vehicles, initialFilters}: FuelDashboardFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = buildFuelConsumptionDashboardUrl(filters);
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, router]);

  function updateVehicle(vehicleId: string) {
    setFilters((prev) => ({...prev, vehicleIds: vehicleId ? [vehicleId] : undefined}));
  }

  function updateBranch(branchId: string) {
    setFilters((prev) => ({...prev, branchId: branchId || undefined}));
  }

  function updateFromMonth(fromMonth: string) {
    setFilters((prev) => ({...prev, fromMonth: fromMonth || undefined}));
  }

  function updateToMonth(toMonth: string) {
    setFilters((prev) => ({...prev, toMonth: toMonth || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <select
        value={filters.vehicleIds?.[0] ?? ''}
        onChange={(e) => updateVehicle(e.target.value)}
        className={FUEL_NATIVE_SELECT_CLASS}
      >
        <option value="">Todos os veículos</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.plate}
          </option>
        ))}
      </select>
      <select
        value={filters.branchId ?? ''}
        onChange={(e) => updateBranch(e.target.value)}
        className={FUEL_NATIVE_SELECT_CLASS}
      >
        <option value="">Todas as filiais</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <input
        type="month"
        value={filters.fromMonth ?? ''}
        onChange={(e) => updateFromMonth(e.target.value)}
        className={FUEL_NATIVE_SELECT_CLASS}
        aria-label="Mês inicial"
      />
      <input
        type="month"
        value={filters.toMonth ?? ''}
        onChange={(e) => updateToMonth(e.target.value)}
        className={FUEL_NATIVE_SELECT_CLASS}
        aria-label="Mês final"
      />
    </div>
  );
}

export {FuelDashboardFilters};
