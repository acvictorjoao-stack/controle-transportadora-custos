/**
 * Estado e regras do formulário de despesa da viagem (Fase 1, Etapa 2.3).
 * Funções puras: a tela só renderiza o que estas regras decidem.
 */
import {TRIP_EXPENSE_TYPES} from '../constants/enums';
import type {
  TripExpense,
  TripExpensePaidBy,
  TripExpensePaymentMethod,
  TripExpenseType,
} from '../types/trip';
import {
  TRIP_EXPENSE_METHODS_BY_PAID_BY,
  validateTripExpensePayment,
  type TripExpensePaymentIssue,
} from './trip-expense-payment';

/** '' = não informado (só aparece ao editar despesa antiga sem "quem pagou"). */
export interface TripExpensePaymentFormState {
  paidBy: TripExpensePaidBy | '';
  paymentMethod: TripExpensePaymentMethod | '';
  dueDate: string;
}

export const EMPTY_PAYMENT_FORM: TripExpensePaymentFormState = {
  paidBy: '',
  paymentMethod: '',
  dueDate: '',
};

/** Estado inicial a partir da despesa (edição) ou vazio (nova). Nada é pré-preenchido. */
export function paymentFormFromExpense(
  expense: Pick<TripExpense, 'paidBy' | 'paymentMethod' | 'dueDate'> | null,
): TripExpensePaymentFormState {
  if (!expense) return {...EMPTY_PAYMENT_FORM};
  return {
    paidBy: expense.paidBy ?? '',
    paymentMethod: expense.paymentMethod ?? '',
    dueDate: expense.dueDate?.slice(0, 10) ?? '',
  };
}

/** Formas de pagamento compatíveis com quem pagou (terceiro: nenhuma). */
export function paymentMethodOptions(paidBy: TripExpensePaidBy | ''): readonly TripExpensePaymentMethod[] {
  if (!paidBy) return [];
  return TRIP_EXPENSE_METHODS_BY_PAID_BY[paidBy];
}

export function showsPaymentMethod(state: TripExpensePaymentFormState): boolean {
  return state.paidBy !== '' && state.paidBy !== 'third_party';
}

export function showsDueDate(state: TripExpensePaymentFormState): boolean {
  return state.paymentMethod === 'supplier_credit';
}

/**
 * Troca de "quem pagou": a forma incompatível é limpa. Se só existe uma forma
 * possível (agregado → dinheiro próprio), ela é a única escolha válida e vem
 * marcada. Vencimento só sobrevive na compra a prazo.
 */
export function changePaidBy(
  state: TripExpensePaymentFormState,
  paidBy: TripExpensePaidBy | '',
): TripExpensePaymentFormState {
  const options = paymentMethodOptions(paidBy);
  let paymentMethod: TripExpensePaymentMethod | '' =
    state.paymentMethod && options.includes(state.paymentMethod) ? state.paymentMethod : '';
  if (!paymentMethod && options.length === 1) paymentMethod = options[0];
  return {
    paidBy,
    paymentMethod,
    dueDate: paymentMethod === 'supplier_credit' ? state.dueDate : '',
  };
}

export function changePaymentMethod(
  state: TripExpensePaymentFormState,
  paymentMethod: TripExpensePaymentMethod | '',
): TripExpensePaymentFormState {
  return {
    ...state,
    paymentMethod,
    dueDate: paymentMethod === 'supplier_credit' ? state.dueDate : '',
  };
}

/**
 * "Não informado" só é aceito ao editar despesa que já estava assim (despesa
 * antiga). Despesa nova exige quem pagou; despesa integrada não pode perder.
 */
export function canLeavePaidByEmpty(original: Pick<TripExpense, 'paidBy'> | null): boolean {
  return original !== null && !original.paidBy;
}

export function validatePaymentForm(
  state: TripExpensePaymentFormState,
  original: Pick<TripExpense, 'paidBy'> | null,
): TripExpensePaymentIssue[] {
  if (!state.paidBy) {
    return canLeavePaidByEmpty(original)
      ? []
      : [{field: 'paidBy', message: 'Informe quem pagou a despesa.'}];
  }
  return validateTripExpensePayment({
    paidBy: state.paidBy,
    paymentMethod: state.paymentMethod || null,
    dueDate: state.dueDate || null,
  });
}

/**
 * Campos de pagamento enviados à ação. "Não informado" não envia nada: a
 * despesa antiga continua como está (D10), sem apagar nem inventar valores.
 */
export function paymentPayload(state: TripExpensePaymentFormState): {
  paidBy?: TripExpensePaidBy;
  paymentMethod?: TripExpensePaymentMethod | null;
  dueDate?: string | null;
} {
  if (!state.paidBy) return {};
  if (state.paidBy === 'third_party') {
    return {paidBy: 'third_party', paymentMethod: null, dueDate: null};
  }
  return {
    paidBy: state.paidBy,
    paymentMethod: state.paymentMethod || null,
    dueDate: state.paymentMethod === 'supplier_credit' ? state.dueDate || null : null,
  };
}

/** Tipos oferecidos: "adiantamento" só aparece ao editar uma despesa antiga desse tipo (D14). */
export function expenseTypeOptions(currentType: TripExpenseType | null): readonly TripExpenseType[] {
  if (currentType === 'advance') return TRIP_EXPENSE_TYPES;
  return TRIP_EXPENSE_TYPES.filter((type) => type !== 'advance');
}

/** Explica, antes de salvar, como a despesa vai para o financeiro (regras da migration 111). */
export function describePaymentEffect(
  state: TripExpensePaymentFormState,
  expenseType: TripExpenseType,
): string | null {
  if (expenseType === 'advance') {
    return 'Adiantamento não é custo da viagem: não entra no resultado nem na DRE.';
  }
  if (!state.paidBy) {
    return 'Sem "quem pagou", a despesa fica fora do financeiro, do resultado e da DRE.';
  }
  if (state.paidBy === 'third_party') {
    return 'Paga por terceiro: não gera custo nem lançamento para a empresa.';
  }
  if (!state.paymentMethod) return null;
  if (state.paymentMethod === 'supplier_credit') {
    return 'Vai para Contas a Pagar e sai do caixa no pagamento, até o vencimento.';
  }
  if (state.paymentMethod === 'driver_advance') {
    return 'Custo da viagem, sem nova saída de caixa: o dinheiro já saiu no adiantamento.';
  }
  if (state.paidBy === 'driver') {
    return 'Vai para Contas a Pagar como reembolso ao motorista. O reembolso baixa este mesmo lançamento.';
  }
  if (state.paidBy === 'aggregate') {
    return 'Vai para Contas a Pagar como reembolso ao agregado. O reembolso baixa este mesmo lançamento.';
  }
  return 'Lançada como paga pela empresa na data da despesa.';
}
