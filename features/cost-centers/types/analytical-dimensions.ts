/**
 * Analytical dimensions scaffolding (RC 26.8).
 *
 * Cost Center is one organizational dimension. The same financial entry also
 * carries entity FKs (vehicle, driver, customer, trip/route) that enable future
 * multidimensional reports without restructuring the ledger.
 *
 * Do NOT implement the full reports here — only the shared vocabulary.
 */

export const ANALYTICAL_DIMENSION_TYPES = [
  'cost_center',
  'customer',
  'route',
  'vehicle',
  'driver',
  'trip',
  'branch',
] as const;

export type AnalyticalDimensionType = (typeof ANALYTICAL_DIMENSION_TYPES)[number];

export interface AnalyticalDimensionRef {
  type: AnalyticalDimensionType;
  id: string;
  label?: string | null;
}

/**
 * Snapshot of dimensions available on a financial entry / expense row.
 * Future reports (custo por veículo, margem por cliente, etc.) consume this shape.
 */
export interface FinancialAnalyticalDimensions {
  costCenterId: string | null;
  costCenterCode: string | null;
  customerId: string | null;
  routeId: string | null;
  vehicleId: string | null;
  driverId: string | null;
  tripId: string | null;
  branchId: string | null;
}

export const ANALYTICAL_DIMENSION_LABELS: Record<AnalyticalDimensionType, string> = {
  cost_center: 'Centro de Custo',
  customer: 'Cliente',
  route: 'Rota',
  vehicle: 'Veículo',
  driver: 'Motorista',
  trip: 'Viagem',
  branch: 'Filial',
};
