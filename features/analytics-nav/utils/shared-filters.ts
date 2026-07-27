import {ROUTES} from '@/constants/routes/paths';
import {
  buildOperationalDreUrl,
  parseOperationalDreFilters,
  resolvePeriodPreset,
} from '@/features/dre/utils/list-url';
import type {OperationalDreFilters} from '@/features/dre/types';

import type {AnalyticsModuleId, SharedAnalyticsFilters} from '../types';
import {ANALYTICS_MODULE_PATHS} from '../types';

export {resolvePeriodPreset};

export function buildSharedAnalyticsUrl(
  filters: SharedAnalyticsFilters = {},
  basePath: string,
  options?: {periodo?: string},
): string {
  return buildOperationalDreUrl(filters, basePath, options);
}

export function parseSharedAnalyticsFilters(params: {
  empresa?: string;
  filial?: string;
  cliente?: string;
  rota?: string;
  veiculo?: string;
  motorista?: string;
  centro?: string;
  de?: string;
  ate?: string;
  periodo?: string;
}): SharedAnalyticsFilters {
  return parseOperationalDreFilters(params);
}

/** Mescla filtros preservando chaves definidas no override. */
export function mergeAnalyticsFilters(
  base: SharedAnalyticsFilters,
  override: SharedAnalyticsFilters,
): SharedAnalyticsFilters {
  return {
    branchId: override.branchId ?? base.branchId,
    customerId: override.customerId ?? base.customerId,
    routeId: override.routeId ?? base.routeId,
    vehicleId: override.vehicleId ?? base.vehicleId,
    driverId: override.driverId ?? base.driverId,
    costCenterId: override.costCenterId ?? base.costCenterId,
    dateFrom: override.dateFrom ?? base.dateFrom,
    dateTo: override.dateTo ?? base.dateTo,
  };
}

export function analyticsModulePath(moduleId: AnalyticsModuleId): string {
  if (moduleId === 'dashboard') return ROUTES.dashboard;
  return ANALYTICS_MODULE_PATHS[moduleId];
}

/** Link para outro módulo analítico preservando filtros compartilhados. */
export function buildCrossNavHref(
  moduleId: AnalyticsModuleId,
  filters: SharedAnalyticsFilters = {},
  override: SharedAnalyticsFilters = {},
): string {
  return buildSharedAnalyticsUrl(
    mergeAnalyticsFilters(filters, override),
    analyticsModulePath(moduleId),
  );
}

export function pickSharedAnalyticsFilters(
  filters: SharedAnalyticsFilters | OperationalDreFilters,
): SharedAnalyticsFilters {
  return {
    branchId: filters.branchId,
    customerId: filters.customerId,
    routeId: filters.routeId,
    vehicleId: filters.vehicleId,
    driverId: filters.driverId,
    costCenterId: filters.costCenterId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };
}
