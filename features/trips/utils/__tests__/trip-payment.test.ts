import {describe, expect, it} from 'vitest';

import {
  addDaysToIsoDate,
  buildTripPaymentFields,
  isLegacyFreightTrip,
  suggestTripDueDate,
  validateTripPayment,
} from '../trip-payment';

const base = {
  actualFreightValue: 8500,
  customerId: 'customer-1',
  paymentCondition: 'term' as const,
  paymentIssueDate: '2026-11-01',
  paymentDueDate: '2026-12-01',
};

describe('prazo do cliente', () => {
  it('soma dias atravessando o mês', () => {
    expect(addDaysToIsoDate('2026-11-20', 30)).toBe('2026-12-20');
  });

  it('sugere o vencimento pelo prazo do cliente', () => {
    expect(suggestTripDueDate('2026-11-01', 28)).toBe('2026-11-29');
  });

  it('sem prazo ou emissão não sugere nada', () => {
    expect(suggestTripDueDate('2026-11-01', null)).toBeNull();
    expect(suggestTripDueDate(null, 30)).toBeNull();
  });
});

describe('validateTripPayment', () => {
  it('aceita frete a prazo completo', () => {
    expect(validateTripPayment(base)).toEqual([]);
  });

  it('exige cliente e condição quando há frete', () => {
    const fields = validateTripPayment({
      ...base,
      customerId: null,
      paymentCondition: null,
    }).map((issue) => issue.field);
    expect(fields).toEqual(['customerId', 'paymentCondition']);
  });

  it('a prazo exige emissão e vencimento', () => {
    const fields = validateTripPayment({
      ...base,
      paymentIssueDate: null,
      paymentDueDate: null,
    }).map((issue) => issue.field);
    expect(fields).toEqual(['paymentDueDate', 'paymentIssueDate']);
  });

  it('antecipado exige só a data prevista', () => {
    expect(
      validateTripPayment({...base, paymentCondition: 'advance', paymentIssueDate: null}),
    ).toEqual([]);
  });

  it('viagem sem frete não exige condição', () => {
    expect(
      validateTripPayment({
        ...base,
        actualFreightValue: 0,
        paymentCondition: null,
        customerId: null,
      }),
    ).toEqual([]);
  });
});

describe('buildTripPaymentFields', () => {
  it('sem frete limpa a cobrança', () => {
    expect(buildTripPaymentFields({...base, actualFreightValue: null})).toEqual({
      payment_condition: null,
      payment_issue_date: null,
      payment_due_date: null,
    });
  });

  it('mantém os campos informados', () => {
    expect(buildTripPaymentFields(base)).toEqual({
      payment_condition: 'term',
      payment_issue_date: '2026-11-01',
      payment_due_date: '2026-12-01',
    });
  });
});

describe('isLegacyFreightTrip', () => {
  it('viagem antiga com frete fica fora da cobrança', () => {
    expect(
      isLegacyFreightTrip({
        paymentCondition: null,
        contractedFreightValue: null,
        actualFreightValue: 500,
      }),
    ).toBe(true);
  });

  it('viagem sem frete ou com condição não é antiga', () => {
    expect(
      isLegacyFreightTrip({
        paymentCondition: null,
        contractedFreightValue: null,
        actualFreightValue: null,
      }),
    ).toBe(false);
    expect(
      isLegacyFreightTrip({
        paymentCondition: 'term',
        contractedFreightValue: null,
        actualFreightValue: 500,
      }),
    ).toBe(false);
  });
});
