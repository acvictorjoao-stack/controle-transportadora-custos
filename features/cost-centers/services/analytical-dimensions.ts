import type {
  AnalyticalDimensionRef,
  FinancialAnalyticalDimensions,
} from '../types';

/**
 * Builds the analytical dimension bag from known FK fields.
 * Used to prepare future multidimensional reporting without changing the ledger.
 */
export function buildAnalyticalDimensions(
  input: Partial<FinancialAnalyticalDimensions>,
): FinancialAnalyticalDimensions {
  return {
    costCenterId: input.costCenterId ?? null,
    costCenterCode: input.costCenterCode ?? null,
    customerId: input.customerId ?? null,
    routeId: input.routeId ?? null,
    vehicleId: input.vehicleId ?? null,
    driverId: input.driverId ?? null,
    tripId: input.tripId ?? null,
    branchId: input.branchId ?? null,
  };
}

/** Flattens non-null dimensions into typed refs for future report engines. */
export function toAnalyticalDimensionRefs(
  dims: FinancialAnalyticalDimensions,
): AnalyticalDimensionRef[] {
  const refs: AnalyticalDimensionRef[] = [];

  if (dims.costCenterId) {
    refs.push({
      type: 'cost_center',
      id: dims.costCenterId,
      label: dims.costCenterCode,
    });
  }
  if (dims.customerId) refs.push({type: 'customer', id: dims.customerId});
  if (dims.routeId) refs.push({type: 'route', id: dims.routeId});
  if (dims.vehicleId) refs.push({type: 'vehicle', id: dims.vehicleId});
  if (dims.driverId) refs.push({type: 'driver', id: dims.driverId});
  if (dims.tripId) refs.push({type: 'trip', id: dims.tripId});
  if (dims.branchId) refs.push({type: 'branch', id: dims.branchId});

  return refs;
}
