'use client';

import {ChevronDown, ListFilter} from 'lucide-react';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {Button} from '@/components/ui/button';
import {ROUTES} from '@/constants/routes/paths';
import {VEHICLE_NATIVE_SELECT_CLASS} from '@/features/vehicles/utils/form-styles';
import {cn} from '@/lib/utils';
import {scheduleQueryUrlSync} from '@/lib/navigation/sync-query-url';

import type {OperationalDreFilterOptions, OperationalDreFilters} from '../types';
import {
  NAMED_ANALYTICS_PERIOD_PRESETS,
  buildOperationalDreUrl,
  matchNamedPeriodPreset,
  resolveNamedPeriodRange,
} from '../utils/list-url';

export interface OperationalDreFiltersProps {
  options: OperationalDreFilterOptions;
  initialFilters: OperationalDreFilters;
  /** Base path for filter URL sync (default: DRE page). */
  basePath?: string;
  /** Presets nomeados (Dashboard Executivo). DRE/Rentabilidade permanecem só com de/ate. */
  showNamedPeriodPresets?: boolean;
  /**
   * `executive`: área visual única com pills de período e grade rotulada.
   * `default`: grade simples (DRE / Rentabilidade).
   */
  variant?: 'default' | 'executive';
}

function hasActiveDetailedFilters(filters: OperationalDreFilters): boolean {
  return Boolean(
    filters.branchId ||
      filters.customerId ||
      filters.routeId ||
      filters.vehicleId ||
      filters.driverId ||
      filters.costCenterId,
  );
}

function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function OperationalDreFiltersBar({
  options,
  initialFilters,
  basePath = ROUTES.dashboardDre,
  showNamedPeriodPresets = false,
  variant = 'default',
}: OperationalDreFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  const namedPreset = matchNamedPeriodPreset(filters);
  const isExecutive = variant === 'executive';
  const [detailsOpen, setDetailsOpen] = React.useState(
    () =>
      hasActiveDetailedFilters(initialFilters) ||
      matchNamedPeriodPreset(initialFilters) === 'personalizado',
  );

  React.useEffect(() => {
    return scheduleQueryUrlSync(router, () =>
      buildOperationalDreUrl(filters, basePath),
    );
  }, [basePath, filters, router]);

  const applyNamedPreset = (value: string) => {
    if (value === 'personalizado') {
      setDetailsOpen(true);
      return;
    }
    const range = resolveNamedPeriodRange(value);
    if (!range) return;
    setFilters((prev) => ({
      ...prev,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    }));
  };

  const periodSelect = showNamedPeriodPresets ? (
    isExecutive ? (
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Período
        </p>
        <div className="flex flex-wrap gap-2">
          {NAMED_ANALYTICS_PERIOD_PRESETS.map((preset) => {
            const active = namedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyNamedPreset(preset.id)}
                className={cn(
                  'inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition-colors',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                )}
                aria-pressed={active}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            className={cn(
              'inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition-colors',
              namedPreset === 'personalizado'
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-foreground hover:bg-muted',
            )}
            aria-pressed={namedPreset === 'personalizado'}
            onClick={() => applyNamedPreset('personalizado')}
          >
            Personalizado
          </button>
        </div>
      </div>
    ) : (
      <select
        value={namedPreset}
        onChange={(e) => applyNamedPreset(e.target.value)}
        className={VEHICLE_NATIVE_SELECT_CLASS}
        aria-label="Período"
      >
        {NAMED_ANALYTICS_PERIOD_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
        <option value="personalizado">Personalizado</option>
      </select>
    )
  ) : null;

  const branchSelect = (
    <select
      value={filters.branchId ?? ''}
      onChange={(e) =>
        setFilters((prev) => ({...prev, branchId: e.target.value || undefined}))
      }
      className={VEHICLE_NATIVE_SELECT_CLASS}
      aria-label="Filial"
    >
      <option value="">Todas as filiais</option>
      {options.branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </select>
  );

  const customerSelect = (
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
  );

  const routeSelect = (
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
  );

  const vehicleSelect = (
    <select
      value={filters.vehicleId ?? ''}
      onChange={(e) =>
        setFilters((prev) => ({
          ...prev,
          vehicleId: e.target.value || undefined,
        }))
      }
      className={VEHICLE_NATIVE_SELECT_CLASS}
      aria-label="Veículo"
    >
      <option value="">Todos os veículos</option>
      {(options.vehicles ?? []).map((vehicle) => (
        <option key={vehicle.id} value={vehicle.id}>
          {vehicle.label}
        </option>
      ))}
    </select>
  );

  const driverSelect = (
    <select
      value={filters.driverId ?? ''}
      onChange={(e) =>
        setFilters((prev) => ({
          ...prev,
          driverId: e.target.value || undefined,
        }))
      }
      className={VEHICLE_NATIVE_SELECT_CLASS}
      aria-label="Motorista"
    >
      <option value="">Todos os motoristas</option>
      {(options.drivers ?? []).map((driver) => (
        <option key={driver.id} value={driver.id}>
          {driver.name}
        </option>
      ))}
    </select>
  );

  const costCenterSelect = (
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
  );

  const dateFromInput = (
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
  );

  const dateToInput = (
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
  );

  if (isExecutive) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {periodSelect}
            <Button
              type="button"
              variant={detailsOpen ? 'secondary' : 'outline'}
              size="sm"
              className="shrink-0 self-start sm:mt-5"
              aria-expanded={detailsOpen}
              aria-controls="executive-detailed-filters"
              onClick={() => setDetailsOpen((open) => !open)}
            >
              <ListFilter className="size-4" aria-hidden />
              Filtros Detalhados
              <ChevronDown
                className={cn(
                  'size-4 transition-transform',
                  detailsOpen && 'rotate-180',
                )}
                aria-hidden
              />
            </Button>
          </div>

          {detailsOpen ? (
            <div
              id="executive-detailed-filters"
              className="mt-4 border-t border-border pt-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <FilterField label="Filial">{branchSelect}</FilterField>
                <FilterField label="Cliente">{customerSelect}</FilterField>
                <FilterField label="Rota">{routeSelect}</FilterField>
                <FilterField label="Veículo">{vehicleSelect}</FilterField>
                <FilterField label="Motorista">{driverSelect}</FilterField>
                <FilterField label="Centro de Custo">{costCenterSelect}</FilterField>
                <FilterField label="Período inicial">{dateFromInput}</FilterField>
                <FilterField label="Período final">{dateToInput}</FilterField>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {periodSelect}
      {branchSelect}
      {customerSelect}
      {routeSelect}
      {vehicleSelect}
      {driverSelect}
      {costCenterSelect}
      <div className="grid grid-cols-2 gap-2 sm:col-span-2">
        {dateFromInput}
        {dateToInput}
      </div>
    </div>
  );
}

export {OperationalDreFiltersBar};
