'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import {financialInputClassName} from '@/features/financial/utils/form-styles';

import {
  CASH_FLOW_STATUS_LABELS,
  CASH_FLOW_STATUSES,
  CASH_FLOW_TYPE_LABELS,
  CASH_FLOW_TYPES,
} from '../constants';
import type {CashFlowListFilters, CashFlowStatus, CashFlowType} from '../types';
import {buildCashFlowListUrl} from '../utils/list-url';

export interface CashFlowFiltersProps {
  initialFilters: CashFlowListFilters;
}

function CashFlowFilters({initialFilters}: CashFlowFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search).get('q') ?? '';
      const next = buildCashFlowListUrl({search, filters});
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, router]);

  function updateFilter<K extends keyof CashFlowListFilters>(
    key: K,
    value: CashFlowListFilters[K],
  ) {
    setFilters((prev) => ({...prev, [key]: value || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        value={filters.cashFlowType ?? ''}
        onChange={(e) =>
          updateFilter(
            'cashFlowType',
            (e.target.value || undefined) as CashFlowType | undefined,
          )
        }
        className={financialInputClassName}
      >
        <option value="">Tipo</option>
        {CASH_FLOW_TYPES.map((type) => (
          <option key={type} value={type}>
            {CASH_FLOW_TYPE_LABELS[type]}
          </option>
        ))}
      </select>

      <select
        value={filters.entryStatus ?? ''}
        onChange={(e) =>
          updateFilter(
            'entryStatus',
            (e.target.value || undefined) as CashFlowStatus | undefined,
          )
        }
        className={financialInputClassName}
      >
        <option value="">Status</option>
        {CASH_FLOW_STATUSES.map((status) => (
          <option key={status} value={status}>
            {CASH_FLOW_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </div>
  );
}

export {CashFlowFilters};
