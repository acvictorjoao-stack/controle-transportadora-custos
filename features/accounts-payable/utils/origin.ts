import {ACCOUNTS_PAYABLE_SOURCE_MODULE, ACCOUNTS_PAYABLE_MANAGED_SOURCE_MODULES} from '../constants';
import {
  OPERATION_SOURCE_ICONS,
  OPERATION_SOURCE_LABELS,
  OPERATIONAL_EXPENSE_CATEGORY_SLUGS,
} from '@/features/financial/constants/operation-financial';
import {ROUTES} from '@/constants/routes/paths';
import type {FinancialEntry} from '@/features/financial/types';

export const ACCOUNTS_PAYABLE_BLOCKED_CATEGORY_SLUGS = OPERATIONAL_EXPENSE_CATEGORY_SLUGS;

export function isAccountsPayableManagedEntry(entry: Pick<FinancialEntry, 'sourceModule'>): boolean {
  return ACCOUNTS_PAYABLE_MANAGED_SOURCE_MODULES.includes(
    entry.sourceModule as (typeof ACCOUNTS_PAYABLE_MANAGED_SOURCE_MODULES)[number],
  );
}

export function isManualAccountsPayableEntry(entry: Pick<FinancialEntry, 'sourceModule' | 'isSystemGenerated'>): boolean {
  return entry.sourceModule === ACCOUNTS_PAYABLE_SOURCE_MODULE && !entry.isSystemGenerated;
}

/**
 * Detalhe da origem "despesa de viagem" (migration 111): quem pagou e como o
 * lançamento nasce. Lê só o que o gatilho gravou em metadata.
 */
export function describeTripExpenseOrigin(
  entry: Pick<FinancialEntry, 'sourceModule'> & {metadata?: Record<string, unknown> | null},
): string | null {
  if (entry.sourceModule !== 'trip_expense') return null;
  const paidBy = entry.metadata?.paid_by;
  const method = entry.metadata?.payment_method;
  const treatment = entry.metadata?.treatment;
  if (treatment === 'paid_by_advance') return 'Paga com adiantamento';
  if (method === 'supplier_credit') return 'Compra a prazo';
  if (treatment === 'payable' && paidBy === 'driver') return 'Reembolso ao motorista';
  if (treatment === 'payable' && paidBy === 'aggregate') return 'Reembolso ao agregado';
  if (treatment === 'paid') return 'Paga pela empresa';
  return null;
}

/** Cancelar ou excluir só pela despesa, na viagem (proteção da migration 111). */
export function canCancelAccountsPayableEntry(entry: Pick<FinancialEntry, 'sourceModule'>): boolean {
  return entry.sourceModule !== 'trip_expense';
}

export function formatAccountsPayableOrigin(
  entry: Pick<
    FinancialEntry,
    'sourceModule' | 'sourceId' | 'referenceNumber' | 'fuelRecordId'
  > &
    Partial<Pick<FinancialEntry, 'installmentNumber' | 'installmentTotal' | 'metadata'>>,
): string {
  const moduleKey = entry.sourceModule ?? ACCOUNTS_PAYABLE_SOURCE_MODULE;
  const tripExpenseDetail = describeTripExpenseOrigin(entry);
  if (tripExpenseDetail) {
    const icon = OPERATION_SOURCE_ICONS.trip_expense;
    const ref = entry.referenceNumber ? ` · Viagem ${entry.referenceNumber}` : '';
    return `${icon} Despesa de viagem · ${tripExpenseDetail}${ref}`;
  }
  const icon = OPERATION_SOURCE_ICONS[moduleKey] ?? '📄';
  const label = OPERATION_SOURCE_LABELS[moduleKey] ?? 'Manual';

  if (moduleKey === ACCOUNTS_PAYABLE_SOURCE_MODULE || moduleKey === 'manual') {
    return `${icon} ${label}`;
  }

  const ref =
    entry.referenceNumber ||
    (entry.sourceId ? entry.sourceId.slice(0, 8).toUpperCase() : null) ||
    (entry.fuelRecordId ? entry.fuelRecordId.slice(0, 8).toUpperCase() : null);

  const installment =
    entry.installmentTotal && entry.installmentTotal > 1 && entry.installmentNumber
      ? ` · Parcela ${entry.installmentNumber}/${entry.installmentTotal}`
      : '';

  return ref ? `${icon} ${label} #${ref}${installment}` : `${icon} ${label}${installment}`;
}

export function getAccountsPayableOriginHref(
  entry: Pick<
    FinancialEntry,
    'sourceModule' | 'sourceId' | 'fuelRecordId' | 'maintenanceRecordId' | 'tireId'
  > & {tripId?: string | null},
): string | null {
  if (entry.fuelRecordId) return ROUTES.abastecimentoDetail(entry.fuelRecordId);
  if (entry.maintenanceRecordId) return ROUTES.manutencaoDetail(entry.maintenanceRecordId);
  if (entry.tireId) return ROUTES.pneuDetail(entry.tireId);

  if (!entry.sourceId) return null;

  switch (entry.sourceModule) {
    case 'fuel':
      return ROUTES.abastecimentoDetail(entry.sourceId);
    case 'maintenance':
      return ROUTES.manutencaoDetail(entry.sourceId);
    case 'tires':
      return ROUTES.pneuDetail(entry.sourceId);
    case 'trip_expense':
      // A despesa vive na aba "Despesas" da viagem.
      return entry.tripId ? ROUTES.viagemDetail(entry.tripId) : null;
    case 'payroll':
      // A folha não tem página de detalhe: a origem é a listagem filtrável.
      return `${ROUTES.despesasDePessoal}?sourceId=${encodeURIComponent(entry.sourceId)}`;
    default:
      return null;
  }
}
