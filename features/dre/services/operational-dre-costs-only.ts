import type {OperationalDreFilters} from '../types';

/**
 * Audit #6 — centro de custo é alocação organizacional no ledger de despesas.
 * Viagens/frete não têm `cost_center_id`; P&L comparável (receita/lucro/margem)
 * não deve ser atribuído quando `?centro=` está ativo.
 */
export function isOperationalDreCostsOnlyMode(
  filters: OperationalDreFilters = {},
): boolean {
  return Boolean(filters.costCenterId);
}

/** Copy estável para banner nas telas que reutilizam `OperationalDreFilters`. */
export const OPERATIONAL_DRE_COSTS_ONLY_BANNER =
  'Centro de custo filtra apenas custos (alocação organizacional); receita de frete não possui centro.';
