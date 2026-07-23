'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {DriverSelectOption} from '@/features/drivers/types';
import type {TripSelectOption} from '@/features/trips/types';

import {FINANCIAL_ENTRY_STATUSES, FINANCIAL_ENTRY_TYPES} from '../constants/enums';
import type {
  FinancialCategory,
  FinancialCostCenter,
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialListFilters,
  FinancialSortOptions,
} from '../types';
import {
  FINANCIAL_ENTRY_STATUS_LABELS,
  FINANCIAL_ENTRY_TYPE_LABELS,
} from '../types/financial-entry';
import {buildFinancialListUrl} from '../utils/list-url';
import {financialInputClassName} from '../utils/form-styles';

export interface FinancialFiltersProps {
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: {id: string; plate: string}[];
  trips: TripSelectOption[];
  categories: FinancialCategory[];
  costCenters: FinancialCostCenter[];
  initialFilters: FinancialListFilters;
  initialSort: FinancialSortOptions;
}

function FinancialFilters({
  branches,
  drivers,
  vehicles,
  trips,
  categories,
  costCenters,
  initialFilters,
  initialSort,
}: FinancialFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  const [sort, setSort] = React.useState(initialSort);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search).get('q') ?? '';
      const next = buildFinancialListUrl({search, filters, sort});
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, sort, router]);

  function updateFilter<K extends keyof FinancialListFilters>(
    key: K,
    value: FinancialListFilters[K],
  ) {
    setFilters((prev) => ({...prev, [key]: value || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <input
        type="date"
        placeholder="De"
        value={filters.dateFrom ?? ''}
        onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
        className={financialInputClassName}
      />
      <input
        type="date"
        placeholder="Até"
        value={filters.dateTo ?? ''}
        onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
        className={financialInputClassName}
      />
      <select
        value={filters.categoryId ?? ''}
        onChange={(e) => updateFilter('categoryId', e.target.value || undefined)}
        className={financialInputClassName}
      >
        <option value="">Categoria</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select
        value={filters.entryType ?? ''}
        onChange={(e) =>
          updateFilter('entryType', (e.target.value || undefined) as FinancialEntryType | undefined)
        }
        className={financialInputClassName}
      >
        <option value="">Tipo</option>
        {FINANCIAL_ENTRY_TYPES.map((type) => (
          <option key={type} value={type}>
            {FINANCIAL_ENTRY_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <select
        value={filters.entryStatus ?? ''}
        onChange={(e) =>
          updateFilter(
            'entryStatus',
            (e.target.value || undefined) as FinancialEntryStatus | undefined,
          )
        }
        className={financialInputClassName}
      >
        <option value="">Status</option>
        {FINANCIAL_ENTRY_STATUSES.map((status) => (
          <option key={status} value={status}>
            {FINANCIAL_ENTRY_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <select
        value={filters.costCenterId ?? ''}
        onChange={(e) => updateFilter('costCenterId', e.target.value || undefined)}
        className={financialInputClassName}
      >
        <option value="">Centro de custo</option>
        {costCenters.map((center) => (
          <option key={center.id} value={center.id}>
            {center.code ? `${center.code} — ${center.name}` : center.name}
          </option>
        ))}
      </select>
      <select
        value={filters.branchId ?? ''}
        onChange={(e) => updateFilter('branchId', e.target.value || undefined)}
        className={financialInputClassName}
      >
        <option value="">Filial</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <select
        value={filters.vehicleId ?? ''}
        onChange={(e) => updateFilter('vehicleId', e.target.value || undefined)}
        className={financialInputClassName}
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
        className={financialInputClassName}
      >
        <option value="">Motorista</option>
        {drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.name}
          </option>
        ))}
      </select>
      <select
        value={filters.tripId ?? ''}
        onChange={(e) => updateFilter('tripId', e.target.value || undefined)}
        className={financialInputClassName}
      >
        <option value="">Viagem</option>
        {trips.map((trip) => (
          <option key={trip.id} value={trip.id}>
            {trip.tripNumber}
          </option>
        ))}
      </select>
      <select
        value={sort.sortBy ?? 'entry_date'}
        onChange={(e) =>
          setSort((prev) => ({
            ...prev,
            sortBy: e.target.value as FinancialSortOptions['sortBy'],
          }))
        }
        className={financialInputClassName}
      >
        <option value="entry_date">Data</option>
        <option value="amount">Valor</option>
        <option value="entry_type">Tipo</option>
        <option value="entry_status">Status</option>
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
        className={financialInputClassName}
      >
        <option value="desc">Decrescente</option>
        <option value="asc">Crescente</option>
      </select>
    </div>
  );
}

export {FinancialFilters};
