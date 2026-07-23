'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import {VEHICLE_NATIVE_SELECT_CLASS} from '@/features/vehicles/utils/form-styles';

import type {OperationalDreFilterOptions, OperationalDreFilters} from '../types';
import {buildOperationalDreUrl} from '../utils/list-url';

export interface OperationalDreFiltersProps {
  options: OperationalDreFilterOptions;
  initialFilters: OperationalDreFilters;
}

function OperationalDreFiltersBar({
  options,
  initialFilters,
}: OperationalDreFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = buildOperationalDreUrl(filters);
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== next) router.push(next);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters, router]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <select
        value={filters.branchId ?? ''}
        onChange={(e) =>
          setFilters((prev) => ({...prev, branchId: e.target.value || undefined}))
        }
        className={VEHICLE_NATIVE_SELECT_CLASS}
        aria-label="Empresa"
      >
        <option value="">Todas as empresas</option>
        {options.branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>

      <select
        value={filters.customerId ?? ''}
        onChange={(e) =>
          setFilters((prev) => ({
            ...prev,
            customerId: e.target.value || undefined,
          }))
        }
        className={VEHICLE_NATIVE_SELECT_CLASS}
        aria-label="Cliente"
      >
        <option value="">Todos os clientes</option>
        {options.customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
          </option>
        ))}
      </select>

      <select
        value={filters.routeId ?? ''}
        onChange={(e) =>
          setFilters((prev) => ({...prev, routeId: e.target.value || undefined}))
        }
        className={VEHICLE_NATIVE_SELECT_CLASS}
        aria-label="Rota"
      >
        <option value="">Todas as rotas</option>
        {options.routes.map((route) => (
          <option key={route.id} value={route.id}>
            {route.code ? `${route.code} — ${route.name}` : route.name}
          </option>
        ))}
      </select>

      <select
        value={filters.costCenterId ?? ''}
        onChange={(e) =>
          setFilters((prev) => ({
            ...prev,
            costCenterId: e.target.value || undefined,
          }))
        }
        className={VEHICLE_NATIVE_SELECT_CLASS}
        aria-label="Centro de Custo"
      >
        <option value="">Todos os centros</option>
        {options.costCenters.map((center) => (
          <option key={center.id} value={center.id}>
            {center.code} — {center.name}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2 xl:col-span-2">
        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              dateFrom: e.target.value || undefined,
            }))
          }
          className={VEHICLE_NATIVE_SELECT_CLASS}
          aria-label="Período inicial"
        />
        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              dateTo: e.target.value || undefined,
            }))
          }
          className={VEHICLE_NATIVE_SELECT_CLASS}
          aria-label="Período final"
        />
      </div>
    </div>
  );
}

export {OperationalDreFiltersBar};
