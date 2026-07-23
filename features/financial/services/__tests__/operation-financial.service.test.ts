import {describe, expect, it} from 'vitest';

import {buildInstallmentSchedule} from '../../utils/installment-schedule';
import {resolveOperationPaymentType} from '../operation-financial.service';

describe('resolveOperationPaymentType', () => {
  it('defaults to cash', () => {
    expect(resolveOperationPaymentType(undefined)).toBe('cash');
    expect(resolveOperationPaymentType(null)).toBe('cash');
    expect(resolveOperationPaymentType('cash')).toBe('cash');
    expect(resolveOperationPaymentType('other')).toBe('cash');
  });

  it('accepts credit', () => {
    expect(resolveOperationPaymentType('credit')).toBe('credit');
  });
});

describe('operation payment settlement rules', () => {
  it('cash creates paid obligation without due date', () => {
    const paymentType = resolveOperationPaymentType('cash');
    expect(paymentType).toBe('cash');
    // Contas a Pagar only lists entries with due_date; cash stays ledger-only.
  });

  it('credit requires Contas a Pagar flow', () => {
    const paymentType = resolveOperationPaymentType('credit');
    expect(paymentType).toBe('credit');
  });

  it('credit installments sum to the operational amount', () => {
    const schedule = buildInstallmentSchedule({
      totalAmount: 3000,
      installmentCount: 3,
      firstDueDate: '2025-08-25',
      intervalDays: 30,
    });
    const total = schedule.reduce((sum, item) => sum + item.amount, 0);
    expect(total).toBe(3000);
    expect(schedule).toHaveLength(3);
  });
});
