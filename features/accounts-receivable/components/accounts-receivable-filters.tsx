'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import {financialInputClassName} from '@/features/financial/utils/form-styles';
import {ACCOUNTS_RECEIVABLE_STATUS_LABELS} from '@/features/financial/types/financial-entry';

import {ACCOUNTS_RECEIVABLE_STATUSES} from '../constants';
import type {
  AccountsReceivableCategory,
  AccountsReceivableListFilters,
  AccountsReceivableSortOptions,
  AccountsReceivableStatus,
} from '../types';
import {buildAccountsReceivableListUrl} from '../utils/list-url';

export interface AccountsReceivableFiltersProps {
  categories: AccountsReceivableCategory[];
  initialFilters: AccountsReceivableListFilters;
  initialSort: AccountsReceivableSortOptions;
}

function AccountsReceivableFilters({
  categories,
  initialFilters,
  initialSort,
}: AccountsReceivableFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  const [sort, setSort] = React.useState(initialSort);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search).get('q') ?? '';
      const next = buildAccountsReceivableListUrl({search, filters, sort});
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, sort, router]);

  function updateFilter<K extends keyof AccountsReceivableListFilters>(
    key: K,
    value: AccountsReceivableListFilters[K],
  ) {
    setFilters((prev) => ({...prev, [key]: value || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <select
        value={filters.entryStatus ?? ''}
        onChange={(e) =>
          updateFilter(
            'entryStatus',
            (e.target.value || undefined) as AccountsReceivableStatus | undefined,
          )
        }
        className={financialInputClassName}
      >
        <option value="">Status</option>
        {ACCOUNTS_RECEIVABLE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {ACCOUNTS_RECEIVABLE_STATUS_LABELS[status]}
          </option>
        ))}
      </select>

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

      <input
        type="text"
        placeholder="Cliente"
        value={filters.client ?? ''}
        onChange={(e) => updateFilter('client', e.target.value.toUpperCase() || undefined)}
        className={`${financialInputClassName} uppercase`}
      />

      <input
        type="date"
        title="Vencimento de"
        value={filters.dueDateFrom ?? ''}
        onChange={(e) => updateFilter('dueDateFrom', e.target.value || undefined)}
        className={financialInputClassName}
      />
      <input
        type="date"
        title="Vencimento até"
        value={filters.dueDateTo ?? ''}
        onChange={(e) => updateFilter('dueDateTo', e.target.value || undefined)}
        className={financialInputClassName}
      />

      <input
        type="date"
        title="Período de"
        value={filters.dateFrom ?? ''}
        onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
        className={financialInputClassName}
      />
      <input
        type="date"
        title="Período até"
        value={filters.dateTo ?? ''}
        onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
        className={financialInputClassName}
      />

      <select
        value={sort.sortBy ?? 'due_date'}
        onChange={(e) =>
          setSort((prev) => ({
            ...prev,
            sortBy: e.target.value as AccountsReceivableSortOptions['sortBy'],
          }))
        }
        className={financialInputClassName}
      >
        <option value="due_date">Vencimento</option>
        <option value="entry_date">Emissão</option>
        <option value="amount">Valor</option>
        <option value="entry_status">Status</option>
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
        className={financialInputClassName}
      >
        <option value="asc">Crescente</option>
        <option value="desc">Decrescente</option>
      </select>
    </div>
  );
}

export {AccountsReceivableFilters};
