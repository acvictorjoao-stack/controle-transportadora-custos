import {describe, expect, it} from 'vitest';

import {
  buildInstallmentSchedule,
  formatInstallmentLabel,
  splitAmountIntoInstallments,
} from '../installment-schedule';

describe('splitAmountIntoInstallments', () => {
  it('splits evenly when divisible', () => {
    expect(splitAmountIntoInstallments(3000, 3)).toEqual([1000, 1000, 1000]);
  });

  it('puts remainder cents on the last parcel', () => {
    expect(splitAmountIntoInstallments(1000, 3)).toEqual([333.33, 333.33, 333.34]);
  });

  it('returns single amount for one installment', () => {
    expect(splitAmountIntoInstallments(1500.5, 1)).toEqual([1500.5]);
  });
});

describe('buildInstallmentSchedule', () => {
  it('applies interval days between consecutive due dates', () => {
    const schedule = buildInstallmentSchedule({
      totalAmount: 3000,
      installmentCount: 3,
      firstDueDate: '2025-08-25',
      intervalDays: 30,
    });

    expect(schedule).toEqual([
      {number: 1, amount: 1000, dueDate: '2025-08-25'},
      {number: 2, amount: 1000, dueDate: '2025-09-24'},
      {number: 3, amount: 1000, dueDate: '2025-10-24'},
    ]);
  });

  it('defaults interval to 30 days', () => {
    const schedule = buildInstallmentSchedule({
      totalAmount: 100,
      installmentCount: 2,
      firstDueDate: '2026-01-01',
    });
    expect(schedule[1]?.dueDate).toBe('2026-01-31');
  });
});

describe('formatInstallmentLabel', () => {
  it('formats parcel label', () => {
    expect(formatInstallmentLabel(2, 5)).toBe('Parcela 2/5');
  });
});
