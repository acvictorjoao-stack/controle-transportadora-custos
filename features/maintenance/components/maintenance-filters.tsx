'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import type {BranchSelectOption} from '@/features/organization/branches/types';

import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
} from '../constants/enums';
import type {
  MaintenanceListFilters,
  MaintenanceSortOptions,
  MaintenanceStatus,
  MaintenanceType,
} from '../types';
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from '../types';
import {MAINTENANCE_NATIVE_SELECT_CLASS} from '../utils/form-styles';
import {buildMaintenanceListUrl} from '../utils/list-url';

export interface MaintenanceFiltersProps {
  branches: BranchSelectOption[];
  vehicles: {id: string; plate: string}[];
  initialFilters: MaintenanceListFilters;
  initialSort: MaintenanceSortOptions;
}

function MaintenanceFilters({
  branches,
  vehicles,
  initialFilters,
  initialSort,
}: MaintenanceFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  const [sort, setSort] = React.useState(initialSort);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search).get('q') ?? '';
      const next = buildMaintenanceListUrl({search, filters, sort});
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, sort, router]);

  function updateFilter<K extends keyof MaintenanceListFilters>(
    key: K,
    value: MaintenanceListFilters[K],
  ) {
    setFilters((prev) => ({...prev, [key]: value || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <select
        value={filters.vehicleId ?? ''}
        onChange={(e) => updateFilter('vehicleId', e.target.value || undefined)}
        className={MAINTENANCE_NATIVE_SELECT_CLASS}
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
        className={MAINTENANCE_NATIVE_SELECT_CLASS}
      >
        <option value="">Filial</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <select
        value={filters.maintenanceType ?? ''}
        onChange={(e) =>
          updateFilter('maintenanceType', (e.target.value || undefined) as MaintenanceType | undefined)
        }
        className={MAINTENANCE_NATIVE_SELECT_CLASS}
      >
        <option value="">Tipo</option>
        {MAINTENANCE_TYPES.map((type) => (
          <option key={type} value={type}>
            {MAINTENANCE_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <select
        value={filters.maintenanceStatus ?? ''}
        onChange={(e) =>
          updateFilter('maintenanceStatus', (e.target.value || undefined) as MaintenanceStatus | undefined)
        }
        className={MAINTENANCE_NATIVE_SELECT_CLASS}
      >
        <option value="">Status</option>
        {MAINTENANCE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {MAINTENANCE_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Fornecedor"
        value={filters.supplier ?? ''}
        onChange={(e) => updateFilter('supplier', e.target.value || undefined)}
        className={MAINTENANCE_NATIVE_SELECT_CLASS}
      />
      <input
        type="date"
        value={filters.dateFrom ?? ''}
        onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
        className={MAINTENANCE_NATIVE_SELECT_CLASS}
      />
      <input
        type="date"
        value={filters.dateTo ?? ''}
        onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
        className={MAINTENANCE_NATIVE_SELECT_CLASS}
      />
      <select
        value={sort.sortBy ?? 'opened_at'}
        onChange={(e) =>
          setSort((prev) => ({
            ...prev,
            sortBy: e.target.value as MaintenanceSortOptions['sortBy'],
          }))
        }
        className={MAINTENANCE_NATIVE_SELECT_CLASS}
      >
        <option value="opened_at">Data abertura</option>
        <option value="total_cost">Custo total</option>
        <option value="maintenance_status">Status</option>
        <option value="maintenance_type">Tipo</option>
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
        className={MAINTENANCE_NATIVE_SELECT_CLASS}
      >
        <option value="desc">Decrescente</option>
        <option value="asc">Crescente</option>
      </select>
    </div>
  );
}

export {MaintenanceFilters};
