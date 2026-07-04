'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import {Button} from '@/components/ui/button';
import type {BranchSelectOption} from '@/features/organization/branches/types';

import {CUSTOMER_SEGMENTS, CUSTOMER_STATUSES} from '../constants/enums';
import type {CustomerListFilters, CustomerSortOptions} from '../types';
import {CUSTOMER_SEGMENT_LABELS, CUSTOMER_STATUS_LABELS} from '../types';
import {buildCustomersListUrl} from '../utils/list-url';
import {CUSTOMER_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface CustomerFiltersProps {
  filters: CustomerListFilters;
  sort: CustomerSortOptions;
  search: string;
  branches: BranchSelectOption[];
}

function CustomerFilters({filters, sort, search, branches}: CustomerFiltersProps) {
  const router = useRouter();

  function updateFilter(key: keyof CustomerListFilters, value: string | boolean | undefined) {
    const next = {...filters, [key]: value || undefined};
    router.push(buildCustomersListUrl({search, page: 1, filters: next, sort}));
  }

  function updateSort(sortBy: CustomerSortOptions['sortBy']) {
    const nextOrder =
      sort.sortBy === sortBy && sort.sortOrder === 'asc' ? 'desc' : 'asc';
    router.push(buildCustomersListUrl({
      search,
      page: 1,
      filters,
      sort: {sortBy, sortOrder: nextOrder},
    }));
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Status</label>
        <select
          className={CUSTOMER_NATIVE_SELECT_CLASS}
          value={filters.customerStatus ?? ''}
          onChange={(e) => updateFilter('customerStatus', e.target.value)}
        >
          <option value="">Todos</option>
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CUSTOMER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Segmento</label>
        <select
          className={CUSTOMER_NATIVE_SELECT_CLASS}
          value={filters.segment ?? ''}
          onChange={(e) => updateFilter('segment', e.target.value)}
        >
          <option value="">Todos</option>
          {CUSTOMER_SEGMENTS.map((s) => (
            <option key={s} value={s}>
              {CUSTOMER_SEGMENT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Filial</label>
        <select
          className={CUSTOMER_NATIVE_SELECT_CLASS}
          value={filters.branchId ?? ''}
          onChange={(e) => updateFilter('branchId', e.target.value)}
        >
          <option value="">Todas</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Contrato ativo</label>
        <select
          className={CUSTOMER_NATIVE_SELECT_CLASS}
          value={filters.hasActiveContract ? '1' : ''}
          onChange={(e) => updateFilter('hasActiveContract', e.target.value === '1')}
        >
          <option value="">Todos</option>
          <option value="1">Com contrato ativo</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Ordenar</label>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={sort.sortBy === 'legal_name' ? 'default' : 'outline'}
            onClick={() => updateSort('legal_name')}
          >
            Nome
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sort.sortBy === 'created_at' ? 'default' : 'outline'}
            onClick={() => updateSort('created_at')}
          >
            Data
          </Button>
        </div>
      </div>
    </div>
  );
}

export {CustomerFilters};
