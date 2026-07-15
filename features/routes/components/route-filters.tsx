'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import {ROUTE_TYPES} from '../constants/enums';
import type {
  RouteFilterOptions,
  RouteListFilters,
  RouteOperationalStatus,
  RouteSortOptions,
  RouteType,
} from '../types';
import {
  ROUTE_OPERATIONAL_STATUS_LABELS,
  ROUTE_TYPE_LABELS,
} from '../types';
import {ROUTE_NATIVE_SELECT_CLASS} from '../utils/form-styles';
import {buildRoutesListUrl} from '../utils/list-url';

export interface RouteFiltersProps {
  filterOptions: RouteFilterOptions;
  initialFilters: RouteListFilters;
  initialSort: RouteSortOptions;
}

function RouteFilters({
  filterOptions,
  initialFilters,
  initialSort,
}: RouteFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  const [sort, setSort] = React.useState(initialSort);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search).get('q') ?? '';
      const next = buildRoutesListUrl({search, filters, sort});
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, sort, router]);

  function updateFilter<K extends keyof RouteListFilters>(
    key: K,
    value: RouteListFilters[K],
  ) {
    setFilters((prev) => ({...prev, [key]: value || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <select
        value={filters.operationalStatus ?? ''}
        onChange={(e) =>
          updateFilter(
            'operationalStatus',
            (e.target.value || undefined) as RouteOperationalStatus | undefined,
          )
        }
        className={ROUTE_NATIVE_SELECT_CLASS}
      >
        <option value="">Status</option>
        {(Object.keys(ROUTE_OPERATIONAL_STATUS_LABELS) as RouteOperationalStatus[]).map(
          (status) => (
            <option key={status} value={status}>
              {ROUTE_OPERATIONAL_STATUS_LABELS[status]}
            </option>
          ),
        )}
      </select>
      <select
        value={filters.routeType ?? ''}
        onChange={(e) =>
          updateFilter(
            'routeType',
            (e.target.value || undefined) as RouteType | undefined,
          )
        }
        className={ROUTE_NATIVE_SELECT_CLASS}
      >
        <option value="">Tipo</option>
        {ROUTE_TYPES.map((type) => (
          <option key={type} value={type}>
            {ROUTE_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <select
        value={filters.origin ?? ''}
        onChange={(e) => updateFilter('origin', e.target.value || undefined)}
        className={ROUTE_NATIVE_SELECT_CLASS}
      >
        <option value="">Origem</option>
        {filterOptions.origins.map((origin) => (
          <option key={origin} value={origin}>
            {origin}
          </option>
        ))}
      </select>
      <select
        value={filters.destination ?? ''}
        onChange={(e) => updateFilter('destination', e.target.value || undefined)}
        className={ROUTE_NATIVE_SELECT_CLASS}
      >
        <option value="">Destino</option>
        {filterOptions.destinations.map((destination) => (
          <option key={destination} value={destination}>
            {destination}
          </option>
        ))}
      </select>
      <div className="flex gap-2 sm:col-span-2">
        <select
          value={sort.sortBy ?? 'name'}
          onChange={(e) =>
            setSort((prev) => ({
              ...prev,
              sortBy: e.target.value as RouteSortOptions['sortBy'],
            }))
          }
          className={ROUTE_NATIVE_SELECT_CLASS}
        >
          <option value="name">Nome</option>
          <option value="origin">Origem</option>
          <option value="destination">Destino</option>
          <option value="route_type">Tipo</option>
          <option value="planned_distance_km">Distância</option>
          <option value="operational_status">Status</option>
          <option value="created_at">Cadastro</option>
        </select>
        <select
          value={sort.sortOrder ?? 'asc'}
          onChange={(e) =>
            setSort((prev) => ({
              ...prev,
              sortOrder: e.target.value as 'asc' | 'desc',
            }))
          }
          className={ROUTE_NATIVE_SELECT_CLASS}
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
      </div>
    </div>
  );
}

export {RouteFilters};
