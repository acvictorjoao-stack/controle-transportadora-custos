import {competenceEndDate, formatCompetenceBr, normalizeCompetence} from '../utils/competence';
import type {PayrollExpenseStatus, PayrollExpenseType, PayrollPersonKind} from '../types';
import {PAYROLL_EXPENSE_TYPE_LABELS} from '../types';

export interface PayrollPersonColumns {
  employee_id: string | null;
  driver_id: string | null;
}

/**
 * Mantém o XOR de payroll_expenses: motorista vive em drivers, colaborador em
 * employees, e exatamente uma das colunas é preenchida (nunca as duas).
 */
export function resolvePayrollPersonColumns(
  personKind: PayrollPersonKind,
  personId: string,
): PayrollPersonColumns {
  return personKind === 'driver'
    ? {employee_id: null, driver_id: personId}
    : {employee_id: personId, driver_id: null};
}

export interface PayrollFinancialPlanInput {
  expenseStatus: PayrollExpenseStatus;
  competence: string;
  dueDate: string | null;
  paidAt: string | null;
}

export type PayrollFinancialPlan =
  | {action: 'remove'}
  | {
      action: 'upsert';
      paymentType: 'cash' | 'credit';
      entryDate: string;
      dueDate: string | null;
      paidAt: string | null;
    };

/**
 * Traduz o status da despesa de folha para o contrato do motor financeiro:
 * pago → lançamento quitado (fora de Contas a Pagar);
 * em aberto → obrigação com vencimento (aparece em Contas a Pagar);
 * cancelado → nenhum lançamento ativo (estorno do existente).
 */
export function resolvePayrollFinancialPlan(
  input: PayrollFinancialPlanInput,
): PayrollFinancialPlan {
  if (input.expenseStatus === 'cancelled') {
    return {action: 'remove'};
  }

  const entryDate = competenceEndDate(input.competence);

  if (input.expenseStatus === 'paid') {
    const paidDate = (input.paidAt ?? entryDate).slice(0, 10);
    return {
      action: 'upsert',
      paymentType: 'cash',
      entryDate,
      dueDate: null,
      paidAt: `${paidDate}T12:00:00.000Z`,
    };
  }

  return {
    action: 'upsert',
    paymentType: 'credit',
    entryDate,
    dueDate: (input.dueDate ?? entryDate).slice(0, 10),
    paidAt: null,
  };
}

export interface PayrollDescriptionInput {
  personName: string | null;
  positionName: string | null;
  expenseType: PayrollExpenseType;
  competence: string;
}

export function buildPayrollDescription(input: PayrollDescriptionInput): string {
  const typeLabel = PAYROLL_EXPENSE_TYPE_LABELS[input.expenseType];
  const person = input.personName?.trim();
  const position = input.positionName?.trim();
  const who = position && person ? `${person} (${position})` : (person ?? 'Colaborador');

  return `Folha — ${who} · ${typeLabel} ${formatCompetenceBr(input.competence)}`;
}

export interface PayrollDuplicateRecord {
  id: string;
  personId: string;
  competence: string;
  expenseType: PayrollExpenseType;
}

export interface PayrollDuplicateProbe {
  id?: string | null;
  personId: string;
  competence: string;
  expenseType: PayrollExpenseType;
}

/**
 * Duplicidade acidental = mesma pessoa, mesma competência e mesmo tipo.
 * A validação é suave: o chamador decide se pede confirmação ao usuário.
 */
export function findPayrollDuplicate(
  existing: PayrollDuplicateRecord[],
  probe: PayrollDuplicateProbe,
): PayrollDuplicateRecord | null {
  const competence = normalizeCompetence(probe.competence);
  if (!competence) return null;

  return (
    existing.find(
      (record) =>
        record.id !== probe.id &&
        record.personId === probe.personId &&
        record.expenseType === probe.expenseType &&
        normalizeCompetence(record.competence) === competence,
    ) ?? null
  );
}

export function buildPayrollDuplicateMessage(
  probe: Pick<PayrollDuplicateProbe, 'competence' | 'expenseType'>,
): string {
  const typeLabel = PAYROLL_EXPENSE_TYPE_LABELS[probe.expenseType];
  return `Já existe uma despesa de ${typeLabel} para este funcionário na competência ${formatCompetenceBr(probe.competence)}. Confirme para lançar novamente.`;
}
