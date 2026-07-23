'use client';

import * as React from 'react';
import {useRouter} from 'next/navigation';

import {Input} from '@/components/ui/input';

import {SUPPLIER_CATEGORIES} from '../constants/enums';
import type {SupplierCategory, SupplierListFilters} from '../types';
import {SUPPLIER_CATEGORY_LABELS} from '../types';
import {buildSuppliersListUrl} from '../utils/list-url';
import {SUPPLIER_NATIVE_SELECT_CLASS} from '../utils/supplier-format';

export interface SupplierFiltersProps {
  search: string;
  filters: SupplierListFilters;
}

function SupplierFilters({search, filters}: SupplierFiltersProps) {
  const router = useRouter();
  const cityTimerRef = React.useRef<number | null>(null);

  function push(next: SupplierListFilters) {
    router.push(buildSuppliersListUrl({search, page: 1, filters: next}));
  }

  function handleCityChange(value: string) {
    if (cityTimerRef.current) {
      window.clearTimeout(cityTimerRef.current);
    }
    cityTimerRef.current = window.setTimeout(() => {
      const nextCity = value.trim().toUpperCase() || undefined;
      if ((nextCity ?? '') === (filters.city ?? '')) return;
      push({...filters, city: nextCity});
    }, 300);
  }

  React.useEffect(() => {
    return () => {
      if (cityTimerRef.current) window.clearTimeout(cityTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="sup-filter-cat">
          Categoria
        </label>
        <select
          id="sup-filter-cat"
          className={SUPPLIER_NATIVE_SELECT_CLASS}
          value={filters.category ?? ''}
          onChange={(e) =>
            push({
              ...filters,
              category: (e.target.value || undefined) as SupplierCategory | undefined,
            })
          }
        >
          <option value="">Todas</option>
          {SUPPLIER_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {SUPPLIER_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="sup-filter-city">
          Cidade
        </label>
        <Input
          key={filters.city ?? ''}
          id="sup-filter-city"
          className="h-9 w-40 uppercase"
          defaultValue={filters.city ?? ''}
          onChange={(e) => handleCityChange(e.target.value)}
          placeholder="Cidade"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="sup-filter-state">
          Estado
        </label>
        <Input
          id="sup-filter-state"
          className="h-9 w-16 uppercase"
          maxLength={2}
          value={filters.state ?? ''}
          onChange={(e) =>
            push({
              ...filters,
              state: e.target.value.toUpperCase().slice(0, 2) || undefined,
            })
          }
          placeholder="UF"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="sup-filter-active">
          Status
        </label>
        <select
          id="sup-filter-active"
          className={SUPPLIER_NATIVE_SELECT_CLASS}
          value={
            filters.active === true ? '1' : filters.active === false ? '0' : ''
          }
          onChange={(e) => {
            const v = e.target.value;
            push({
              ...filters,
              active: v === '' ? undefined : v === '1',
            });
          }}
        >
          <option value="">Todos</option>
          <option value="1">Ativo</option>
          <option value="0">Inativo</option>
        </select>
      </div>
    </div>
  );
}

export {SupplierFilters};
