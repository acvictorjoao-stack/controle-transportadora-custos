/**
 * Rateio inteligente de custos operacionais por KM (RC 26.9.2).
 *
 * Regras:
 * 1. Vínculo direto (`tripId`) → valor integral na viagem.
 * 2. Sem `tripId`, com `vehicleId` → rateio proporcional ao KM rodado
 *    do veículo no conjunto de viagens informado.
 *
 * Sem I/O — reutilizável na DRE, breakdown, dashboards e relatórios.
 */

export interface MileageAllocationTrip {
  tripId: string;
  vehicleId: string | null;
  distanceKm: number;
}

export interface MileageAllocationExpense {
  id: string;
  amount: number;
  tripId: string | null;
  vehicleId: string | null;
}

export type OperationalCostAllocationMode = 'direct' | 'mileage';

export interface AllocatedOperationalCost {
  expenseId: string;
  tripId: string;
  /** Valor atribuído à viagem (integral ou rateado). */
  amount: number;
  originalAmount: number;
  /** Fração do valor original (1 para vínculo direto). */
  share: number;
  allocation: OperationalCostAllocationMode;
  vehicleId: string | null;
  vehicleTotalKm: number | null;
  tripKm: number | null;
}

export interface AllocateOperationalCostsByMileageResult {
  allocations: AllocatedOperationalCost[];
  totalsByTripId: Map<string, number>;
  getForTrip: (tripId: string) => AllocatedOperationalCost[];
}

function asFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function positiveKm(value: number): number {
  const km = asFinite(value);
  return km > 0 ? km : 0;
}

/**
 * Rateia despesas operacionais entre viagens.
 *
 * - Despesas com `tripId`: 100% na viagem (mesmo sem veículo/KM).
 * - Despesas sem `tripId` e com `vehicleId`: proporção `tripKm / vehicleTotalKm`
 *   entre as viagens do mesmo veículo presentes em `trips`.
 * - Demais despesas (sem viagem e sem veículo): ignoradas (não atribuíveis).
 *
 * Conservação: a soma dos valores rateados de uma despesa com KM > 0
 * equivale ao valor original (ruído de ponto flutuante à parte).
 */
export function allocateOperationalCostsByMileage(
  expenses: MileageAllocationExpense[],
  trips: MileageAllocationTrip[],
): AllocateOperationalCostsByMileageResult {
  const tripsByVehicle = new Map<string, MileageAllocationTrip[]>();
  const totalKmByVehicle = new Map<string, number>();

  for (const trip of trips) {
    if (!trip.vehicleId) continue;
    const km = positiveKm(trip.distanceKm);
    const list = tripsByVehicle.get(trip.vehicleId) ?? [];
    list.push(trip);
    tripsByVehicle.set(trip.vehicleId, list);
    totalKmByVehicle.set(
      trip.vehicleId,
      (totalKmByVehicle.get(trip.vehicleId) ?? 0) + km,
    );
  }

  const allocations: AllocatedOperationalCost[] = [];
  const totalsByTripId = new Map<string, number>();

  const addAllocation = (item: AllocatedOperationalCost) => {
    allocations.push(item);
    totalsByTripId.set(
      item.tripId,
      (totalsByTripId.get(item.tripId) ?? 0) + item.amount,
    );
  };

  for (const expense of expenses) {
    const amount = asFinite(expense.amount);
    if (amount === 0) continue;

    if (expense.tripId) {
      addAllocation({
        expenseId: expense.id,
        tripId: expense.tripId,
        amount,
        originalAmount: amount,
        share: 1,
        allocation: 'direct',
        vehicleId: expense.vehicleId,
        vehicleTotalKm: null,
        tripKm: null,
      });
      continue;
    }

    if (!expense.vehicleId) continue;

    const vehicleTrips = tripsByVehicle.get(expense.vehicleId) ?? [];
    const vehicleTotalKm = totalKmByVehicle.get(expense.vehicleId) ?? 0;
    if (vehicleTotalKm <= 0 || vehicleTrips.length === 0) continue;

    for (const trip of vehicleTrips) {
      const tripKm = positiveKm(trip.distanceKm);
      if (tripKm <= 0) continue;

      const share = tripKm / vehicleTotalKm;
      addAllocation({
        expenseId: expense.id,
        tripId: trip.tripId,
        amount: amount * share,
        originalAmount: amount,
        share,
        allocation: 'mileage',
        vehicleId: expense.vehicleId,
        vehicleTotalKm,
        tripKm,
      });
    }
  }

  return {
    allocations,
    totalsByTripId,
    getForTrip: (tripId: string) =>
      allocations.filter((item) => item.tripId === tripId),
  };
}
