'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {DriverSelectOption} from '@/features/drivers/types';

import {FUEL_TYPES} from '../constants/enums';
import type {FuelListFilters, FuelSortOptions, FuelType} from '../types';
import {FUEL_TYPE_LABELS} from '../types';
import {buildFuelListUrl} from '../utils/list-url';
import {FUEL_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface FuelFiltersProps {
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: {id: string; plate: string}[];
  initialFilters: FuelListFilters;
  initialSort: FuelSortOptions;
}

function FuelFilters({
  branches,
  drivers,
  vehicles,
  initialFilters,
  initialSort,
}: FuelFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  const [sort, setSort] = React.useState(initialSort);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search).get('q') ?? '';
      const next = buildFuelListUrl({search, filters, sort});
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, sort, router]);

  function updateFilter<K extends keyof FuelListFilters>(
    key: K,
    value: FuelListFilters[K],
  ) {
    setFilters((prev) => ({...prev, [key]: value || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <select
        value={filters.vehicleId ?? ''}
        onChange={(e) => updateFilter('vehicleId', e.target.value || undefined)}
        className={FUEL_NATIVE_SELECT_CLASS}
      >
        <option value="">Veículo</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.plate}
          </option>
        ))}
      </select>
      <select
        value={filters.driverId ?? ''}
        onChange={(e) => updateFilter('driverId', e.target.value || undefined)}
        className={FUEL_NATIVE_SELECT_CLASS}
      >
        <option value="">Motorista</option>
        {drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.name}
          </option>
        ))}
      </select>
      <select
        value={filters.branchId ?? ''}
        onChange={(e) => updateFilter('branchId', e.target.value || undefined)}
        className={FUEL_NATIVE_SELECT_CLASS}
      >
        <option value="">Filial</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <select
        value={filters.fuelType ?? ''}
        onChange={(e) =>
          updateFilter('fuelType', (e.target.value || undefined) as FuelType | undefined)
        }
        className={FUEL_NATIVE_SELECT_CLASS}
      >
        <option value="">Combustível</option>
        {FUEL_TYPES.map((type) => (
          <option key={type} value={type}>
            {FUEL_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Cidade"
        value={filters.city ?? ''}
        onChange={(e) => updateFilter('city', e.target.value || undefined)}
        className={FUEL_NATIVE_SELECT_CLASS}
      />
      <input
        type="text"
        placeholder="Posto"
        value={filters.stationName ?? ''}
        onChange={(e) => updateFilter('stationName', e.target.value || undefined)}
        className={FUEL_NATIVE_SELECT_CLASS}
      />
      <input
        type="date"
        value={filters.dateFrom ?? ''}
        onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
        className={FUEL_NATIVE_SELECT_CLASS}
      />
      <input
        type="date"
        value={filters.dateTo ?? ''}
        onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
        className={FUEL_NATIVE_SELECT_CLASS}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(filters.inconsistentOnly)}
          onChange={(e) => updateFilter('inconsistentOnly', e.target.checked || undefined)}
        />
        Apenas inconsistentes
      </label>
      <select
        value={sort.sortBy ?? 'fueled_at'}
        onChange={(e) =>
          setSort((prev) => ({
            ...prev,
            sortBy: e.target.value as FuelSortOptions['sortBy'],
          }))
        }
        className={FUEL_NATIVE_SELECT_CLASS}
      >
        <option value="fueled_at">Data</option>
        <option value="total_amount">Valor total</option>
        <option value="quantity_liters">Litros</option>
        <option value="km_per_liter">KM/L</option>
        <option value="created_at">Cadastro</option>
      </select>
      <select
        value={sort.sortOrder ?? 'desc'}
        onChange={(e) =>
          setSort((prev) => ({
            ...prev,
            sortOrder: e.target.value as 'asc' | 'desc',
          }))
        }
        className={FUEL_NATIVE_SELECT_CLASS}
      >
        <option value="desc">Decrescente</option>
        <option value="asc">Crescente</option>
      </select>
    </div>
  );
}

export {FuelFilters};
