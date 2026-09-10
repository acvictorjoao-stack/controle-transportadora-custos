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
 *
 * ---
 * Audit #7 — competência de período (política única operacional):
 * - Receita: `trips.completed_at` (T já filtrado assim).
 * - Custo vinculado (`trip_id ∈ T`): segue a viagem — sem filtro `entry_date`.
 * - Custo órfão (`trip_id IS NULL`): `financial_entries.entry_date` no período.
 * O braço órfão do `.or(...)` incorpora `entry_date`; o braço `trip_id.in.(T)` não.
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
 * Predicados PostgREST de `entry_date` para o braço órfão (Audit #7).
 */
export function orphanExpenseEntryDateParts(
  filters: Pick<OperationalDreFilters, 'dateFrom' | 'dateTo'>,
): string[] {
  const parts: string[] = [];
  if (filters.dateFrom) parts.push(`entry_date.gte.${filters.dateFrom}`);
  if (filters.dateTo) parts.push(`entry_date.lte.${filters.dateTo}`);
  return parts;
}

function formatAndFilter(parts: string[]): string {
  return parts.length === 1 ? parts[0]! : `and(${parts.join(',')})`;
}

/**
 * Mesma semântica dimensional usada na query PostgREST e no calculator.
 * Competência de período para vinculados: ver `expenseMatchesCompetenceScope`.
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

/**
 * Audit #7 — competência: custo com `trip_id` só entra se a viagem ∈ T
 * (`completed_at`); órfãos passam pelo dimensional (e `entry_date` na query).
 */
export function expenseMatchesCompetenceScope(
  expense: OperationalDreExpenseScopeProbe,
  filters: OperationalDreFilters,
  tripIds: ReadonlySet<string>,
): boolean {
  if (expense.tripId) {
    return tripIds.has(expense.tripId);
  }
  return expenseMatchesDimensionalScope(expense, filters, tripIds);
}

export interface OperationalDreExpenseDimensionFilterResolution {
  shouldReturnEmpty: boolean;
  /**
   * Expressão PostgREST para `.or(...)`:
   * `trip_id.in.(T)` e/ou `and(trip_id.is.null,<preds>,<entry_date>)`.
   * Sem dimensões ativas, o OR ainda separa vinculados (T) de órfãos (entry_date).
   */
  orFilter: string | null;
}

/**
 * Traduz escopo dimensional + competência de período (Audit #7) para PostgREST.
 * Filtros externos (company_id, branch, centro, deleted_at) ficam AND na query base.
 * Não aplicar `entry_date` na base — só no braço órfão deste OR.
 */
export function resolveOperationalDreExpenseDimensionFilter(
  filters: OperationalDreFilters,
  tripIds: string[],
): OperationalDreExpenseDimensionFilterResolution {
  const dateParts = orphanExpenseEntryDateParts(filters);
  const orParts: string[] = [];

  if (tripIds.length > 0) {
    orParts.push(`trip_id.in.(${tripIds.join(',')})`);
  }

  if (!hasOperationalDreDimensionalFilters(filters)) {
    const orphanParts = ['trip_id.is.null', ...dateParts];
    orParts.push(formatAndFilter(orphanParts));
    return {shouldReturnEmpty: false, orFilter: orParts.join(',')};
  }

  // Braço direto: sem trip e AND de todos os predicados exigidos + entry_date.
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
    andParts.push(...dateParts);

    const hasDirectDimension =
      Boolean(filters.driverId) ||
      Boolean(filters.vehicleId) ||
      Boolean(filters.customerId);

    if (hasDirectDimension) {
      orParts.push(formatAndFilter(andParts));
    }
  }

  if (orParts.length === 0) {
    return {shouldReturnEmpty: true, orFilter: null};
  }

  return {shouldReturnEmpty: false, orFilter: orParts.join(',')};
}
