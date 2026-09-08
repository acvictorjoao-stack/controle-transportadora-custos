import type {
  OperationalDreExpenseRow,
  OperationalDreFilters,
} from '../types';

/**
 * Escopo dimensional de expenses da DRE (regra única query + calculator).
 *
 * (trip_id ∈ T)
 * OR
 * (trip_id IS NULL AND todos os predicados diretos das dimensões ativas)
 *
 * Trips T já são AND-filtradas (driver/vehicle/customer/route/período/company).
 * Rota não existe no ledger → sem trip_id com routeId ativo = fora.
 * Payroll/global (sem vínculos) só entra quando F é vazio.
 */

export type OperationalDreExpenseScopeProbe = Pick<
  OperationalDreExpenseRow,
  'tripId' | 'vehicleId' | 'driverId' | 'customerId'
>;

export function hasOperationalDreDimensionalFilters(
  filters: OperationalDreFilters,
): boolean {
  return Boolean(
    filters.customerId ||
      filters.routeId ||
      filters.vehicleId ||
      filters.driverId,
  );
}

/**
 * Mesma semântica usada na query PostgREST e no calculator.
 */
export function expenseMatchesDimensionalScope(
  expense: OperationalDreExpenseScopeProbe,
  filters: OperationalDreFilters,
  tripIds: ReadonlySet<string>,
): boolean {
  if (!hasOperationalDreDimensionalFilters(filters)) {
    return true;
  }

  // Expense COM trip_id: o vínculo determinante é a trip ∈ T.
  // Atributos conflitantes na própria expense são ignorados.
  if (expense.tripId) {
    return tripIds.has(expense.tripId);
  }

  // Sem trip_id: rota é impossível de provar.
  if (filters.routeId) {
    return false;
  }

  if (filters.driverId && expense.driverId !== filters.driverId) {
    return false;
  }
  if (filters.vehicleId && expense.vehicleId !== filters.vehicleId) {
    return false;
  }
  if (filters.customerId && expense.customerId !== filters.customerId) {
    return false;
  }

  return true;
}

export interface OperationalDreExpenseDimensionFilterResolution {
  shouldReturnEmpty: boolean;
  /**
   * Expressão PostgREST para `.or(...)`:
   * `trip_id.in.(T)` e/ou `and(trip_id.is.null,<preds>)`.
   */
  orFilter: string | null;
}

/**
 * Traduz a regra única para filtro PostgREST.
 * Filtros externos (company_id, datas, branch, centro, deleted_at) ficam AND na query base.
 */
export function resolveOperationalDreExpenseDimensionFilter(
  filters: OperationalDreFilters,
  tripIds: string[],
): OperationalDreExpenseDimensionFilterResolution {
  if (!hasOperationalDreDimensionalFilters(filters)) {
    return {shouldReturnEmpty: false, orFilter: null};
  }

  const orParts: string[] = [];

  if (tripIds.length > 0) {
    orParts.push(`trip_id.in.(${tripIds.join(',')})`);
  }

  // Braço direto: sem trip e AND de todos os predicados exigidos.
  // Com routeId ativo este braço não existe.
  if (!filters.routeId) {
    const andParts: string[] = ['trip_id.is.null'];
    if (filters.driverId) {
      andParts.push(`driver_id.eq.${filters.driverId}`);
    }
    if (filters.vehicleId) {
      andParts.push(`vehicle_id.eq.${filters.vehicleId}`);
    }
    if (filters.customerId) {
      andParts.push(`customer_id.eq.${filters.customerId}`);
    }

    const hasDirectDimension =
      Boolean(filters.driverId) ||
      Boolean(filters.vehicleId) ||
      Boolean(filters.customerId);

    if (hasDirectDimension) {
      orParts.push(
        andParts.length === 1 ? andParts[0]! : `and(${andParts.join(',')})`,
      );
    }
  }

  if (orParts.length === 0) {
    return {shouldReturnEmpty: true, orFilter: null};
  }

  return {shouldReturnEmpty: false, orFilter: orParts.join(',')};
}
