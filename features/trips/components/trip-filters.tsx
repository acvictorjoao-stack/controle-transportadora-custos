'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {DriverSelectOption} from '@/features/drivers/types';
import type {RouteFilterOptions, RouteSelectOption} from '@/features/routes/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import {SIMPLE_TRIP_STATUSES} from '../constants/enums';
import type {TripListFilters, TripSortOptions, TripStatus} from '../types';
import {TRIP_STATUS_LABELS} from '../types';
import {buildTripsListUrl} from '../utils/list-url';
import {TRIP_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface TripFiltersProps {
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  routes: RouteSelectOption[];
  routeFilterOptions: RouteFilterOptions;
  initialFilters: TripListFilters;
  initialSort: TripSortOptions;
}

function TripFilters({
  branches,
  drivers,
  vehicles,
  routes,
  routeFilterOptions,
  initialFilters,
  initialSort,
}: TripFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  const [sort, setSort] = React.useState(initialSort);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search).get('q') ?? '';
      const next = buildTripsListUrl({search, filters, sort});
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, sort, router]);

  function updateFilter<K extends keyof TripListFilters>(
    key: K,
    value: TripListFilters[K],
  ) {
    setFilters((prev) => ({...prev, [key]: value || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <select
        value={filters.tripStatus ?? ''}
        onChange={(e) =>
          updateFilter('tripStatus', (e.target.value || undefined) as TripStatus | undefined)
        }
        className={TRIP_NATIVE_SELECT_CLASS}
      >
        <option value="">Status</option>
        {SIMPLE_TRIP_STATUSES.map((status) => (
          <option key={status} value={status}>
            {TRIP_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <select
        value={filters.routeId ?? ''}
        onChange={(e) => updateFilter('routeId', e.target.value || undefined)}
        className={TRIP_NATIVE_SELECT_CLASS}
      >
        <option value="">Rota</option>
        {routes.map((route) => (
          <option key={route.id} value={route.id}>
            {route.code ? `${route.code} — ${route.name}` : route.name}
          </option>
        ))}
      </select>
      <select
        value={filters.origin ?? ''}
        onChange={(e) => updateFilter('origin', e.target.value || undefined)}
        className={TRIP_NATIVE_SELECT_CLASS}
      >
        <option value="">Origem</option>
        {routeFilterOptions.origins.map((origin) => (
          <option key={origin} value={origin}>
            {origin}
          </option>
        ))}
      </select>
      <select
        value={filters.destination ?? ''}
        onChange={(e) => updateFilter('destination', e.target.value || undefined)}
        className={TRIP_NATIVE_SELECT_CLASS}
      >
        <option value="">Destino</option>
        {routeFilterOptions.destinations.map((destination) => (
          <option key={destination} value={destination}>
            {destination}
          </option>
        ))}
      </select>
      <select
        value={filters.driverId ?? ''}
        onChange={(e) => updateFilter('driverId', e.target.value || undefined)}
        className={TRIP_NATIVE_SELECT_CLASS}
      >
        <option value="">Motorista</option>
        {drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.name}
          </option>
        ))}
      </select>
      <select
        value={filters.vehicleId ?? ''}
        onChange={(e) => updateFilter('vehicleId', e.target.value || undefined)}
        className={TRIP_NATIVE_SELECT_CLASS}
      >
        <option value="">Veículo</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.plate}
          </option>
        ))}
      </select>
      <select
        value={filters.branchId ?? ''}
        onChange={(e) => updateFilter('branchId', e.target.value || undefined)}
        className={TRIP_NATIVE_SELECT_CLASS}
      >
        <option value="">Filial</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Cliente"
        value={filters.clientName ?? ''}
        onChange={(e) => updateFilter('clientName', e.target.value || undefined)}
        className={TRIP_NATIVE_SELECT_CLASS}
      />
      <input
        type="date"
        value={filters.dateFrom ?? ''}
        onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
        className={TRIP_NATIVE_SELECT_CLASS}
      />
      <input
        type="date"
        value={filters.dateTo ?? ''}
        onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
        className={TRIP_NATIVE_SELECT_CLASS}
      />
      <div className="flex gap-2 sm:col-span-2">
        <select
          value={sort.sortBy ?? 'departed_at'}
          onChange={(e) =>
            setSort((prev) => ({
              ...prev,
              sortBy: e.target.value as TripSortOptions['sortBy'],
            }))
          }
          className={TRIP_NATIVE_SELECT_CLASS}
        >
          <option value="departed_at">Saída</option>
          <option value="trip_number">Número</option>
          <option value="trip_status">Status</option>
          <option value="client_name">Cliente</option>
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
          className={TRIP_NATIVE_SELECT_CLASS}
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>
    </div>
  );
}

export {TripFilters};
