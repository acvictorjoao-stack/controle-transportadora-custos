'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import type {BranchSelectOption} from '@/features/organization/branches/types';

import {
  DRIVER_CONTRACT_TYPES,
  DRIVER_LICENSE_CATEGORIES,
} from '../constants/enums';
import type {
  DriverContractType,
  DriverLicenseCategory,
  DriverListFilters,
  DriverOperationalStatus,
  DriverSortOptions,
} from '../types';
import {
  DRIVER_CONTRACT_TYPE_LABELS,
  DRIVER_LICENSE_CATEGORY_LABELS,
  DRIVER_OPERATIONAL_STATUS_LABELS,
} from '../types';
import {buildDriversListUrl} from '../utils/list-url';
import {DRIVER_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface DriverFiltersProps {
  branches: BranchSelectOption[];
  initialFilters: DriverListFilters;
  initialSort: DriverSortOptions;
}

function DriverFilters({branches, initialFilters, initialSort}: DriverFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  const [sort, setSort] = React.useState(initialSort);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search).get('q') ?? '';
      const next = buildDriversListUrl({search, filters, sort});
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, sort, router]);

  function updateFilter<K extends keyof DriverListFilters>(
    key: K,
    value: DriverListFilters[K],
  ) {
    setFilters((prev) => ({...prev, [key]: value || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <select
        value={filters.operationalStatus ?? ''}
        onChange={(e) =>
          updateFilter(
            'operationalStatus',
            (e.target.value || undefined) as DriverOperationalStatus | undefined,
          )
        }
        className={DRIVER_NATIVE_SELECT_CLASS}
      >
        <option value="">Situação</option>
        {(Object.keys(DRIVER_OPERATIONAL_STATUS_LABELS) as DriverOperationalStatus[]).map(
          (status) => (
            <option key={status} value={status}>
              {DRIVER_OPERATIONAL_STATUS_LABELS[status]}
            </option>
          ),
        )}
      </select>
      <select
        value={filters.branchId ?? ''}
        onChange={(e) => updateFilter('branchId', e.target.value || undefined)}
        className={DRIVER_NATIVE_SELECT_CLASS}
      >
        <option value="">Filial</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <select
        value={filters.licenseCategory ?? ''}
        onChange={(e) =>
          updateFilter(
            'licenseCategory',
            (e.target.value || undefined) as DriverLicenseCategory | undefined,
          )
        }
        className={DRIVER_NATIVE_SELECT_CLASS}
      >
        <option value="">Categoria CNH</option>
        {DRIVER_LICENSE_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {DRIVER_LICENSE_CATEGORY_LABELS[category]}
          </option>
        ))}
      </select>
      <select
        value={filters.contractType ?? ''}
        onChange={(e) =>
          updateFilter(
            'contractType',
            (e.target.value || undefined) as DriverContractType | undefined,
          )
        }
        className={DRIVER_NATIVE_SELECT_CLASS}
      >
        <option value="">Contratação</option>
        {DRIVER_CONTRACT_TYPES.map((type) => (
          <option key={type} value={type}>
            {DRIVER_CONTRACT_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(filters.cnhExpiring)}
          onChange={(e) => updateFilter('cnhExpiring', e.target.checked || undefined)}
        />
        CNH vencendo
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(filters.cnhExpired)}
          onChange={(e) => updateFilter('cnhExpired', e.target.checked || undefined)}
        />
        CNH vencida
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(filters.earPending)}
          onChange={(e) => updateFilter('earPending', e.target.checked || undefined)}
        />
        EAR pendente
      </label>
      <div className="flex gap-2">
        <select
          value={sort.sortBy ?? 'name'}
          onChange={(e) =>
            setSort((prev) => ({
              ...prev,
              sortBy: e.target.value as DriverSortOptions['sortBy'],
            }))
          }
          className={DRIVER_NATIVE_SELECT_CLASS}
        >
          <option value="name">Nome</option>
          <option value="cpf">CPF</option>
          <option value="cnh_number">CNH</option>
          <option value="license_expires_at">Validade CNH</option>
          <option value="operational_status">Situação</option>
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
          className={DRIVER_NATIVE_SELECT_CLASS}
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
      </div>
    </div>
  );
}

export {DriverFilters};
