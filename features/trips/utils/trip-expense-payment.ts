/**
 * Regras de "quem pagou" da despesa da viagem (Fase 1, Etapa 2 — decisões D8,
 * D10, D13 e D14). Espelham exatamente a migration 111: o lançamento financeiro
 * é criado e mantido pelo gatilho do banco, nunca pela aplicação. Estas funções
 * só validam a entrada e explicam o efeito para a tela e os testes.
 */
import type {
  TripExpensePaidBy,
  TripExpensePaymentMethod,
  TripExpenseType,
} from '../types/trip';

/** Instrumentos aceitos para cada "quem pagou" (restrição trip_expenses_payment_combination_check). */
export const TRIP_EXPENSE_METHODS_BY_PAID_BY: Record<
  TripExpensePaidBy,
  readonly TripExpensePaymentMethod[]
> = {
  company: ['bank_account', 'corporate_card', 'toll_tag', 'cash', 'not_informed', 'supplier_credit'],
  driver: ['own_money', 'driver_advance'],
  aggregate: ['own_money'],
  third_party: [],
};

/**
 * - paid: nasce pago na data da despesa (a saída foi a própria despesa);
 * - paid_by_advance: nasce pago, sem nova saída de caixa (consumo de adiantamento);
 * - payable: nasce pendente (reembolso ao motorista/agregado ou compra a prazo);
 *   o pagamento baixa ESTE lançamento, sem segundo custo;
 * - none: sem lançamento (terceiro ou "quem pagou" não informado).
 */
export type TripExpenseFinancialTreatment = 'paid' | 'paid_by_advance' | 'payable' | 'none';

/** Mesma regra de `public.trip_expense_financial_treatment` (migration 111). */
export function resolveTripExpenseTreatment(
  paidBy: TripExpensePaidBy | null | undefined,
  paymentMethod: TripExpensePaymentMethod | null | undefined,
): TripExpenseFinancialTreatment {
  if (paidBy === 'company' && paymentMethod === 'supplier_credit') return 'payable';
  if (paidBy === 'company') return 'paid';
  if (paidBy === 'driver' && paymentMethod === 'driver_advance') return 'paid_by_advance';
  if (paidBy === 'driver' || paidBy === 'aggregate') return 'payable';
  return 'none';
}

/**
 * A despesa vira custo da empresa (um lançamento em financial_entries)?
 * Igual ao gatilho: ativa, com "quem pagou", fora do tipo antigo "advance" e
 * sem ser paga por terceiro.
 */
export function tripExpenseGeneratesEntry(expense: {
  expenseType: TripExpenseType | string;
  paidBy: TripExpensePaidBy | null | undefined;
  paymentMethod: TripExpensePaymentMethod | null | undefined;
  deleted?: boolean;
}): boolean {
  if (expense.deleted) return false;
  if (expense.expenseType === 'advance') return false;
  return resolveTripExpenseTreatment(expense.paidBy, expense.paymentMethod) !== 'none';
}

export interface TripExpensePaymentIssue {
  field: 'paidBy' | 'paymentMethod' | 'dueDate';
  message: string;
}

/**
 * Valida a combinação informada. `paidBy` ausente (undefined) = campo não
 * enviado: o registro existente fica como está (compatível com o formulário
 * antigo e com despesas antigas sem "quem pagou").
 */
export function validateTripExpensePayment(input: {
  paidBy?: TripExpensePaidBy | null;
  paymentMethod?: TripExpensePaymentMethod | null;
  dueDate?: string | null;
}): TripExpensePaymentIssue[] {
  const issues: TripExpensePaymentIssue[] = [];
  const {paidBy, paymentMethod, dueDate} = input;

  if (paidBy === undefined || paidBy === null) {
    if (paymentMethod) {
      issues.push({field: 'paidBy', message: 'Informe quem pagou a despesa.'});
    }
    return issues;
  }

  const allowed = TRIP_EXPENSE_METHODS_BY_PAID_BY[paidBy];

  if (paidBy === 'third_party') {
    if (paymentMethod) {
      issues.push({
        field: 'paymentMethod',
        message: 'Despesa paga por terceiro não tem forma de pagamento da empresa.',
      });
    }
    return issues;
  }

  if (!paymentMethod) {
    issues.push({field: 'paymentMethod', message: 'Informe a forma de pagamento.'});
    return issues;
  }

  if (!allowed.includes(paymentMethod)) {
    issues.push({
      field: 'paymentMethod',
      message: 'Esta forma de pagamento não combina com quem pagou.',
    });
  }

  if (paymentMethod === 'supplier_credit' && !dueDate) {
    issues.push({field: 'dueDate', message: 'Informe o vencimento da compra a prazo.'});
  }

  return issues;
}
