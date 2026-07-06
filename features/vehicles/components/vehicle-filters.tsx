'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import type {BranchSelectOption} from '@/features/organization/branches/types';

import type {VehicleAssetStatus, VehicleListFilters, VehicleSortOptions} from '../types';
import {VEHICLE_ASSET_STATUS_LABELS, VEHICLE_TYPE_OPTIONS} from '../types';
import {buildVehiclesListUrl} from '../utils/list-url';
import {VEHICLE_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface VehicleFiltersProps {
  branches: BranchSelectOption[];
  initialFilters: VehicleListFilters;
  initialSort: VehicleSortOptions;
}

function VehicleFilters({branches, initialFilters, initialSort}: VehicleFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  const [sort, setSort] = React.useState(initialSort);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search).get('q') ?? '';
      const next = buildVehiclesListUrl({search, filters, sort});
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, sort, router]);

  function updateFilter<K extends keyof VehicleListFilters>(
    key: K,
    value: VehicleListFilters[K],
  ) {
    setFilters((prev) => ({...prev, [key]: value || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <input
        placeholder="Placa"
        value={filters.plate ?? ''}
        onChange={(e) => updateFilter('plate', e.target.value)}
        className={VEHICLE_NATIVE_SELECT_CLASS}
      />
      <select
        value={filters.assetStatus ?? ''}
        onChange={(e) =>
          updateFilter('assetStatus', (e.target.value || undefined) as VehicleAssetStatus | undefined)
        }
        className={VEHICLE_NATIVE_SELECT_CLASS}
      >
        <option value="">Situação</option>
        {(Object.keys(VEHICLE_ASSET_STATUS_LABELS) as VehicleAssetStatus[]).map((status) => (
          <option key={status} value={status}>
            {VEHICLE_ASSET_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <select
        value={filters.branchId ?? ''}
        onChange={(e) => updateFilter('branchId', e.target.value || undefined)}
        className={VEHICLE_NATIVE_SELECT_CLASS}
      >
        <option value="">Filial</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <select
        value={filters.vehicleType ?? ''}
        onChange={(e) => updateFilter('vehicleType', e.target.value || undefined)}
        className={VEHICLE_NATIVE_SELECT_CLASS}
      >
        <option value="">Tipo</option>
        {VEHICLE_TYPE_OPTIONS.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <input
        placeholder="Marca"
        value={filters.brand ?? ''}
        onChange={(e) => updateFilter('brand', e.target.value)}
        className={VEHICLE_NATIVE_SELECT_CLASS}
      />
      <div className="flex gap-2">
        <select
          value={sort.sortBy ?? 'plate'}
          onChange={(e) =>
            setSort((prev) => ({
              ...prev,
              sortBy: e.target.value as VehicleSortOptions['sortBy'],
            }))
          }
          className={VEHICLE_NATIVE_SELECT_CLASS}
        >
          <option value="plate">Placa</option>
          <option value="brand">Marca</option>
          <option value="asset_status">Situação</option>
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
          className={VEHICLE_NATIVE_SELECT_CLASS}
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
      </div>
    </div>
  );
}

export {VehicleFilters};
