'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import type {BranchSelectOption} from '@/features/organization/branches/types';

import {TIRE_POSITIONS, TIRE_STATUSES} from '../constants/enums';
import type {TireListFilters, TirePosition, TireSortOptions, TireStatus} from '../types';
import {TIRE_POSITION_LABELS, TIRE_STATUS_LABELS} from '../types';
import {TIRE_NATIVE_SELECT_CLASS} from '../utils/form-styles';
import {buildTiresListUrl} from '../utils/list-url';

export interface TireFiltersProps {
  branches: BranchSelectOption[];
  vehicles: {id: string; plate: string}[];
  initialFilters: TireListFilters;
  initialSort: TireSortOptions;
}

function TireFilters({branches, vehicles, initialFilters, initialSort}: TireFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  const [sort, setSort] = React.useState(initialSort);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search).get('q') ?? '';
      const next = buildTiresListUrl({search, filters, sort});
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, sort, router]);

  function updateFilter<K extends keyof TireListFilters>(key: K, value: TireListFilters[K]) {
    setFilters((prev) => ({...prev, [key]: value || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <select
        value={filters.vehicleId ?? ''}
        onChange={(e) => updateFilter('vehicleId', e.target.value || undefined)}
        className={TIRE_NATIVE_SELECT_CLASS}
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
        className={TIRE_NATIVE_SELECT_CLASS}
      >
        <option value="">Filial</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <select
        value={filters.tireStatus ?? ''}
        onChange={(e) =>
          updateFilter('tireStatus', (e.target.value || undefined) as TireStatus | undefined)
        }
        className={TIRE_NATIVE_SELECT_CLASS}
      >
        <option value="">Status</option>
        {TIRE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {TIRE_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Marca"
        value={filters.brand ?? ''}
        onChange={(e) => updateFilter('brand', e.target.value || undefined)}
        className={TIRE_NATIVE_SELECT_CLASS}
      />
      <input
        type="text"
        placeholder="Fornecedor"
        value={filters.supplier ?? ''}
        onChange={(e) => updateFilter('supplier', e.target.value || undefined)}
        className={TIRE_NATIVE_SELECT_CLASS}
      />
      <select
        value={filters.position ?? ''}
        onChange={(e) =>
          updateFilter('position', (e.target.value || undefined) as TirePosition | undefined)
        }
        className={TIRE_NATIVE_SELECT_CLASS}
      >
        <option value="">Posição</option>
        {TIRE_POSITIONS.map((position) => (
          <option key={position} value={position}>
            {TIRE_POSITION_LABELS[position]}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(filters.hasRecap)}
          onChange={(e) => updateFilter('hasRecap', e.target.checked || undefined)}
        />
        Recapados
      </label>
      <select
        value={sort.sortBy ?? 'created_at'}
        onChange={(e) =>
          setSort((prev) => ({
            ...prev,
            sortBy: e.target.value as TireSortOptions['sortBy'],
          }))
        }
        className={TIRE_NATIVE_SELECT_CLASS}
      >
        <option value="created_at">Data cadastro</option>
        <option value="asset_number">Patrimônio</option>
        <option value="brand">Marca</option>
        <option value="accumulated_km">KM acumulado</option>
        <option value="tire_status">Status</option>
        <option value="purchase_date">Data compra</option>
      </select>
      <select
        value={sort.sortOrder ?? 'desc'}
        onChange={(e) =>
          setSort((prev) => ({
            ...prev,
            sortOrder: e.target.value as 'asc' | 'desc',
          }))
        }
        className={TIRE_NATIVE_SELECT_CLASS}
      >
        <option value="desc">Decrescente</option>
        <option value="asc">Crescente</option>
      </select>
    </div>
  );
}

export {TireFilters};
