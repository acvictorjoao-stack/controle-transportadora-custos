import type {Trip, TripPaymentCondition} from '../types';
import {getTripFreightValue} from './trip-lifecycle';

export interface TripPaymentInput {
  actualFreightValue: number | null;
  customerId: string | null;
  paymentCondition: TripPaymentCondition | null;
  paymentIssueDate: string | null;
  paymentDueDate: string | null;
}

export interface TripPaymentIssue {
  field: 'customerId' | 'paymentCondition' | 'paymentIssueDate' | 'paymentDueDate';
  message: string;
}

/** Soma dias corridos a uma data ISO (yyyy-mm-dd), sem depender do fuso local. */
export function addDaysToIsoDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Vencimento sugerido pelo prazo do cliente; o usuário pode alterar na viagem. */
export function suggestTripDueDate(
  issueDate: string | null,
  paymentTermDays: number | null | undefined,
): string | null {
  if (!issueDate || paymentTermDays == null) return null;
  return addDaysToIsoDate(issueDate, paymentTermDays);
}

/** Viagem com frete cadastrada antes da cobrança automática: fica como está. */
export function isLegacyFreightTrip(
  trip: Pick<Trip, 'paymentCondition' | 'contractedFreightValue' | 'actualFreightValue'>,
): boolean {
  return trip.paymentCondition == null && getTripFreightValue(trip) > 0;
}

export function validateTripPayment(input: TripPaymentInput): TripPaymentIssue[] {
  const issues: TripPaymentIssue[] = [];
  const hasFreight = (input.actualFreightValue ?? 0) > 0;

  if (!hasFreight) return issues;

  if (!input.customerId) {
    issues.push({field: 'customerId', message: 'Informe o cliente do frete.'});
  }

  if (!input.paymentCondition) {
    issues.push({field: 'paymentCondition', message: 'Selecione a condição de pagamento.'});
    return issues;
  }

  if (!input.paymentDueDate) {
    issues.push({
      field: 'paymentDueDate',
      message:
        input.paymentCondition === 'advance'
          ? 'Informe a data prevista do pagamento.'
          : 'Informe a data de vencimento.',
    });
  }

  if (input.paymentCondition === 'term' && !input.paymentIssueDate) {
    issues.push({field: 'paymentIssueDate', message: 'Informe a data de emissão.'});
  }

  return issues;
}

/** Sem frete não há cobrança: os campos de pagamento vão vazios para o banco. */
export function buildTripPaymentFields(input: TripPaymentInput): Record<string, unknown> {
  const hasFreight = (input.actualFreightValue ?? 0) > 0;
  const condition = hasFreight ? input.paymentCondition : null;

  return {
    payment_condition: condition,
    payment_issue_date: condition ? input.paymentIssueDate : null,
    payment_due_date: condition ? input.paymentDueDate : null,
  };
}
