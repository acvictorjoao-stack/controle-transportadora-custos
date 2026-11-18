/**
 * Situação financeira de cada despesa da aba "Despesas" (Fase 1, Etapa 2.3).
 *
 * Só usa dados reais: o lançamento criado pelo gatilho da migration 111
 * (status, tratamento gravado em metadata) e os campos da própria despesa.
 * Nada é inferido como "pago" sem um lançamento que diga isso.
 */
import type {TripExpense} from '../types/trip';
import {resolveTripExpenseTreatment, type TripExpenseFinancialTreatment} from './trip-expense-payment';

/** Lançamento da despesa, como lido de financial_entries (origem trip_expense). */
export interface TripExpenseEntryRef {
  id: string;
  sourceId: string;
  entryType: string;
  entryStatus: string;
  paidAmount: number | null;
  treatment: string | null;
}

export type TripExpenseStatusKey =
  | 'paid'
  | 'pending'
  | 'overdue'
  | 'awaiting_reimbursement'
  | 'paid_by_advance'
  | 'no_company_cost'
  | 'not_integrated'
  | 'integration_pending'
  | 'cancelled_or_reversed'
  | 'legacy_advance'
  | 'restricted';

export type TripExpenseStatusTone = 'success' | 'warning' | 'info' | 'destructive' | 'secondary' | 'outline';

export interface TripExpenseStatus {
  key: TripExpenseStatusKey;
  label: string;
  tone: TripExpenseStatusTone;
  /** Explicação curta, para título/tooltip. */
  hint: string;
  /**
   * Pagamento já registrado pelo Financeiro (reembolso ou compra a prazo pagos):
   * valor, quem pagou e exclusão exigem estornar o pagamento antes (migration 111).
   */
  settledByFinance?: boolean;
}

export const SETTLED_EXPENSE_MESSAGE =
  'O pagamento desta despesa já foi registrado no Financeiro. Para alterar valor ou quem pagou, ou para excluir, o Financeiro precisa estornar o pagamento antes.';

const STATUS: Record<TripExpenseStatusKey, Omit<TripExpenseStatus, 'key'>> = {
  paid: {label: 'Pago', tone: 'success', hint: 'Lançamento pago no financeiro.'},
  pending: {label: 'Pendente', tone: 'warning', hint: 'Compra a prazo aguardando pagamento.'},
  overdue: {label: 'Vencido', tone: 'destructive', hint: 'Pagamento em atraso no financeiro.'},
  awaiting_reimbursement: {
    label: 'Aguardando reembolso',
    tone: 'warning',
    hint: 'O Financeiro ainda vai reembolsar quem pagou.',
  },
  paid_by_advance: {
    label: 'Pago com adiantamento',
    tone: 'info',
    hint: 'Custo da viagem, sem nova saída de caixa: o dinheiro saiu no adiantamento.',
  },
  no_company_cost: {
    label: 'Sem custo para a empresa',
    tone: 'secondary',
    hint: 'Paga por terceiro: não entra no financeiro.',
  },
  not_integrated: {
    label: 'Sem integração financeira',
    tone: 'warning',
    hint: 'Despesa sem "quem pagou": ainda fora do resultado e da DRE.',
  },
  integration_pending: {
    label: 'Integração pendente',
    tone: 'warning',
    hint: 'O lançamento financeiro ainda não foi encontrado.',
  },
  cancelled_or_reversed: {
    label: 'Cancelado ou estornado',
    tone: 'destructive',
    hint: 'O lançamento financeiro foi cancelado ou estornado.',
  },
  legacy_advance: {
    label: 'Adiantamento (antigo)',
    tone: 'secondary',
    hint: 'Adiantamento registrado como despesa: não é custo. Será convertido no acerto da viagem.',
  },
  restricted: {label: 'Restrito', tone: 'outline', hint: 'Sem acesso ao financeiro.'},
};

function status(key: TripExpenseStatusKey): TripExpenseStatus {
  return {key, ...STATUS[key]};
}

function isActive(entry: TripExpenseEntryRef): boolean {
  return entry.entryStatus !== 'cancelled' && entry.entryStatus !== 'reversed';
}

export function resolveTripExpenseStatus(input: {
  expense: Pick<TripExpense, 'id' | 'expenseType' | 'paidBy' | 'paymentMethod'>;
  /** Lançamentos de origem trip_expense desta despesa (qualquer status). */
  entries: TripExpenseEntryRef[];
  /** Falso quando a RLS esconde o financeiro de quem consulta. */
  financialVisible: boolean;
}): TripExpenseStatus {
  const {expense, financialVisible} = input;

  // Regras da própria despesa (não dependem do financeiro).
  if (expense.expenseType === 'advance') return status('legacy_advance');
  if (!expense.paidBy) return status('not_integrated');
  if (expense.paidBy === 'third_party') return status('no_company_cost');

  if (!financialVisible) return status('restricted');

  const entries = input.entries.filter(
    (entry) => entry.sourceId === expense.id && entry.entryType === 'expense',
  );
  const active = entries.find(isActive);
  if (!active) {
    return entries.length > 0 ? status('cancelled_or_reversed') : status('integration_pending');
  }

  const treatment = (active.treatment ??
    resolveTripExpenseTreatment(expense.paidBy, expense.paymentMethod)) as TripExpenseFinancialTreatment;

  if (treatment === 'paid_by_advance') return status('paid_by_advance');
  if (active.entryStatus === 'paid') {
    return treatment === 'payable' ? {...status('paid'), settledByFinance: true} : status('paid');
  }
  if (active.entryStatus === 'overdue') return status('overdue');
  if (treatment === 'payable' && expense.paymentMethod !== 'supplier_credit') {
    return status('awaiting_reimbursement');
  }
  return status('pending');
}

/** Texto da confirmação de exclusão, conforme o efeito no financeiro. */
export function describeTripExpenseDeletion(current: TripExpenseStatus): string {
  if (current.settledByFinance) return SETTLED_EXPENSE_MESSAGE;
  switch (current.key) {
    case 'paid':
    case 'paid_by_advance':
      return 'O lançamento financeiro desta despesa será estornado, com histórico. Esta ação não pode ser desfeita.';
    case 'pending':
    case 'overdue':
    case 'awaiting_reimbursement':
      return 'O lançamento financeiro pendente desta despesa será cancelado. Esta ação não pode ser desfeita.';
    default:
      return 'A despesa será excluída da viagem. Esta ação não pode ser desfeita.';
  }
}
