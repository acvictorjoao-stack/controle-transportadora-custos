import {ROUTES} from '@/constants/routes/paths';

import type {FuelConsumptionDashboardFilters} from '../types';

export function buildFuelConsumptionDashboardUrl(
  filters: FuelConsumptionDashboardFilters = {},
): string {
  const params = new URLSearchParams();

  const vehicleId = filters.vehicleIds?.[0];
  if (vehicleId) params.set('vehicle', vehicleId);
  if (filters.branchId) params.set('branch', filters.branchId);
  if (filters.fromMonth) params.set('from', filters.fromMonth);
  if (filters.toMonth) params.set('to', filters.toMonth);

  const query = params.toString();
  return query ? `${ROUTES.abastecimentosDashboard}?${query}` : ROUTES.abastecimentosDashboard;
}
