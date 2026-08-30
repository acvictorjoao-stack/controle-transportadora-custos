'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import type {CostCenterSelectOption} from '@/features/cost-centers/types';
import {financialInputClassName} from '@/features/financial/utils/form-styles';
import {scheduleQueryUrlSync} from '@/lib/navigation/sync-query-url';

import {PAYROLL_EXPENSE_STATUSES, PAYROLL_EXPENSE_TYPES} from '../constants';
import type {
  PayrollExpenseStatus,
  PayrollExpenseType,
  PayrollListFilters,
  PayrollPersonOption,
  PayrollSortOptions,
  Position,
} from '../types';
import {
  PAYROLL_EXPENSE_STATUS_LABELS,
  PAYROLL_EXPENSE_TYPE_LABELS,
  PAYROLL_PERSON_KIND_LABELS,
} from '../types';
import {competenceToMonthInput} from '../utils/competence';
import {buildPayrollListUrl} from '../utils/list-url';

export interface PayrollFiltersProps {
  people: PayrollPersonOption[];
  positions: Position[];
  costCenters: CostCenterSelectOption[];
  initialFilters: PayrollListFilters;
  initialSort: PayrollSortOptions;
}

function PayrollFilters({
  people,
  positions,
  costCenters,
  initialFilters,
  initialSort,
}: PayrollFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  const [sort, setSort] = React.useState(initialSort);

  React.useEffect(() => {
    return scheduleQueryUrlSync(router, () => {
      const search = new URLSearchParams(window.location.search).get('q') ?? '';
      return buildPayrollListUrl({search, filters, sort});
    });
  }, [filters, sort, router]);

  function updateFilter<K extends keyof PayrollListFilters>(
    key: K,
    value: PayrollListFilters[K],
  ) {
    setFilters((prev) => ({...prev, [key]: value || undefined}));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <input
        type="month"
        title="Competência"
        value={competenceToMonthInput(filters.competence)}
        onChange={(e) => updateFilter('competence', e.target.value || undefined)}
        className={financialInputClassName}
      />

      <select
        value={filters.personId ?? ''}
        onChange={(e) => updateFilter('personId', e.target.value || undefined)}
        className={financialInputClassName}
      >
        <option value="">Funcionário</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name} · {PAYROLL_PERSON_KIND_LABELS[person.kind]}
          </option>
        ))}
      </select>

      <select
        value={filters.positionId ?? ''}
        onChange={(e) => updateFilter('positionId', e.target.value || undefined)}
        className={financialInputClassName}
      >
        <option value="">Cargo</option>
        {positions.map((position) => (
          <option key={position.id} value={position.id}>
            {position.name}
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
            {center.name}
          </option>
        ))}
      </select>

      <select
        value={filters.expenseType ?? ''}
        onChange={(e) =>
          updateFilter(
            'expenseType',
            (e.target.value || undefined) as PayrollExpenseType | undefined,
          )
        }
        className={financialInputClassName}
      >
        <option value="">Tipo de despesa</option>
        {PAYROLL_EXPENSE_TYPES.map((type) => (
          <option key={type} value={type}>
            {PAYROLL_EXPENSE_TYPE_LABELS[type]}
          </option>
        ))}
      </select>

      <select
        value={filters.expenseStatus ?? ''}
        onChange={(e) =>
          updateFilter(
            'expenseStatus',
            (e.target.value || undefined) as PayrollExpenseStatus | undefined,
          )
        }
        className={financialInputClassName}
      >
        <option value="">Status</option>
        {PAYROLL_EXPENSE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {PAYROLL_EXPENSE_STATUS_LABELS[status]}
          </option>
        ))}
      </select>

      <select
        value={sort.sortBy ?? 'competence'}
        onChange={(e) =>
          setSort((prev) => ({
            ...prev,
            sortBy: e.target.value as PayrollSortOptions['sortBy'],
          }))
        }
        className={financialInputClassName}
      >
        <option value="competence">Competência</option>
        <option value="due_date">Vencimento</option>
        <option value="amount">Valor</option>
        <option value="created_at">Cadastro</option>
      </select>

      <select
        value={sort.sortOrder ?? 'desc'}
        onChange={(e) =>
          setSort((prev) => ({...prev, sortOrder: e.target.value as 'asc' | 'desc'}))
        }
        className={financialInputClassName}
      >
        <option value="desc">Decrescente</option>
        <option value="asc">Crescente</option>
      </select>
    </div>
  );
}

export {PayrollFilters};
